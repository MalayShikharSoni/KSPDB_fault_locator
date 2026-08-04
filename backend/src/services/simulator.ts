import { db } from '../db';
import { poles, dts, feeders } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getTopology, TopologyEdge } from './topology';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const telemetryQueue = new Queue('telemetry-ingest', { connection });

export type TelemetryPayload = {
  device_id: string;
  seq: number;
  timestamp: string;
  event: 'boot' | 'power_lost' | 'power_restored';
  energized: boolean;
  fw?: string;
};

type ActiveFault = {
  id: string;
  type: 'span' | 'dt' | 'feeder';
  targetId: string;
  affectedPoles: any[]; // The raw db poles affected
};

export class TelemetrySimulator {
  private deviceSeq = new Map<string, number>();
  private activeFaults = new Map<string, ActiveFault>();
  private generatedEvents: TelemetryPayload[] = [];
  
  // For tests/mocking, allow passing an RNG
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  // Gets and increments sequence number
  private getNextSeq(deviceId: string): number {
    const current = this.deviceSeq.get(deviceId) || 0;
    const next = current + 1;
    this.deviceSeq.set(deviceId, next);
    return next;
  }

  // Resets sequence number (used on boot)
  private resetSeq(deviceId: string): number {
    this.deviceSeq.set(deviceId, 0);
    return 0;
  }

