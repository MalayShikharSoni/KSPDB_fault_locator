import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { TelemetryPayload } from '../services/simulator';
import { localizeFaults, PoleState } from '../services/localization';
import { getTopology } from '../services/topology';
import { db } from '../db';
import { poles } from '../db/schema';
import { eq } from 'drizzle-orm';

export const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    });

export const telemetryWorker = new Worker('telemetry-ingest', async (job: Job) => {
  const payload = job.data as TelemetryPayload;
  const { device_id, seq, event, energized } = payload;
  
  const seqKey = `device:seq:${device_id}`;
  const stateKey = `pole:states`;

  // 1. Deduplication Logic
  if (event === 'boot') {
    // Reset sequence number
    await connection.set(seqKey, 0);
  } else {
    const currentSeqStr = await connection.get(seqKey);
    const currentSeq = currentSeqStr ? parseInt(currentSeqStr, 10) : -1;

    if (seq <= currentSeq) {
      // Discard duplicate or out-of-order message
      return { status: 'discarded', reason: 'out-of-order or duplicate' };
    }

    // Valid message, update highest seen sequence
    await connection.set(seqKey, seq);
  }

  // 2. Real-time State Update
  const newState: PoleState = energized ? 'live' : 'dark';
  await connection.hset(stateKey, device_id, newState);

  // 3. Trigger Localization Algorithm
  // TODO: Debouncing / Batching - Executing this on every single message is heavy.
  // In a production environment with thousands of messages/sec, we should debounce 
  // or batch this call per DT instead of running per message.
  
  // For MVP: Fetch all poles to build topology and current state map
  const allPoles = await db.select().from(poles);
  
  // Create a map from device_id to pole_id for state mapping
  const poleIdToState: Record<string, PoleState> = {};
  
  // Fetch all current states from Redis
  const allStatesStr = await connection.hgetall(stateKey);
  
  // Group poles by DT to localize faults per DT
  const dts = new Set(allPoles.map(p => p.dtId));
  
  const aggregatedResult = { incidents: [] as any[], hardwareIssues: [] as any[] };

  for (const dtId of dts) {
    const dtPoles = allPoles.filter(p => p.dtId === dtId);
    
    // Map Redis device states to pole states
    for (const p of dtPoles) {
      if (p.deviceId && allStatesStr[p.deviceId]) {
        poleIdToState[p.id] = allStatesStr[p.deviceId] as PoleState;
      } else {
        poleIdToState[p.id] = 'unknown';
      }
    }

    const topology = getTopology(dtId, { lat: 0, lon: 0 }, dtPoles as any);
    
    const result = localizeFaults(topology, poleIdToState);
    
    aggregatedResult.incidents.push(...result.incidents);
    aggregatedResult.hardwareIssues.push(...result.hardwareIssues);
  }

  // Cache the aggregated result in Redis for the frontend
  await connection.set('active_incidents', JSON.stringify(aggregatedResult));
  
  // Notify SSE clients ONCE
  await connection.publish('state_updates', 'updated');

  return { status: 'processed', device_id, seq };

}, { connection });

telemetryWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error ${err.message}`);
});

telemetryWorker.on('error', err => {
  console.error(`Worker error: ${err.message}`);
});
