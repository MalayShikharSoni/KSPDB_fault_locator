import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { connection, telemetryWorker } from './telemetryWorker';
import { Job } from 'bullmq';

// Mock DB and Localization to avoid actual calculations during worker tests
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockResolvedValue([]),
  }
}));

vi.mock('../services/localization', () => ({
  localizeFaults: vi.fn().mockReturnValue({ incidents: [], hardwareIssues: [] }),
}));

vi.mock('../services/topology', () => ({
  getTopology: vi.fn().mockReturnValue([]),
}));

describe('Telemetry Worker Deduplication Logic', () => {
  beforeEach(async () => {
    // Clear Redis before each test
    await connection.flushall();
  });

  afterAll(() => {
    connection.disconnect();
  });

  const runWorker = async (data: any) => {
    // We can call the processor directly since telemetryWorker.processFn is private, 
    // but bullmq exports it via worker.processFn or we can just mock a Job and call it.
    // In bullmq v4+, the process function is passed in the constructor. We can extract it by casting to any
    const processFn = (telemetryWorker as any).processFn;
    return await processFn({ data } as Job);
  };

  it('should process a valid new message and update state', async () => {
    const res = await runWorker({
      device_id: 'DEV-1',
      seq: 1,
      event: 'power_lost',
      energized: false
    });

    expect(res.status).toBe('processed');
    
    const storedSeq = await connection.get('device:seq:DEV-1');
    expect(storedSeq).toBe('1');

    const state = await connection.hget('pole:states', 'DEV-1');
    expect(state).toBe('dark');
  });

  it('should discard exact duplicate sequence number', async () => {
    await connection.set('device:seq:DEV-1', 5);

    const res = await runWorker({
      device_id: 'DEV-1',
      seq: 5,
      event: 'power_lost',
      energized: false
    });

    expect(res.status).toBe('discarded');
    expect(res.reason).toBe('out-of-order or duplicate');
  });

  it('should discard out-of-order old sequence number', async () => {
    await connection.set('device:seq:DEV-1', 10);

    const res = await runWorker({
      device_id: 'DEV-1',
      seq: 8,
      event: 'power_lost',
      energized: false
    });

    expect(res.status).toBe('discarded');
    expect(res.reason).toBe('out-of-order or duplicate');
  });

  it('should reset sequence number on boot event', async () => {
    await connection.set('device:seq:DEV-1', 100);

    const res = await runWorker({
      device_id: 'DEV-1',
      seq: 101, // Seq on boot might be 0, but logic just says if event='boot' set to 0.
      event: 'boot',
      energized: true
    });

    expect(res.status).toBe('processed');
    
    const storedSeq = await connection.get('device:seq:DEV-1');
    expect(storedSeq).toBe('0'); // Reset to 0

    const state = await connection.hget('pole:states', 'DEV-1');
    expect(state).toBe('live');
  });
});