  private async emitTelemetry(deviceId: string, event: 'boot' | 'power_lost' | 'power_restored', energized: boolean, fw?: string) {
    const seq = event === 'boot' ? this.resetSeq(deviceId) : this.getNextSeq(deviceId);
    
    const payload: TelemetryPayload = {
      device_id: deviceId,
      seq,
      timestamp: new Date().toISOString(),
      event,
      energized,
      ...(fw ? { fw } : {})
    };

    this.generatedEvents.push(payload);
    
    // Push to the queue natively
    await telemetryQueue.add('process-telemetry', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 1000,
    });
  }

  public getEvents() {
    return this.generatedEvents;
  }

  public clearEvents() {
    this.generatedEvents = [];
  }

  /**
   * Helper to fetch topology and get downstream poles
   */
  private async getDownstreamPoles(dtId: string, boundaryChildPoleId?: string) {
    const allPoles = await db.select().from(poles).where(eq(poles.dtId, dtId));
    
    if (!boundaryChildPoleId) {
      // Return all poles for this DT
      return allPoles;
    }

    const topology = getTopology(dtId, { lat: 0, lon: 0 }, allPoles as any);
    
    // Find downstream by walking children map
    const childrenMap = new Map<string, string[]>();
    for (const edge of topology) {
      if (!childrenMap.has(edge.parentPoleId)) {
        childrenMap.set(edge.parentPoleId, []);
      }
      childrenMap.get(edge.parentPoleId)!.push(edge.childPoleId);
    }

    const affectedIds = new Set<string>();
    
    function collect(nodeId: string) {
      affectedIds.add(nodeId);
      const children = childrenMap.get(nodeId) || [];
      for (const child of children) {
        collect(child);
      }
    }
    
    collect(boundaryChildPoleId);
    
    return allPoles.filter(p => affectedIds.has(p.id));
  }

  /**
   * Process a list of affected poles:
   * Drops 30% for capacitor failure
   * Drops 100% of fw 1.2.x
   */
  private async processPowerLost(affectedPoles: any[]) {
    for (const pole of affectedPoles) {
      if (!pole.deviceId) continue;

      // Constraint 2: fw 1.2.x NEVER sends power_lost
      if (pole.fw === '1.2.x') {
        continue;
      }

      // Constraint 1: 30% Capacitor failure drop rate
      if (this.rng() < 0.3) {
        continue; // message lost
      }

      await this.emitTelemetry(pole.deviceId, 'power_lost', false, pole.fw);
    }
  }

  public async injectSpanFault(dtId: string, boundaryChildPoleId: string) {
    const affected = await this.getDownstreamPoles(dtId, boundaryChildPoleId);
    const faultId = `FAULT-SPAN-${boundaryChildPoleId}-${Date.now()}`;
    
    this.activeFaults.set(faultId, {
      id: faultId,
      type: 'span',
      targetId: boundaryChildPoleId,
      affectedPoles: affected
    });

    await this.processPowerLost(affected);
    return faultId;
  }

  public async injectDtFault(dtId: string) {
    const affected = await this.getDownstreamPoles(dtId);
    const faultId = `FAULT-DT-${dtId}-${Date.now()}`;
    
    this.activeFaults.set(faultId, {
      id: faultId,
      type: 'dt',
      targetId: dtId,
      affectedPoles: affected
    });

    await this.processPowerLost(affected);
    return faultId;
  }

  public async injectFeederFault(feederId: string) {
    // A feeder fault affects ALL DTs under it
    const affectedDTs = await db.select().from(dts).where(eq(dts.feederId, feederId));
    
    let allAffectedPoles: any[] = [];
    for (const dt of affectedDTs) {
      const polesForDt = await this.getDownstreamPoles(dt.id);
      allAffectedPoles.push(...polesForDt);
    }

    const faultId = `FAULT-FEEDER-${feederId}-${Date.now()}`;
    
    this.activeFaults.set(faultId, {
      id: faultId,
      type: 'feeder',
      targetId: feederId,
      affectedPoles: allAffectedPoles
    });

    await this.processPowerLost(allAffectedPoles);
    return faultId;
  }

  // --- Noise Injection ---

  public injectDeadSensor(poleId: string, deviceId: string) {
    // Hardware issue: dies silently. No message emitted.
    // In a real system, the ping/heartbeat would just timeout.
    // For simulator, we just do nothing, effectively it's offline.
    // If we want to simulate a broken sensor explicit message? No, spec says "dies silently".
    // Or we could emit a payload if we had a "heartbeat_timeout" event, but that's server-side.
    // Let's just track it or return.
    return `Injected dead sensor for ${deviceId}`;
  }

  public injectScheduledOutage(scope: 'feeder' | 'dt', targetId: string) {
    // Mocking the API feed format.
    return {
      type: 'SCHEDULED_OUTAGE',
      scope,
      targetId,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
    };
  }

  public async injectDuplicateBurst(deviceId: string) {
    const seq = this.getNextSeq(deviceId); // The actual sequence number
    const fw = '1.4.2';
    
    // Generate a burst of the same exact message
    for (let i = 0; i < 5; i++) {
      const payload: TelemetryPayload = {
        device_id: deviceId,
        seq, // Exact same seq
        timestamp: new Date().toISOString(),
        event: 'power_lost',
        energized: false,
        fw
      };
      this.generatedEvents.push(payload);
      await telemetryQueue.add('process-telemetry', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
    }

    // Generate an older message (out of order)
    if (seq > 3) {
      const oldPayload: TelemetryPayload = {
        device_id: deviceId,
        seq: seq - 2, // Older seq
        timestamp: new Date(Date.now() - 5000).toISOString(),
        event: 'power_lost',
        energized: false,
        fw
      };
      this.generatedEvents.push(oldPayload);
      await telemetryQueue.add('process-telemetry', oldPayload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
    }
  }

  // --- Restoration ---

  public async repairFault(faultId: string) {
    const fault = this.activeFaults.get(faultId);
    if (!fault) throw new Error(`Fault ${faultId} not found`);

    for (const pole of fault.affectedPoles) {
      if (!pole.deviceId) continue;

      // 1. Boot event
      await this.emitTelemetry(pole.deviceId, 'boot', true, pole.fw);
      
      // 2. Power restored event
      await this.emitTelemetry(pole.deviceId, 'power_restored', true, pole.fw);
    }

    this.activeFaults.delete(faultId);
  }
}
