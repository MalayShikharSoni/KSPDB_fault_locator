import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelemetrySimulator } from './simulator';

describe('Fault Simulator', () => {
  let simulator: TelemetrySimulator;

  beforeEach(() => {
    // Reset simulator and mock random to always return 0.5 by default (so 30% drop rate doesn't trigger)
    simulator = new TelemetrySimulator(() => 0.5);
    
    // Mock getDownstreamPoles to avoid real DB queries
    vi.spyOn(simulator as any, 'getDownstreamPoles').mockImplementation(async () => {
      // Return 100 fake poles
      const fakePoles = [];
      for (let i = 0; i < 100; i++) {
        fakePoles.push({
          id: `P-${i}`,
          deviceId: `DEV-${i}`,
          fw: '1.4.2'
        });
      }
      return fakePoles;
    });
  });

  it('1. Span Fault injects telemetry and correctly applies the 30% drop rate', async () => {
    // We will override rng to return 0.1 for the first 30 calls, and 0.9 for the rest.
    let callCount = 0;
    const customRng = () => {
      callCount++;
      return callCount <= 30 ? 0.1 : 0.9;
    };
    
    const simWithDrop = new TelemetrySimulator(customRng);
    vi.spyOn(simWithDrop as any, 'getDownstreamPoles').mockImplementation(async () => {
      const fakePoles = [];
      for (let i = 0; i < 100; i++) {
        fakePoles.push({ id: `P-${i}`, deviceId: `DEV-${i}`, fw: '1.4.2' });
      }
      return fakePoles;
    });

    await simWithDrop.injectSpanFault('D-0001', 'P-0010');
    
    const events = simWithDrop.getEvents();
    
    // 100 poles. 30 drops. Should have 70 events.
    expect(events).toHaveLength(70);
    
    // Check payload structure
    expect(events[0].event).toBe('power_lost');
    expect(events[0].energized).toBe(false);
    expect(events[0].seq).toBe(1); // First time event, seq = 1
  });

  it('2. Firmware 1.2.x NEVER sends power_lost', async () => {
    const simFw = new TelemetrySimulator(() => 0.9); // No capacitor drops
    vi.spyOn(simFw as any, 'getDownstreamPoles').mockImplementation(async () => {
      return [
        { id: 'P-1', deviceId: 'DEV-1', fw: '1.4.2' },
        { id: 'P-2', deviceId: 'DEV-2', fw: '1.2.x' }, // Should drop
        { id: 'P-3', deviceId: 'DEV-3', fw: '1.2.x' }, // Should drop
        { id: 'P-4', deviceId: 'DEV-4', fw: '1.4.2' },
      ];
    });

    await simFw.injectSpanFault('D-0001', 'P-1');
    const events = simFw.getEvents();
    
    expect(events).toHaveLength(2); // Only DEV-1 and DEV-4
    expect(events.find(e => e.device_id === 'DEV-2')).toBeUndefined();
    expect(events.find(e => e.device_id === 'DEV-3')).toBeUndefined();
  });

  it('3. Restoration resets sequence number and emits boot + restored', async () => {
    const faultId = await simulator.injectSpanFault('D-0001', 'P-0010');
    
    let events = simulator.getEvents();
    expect(events[0].seq).toBe(1); // power_lost is seq 1
    
    simulator.clearEvents();

    await simulator.repairFault(faultId);
    events = simulator.getEvents();

    // 100 poles * 2 events each (boot, power_restored) = 200 events
    expect(events).toHaveLength(200);

    const dev0Events = events.filter(e => e.device_id === 'DEV-0');
    expect(dev0Events).toHaveLength(2);
    
    expect(dev0Events[0].event).toBe('boot');
    expect(dev0Events[0].seq).toBe(0); // Reset to 0
    expect(dev0Events[0].energized).toBe(true);
    
    expect(dev0Events[1].event).toBe('power_restored');
    expect(dev0Events[1].seq).toBe(1);
    expect(dev0Events[1].energized).toBe(true);
  });

  it('4. Noise Injection creates duplicate burst with same seq', async () => {
    // Generate initial event so seq is > 3
    for (let i=0; i<4; i++) {
        // We use a private method to simulate prior normal events
        await (simulator as any).emitTelemetry('DEV-BURST', 'power_lost', false);
    }
    simulator.clearEvents();

    await simulator.injectDuplicateBurst('DEV-BURST');
    const events = simulator.getEvents();
    
    // Should have 5 duplicates + 1 old out-of-order = 6 events
    expect(events).toHaveLength(6);
    
    const duplicates = events.filter(e => e.seq === 5);
    expect(duplicates).toHaveLength(5);
    
    const oldEvent = events.find(e => e.seq === 3);
    expect(oldEvent).toBeDefined();
    expect(oldEvent!.event).toBe('power_lost');
  });
});
