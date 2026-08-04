import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import { app, telemetryQueue, connection } from './server';

// Mock BullMQ add method
vi.mock('bullmq', () => {
  return {
    Queue: class {
      add = vi.fn().mockResolvedValue(true);
      close = vi.fn();
    },
  };
});

describe('POST /api/telemetry/ingest', () => {
  afterAll(() => {
    connection.disconnect();
  });

  it('should return 400 for invalid payloads', async () => {
    const res = await request(app)
      .post('/api/telemetry/ingest')
      .send({
        device_id: 'DEV-1',
        // missing seq
        timestamp: 'invalid-date',
        event: 'invalid_event',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 202 and push to queue for valid payloads', async () => {
    const validPayload = {
      device_id: 'DEV-1',
      seq: 5,
      timestamp: new Date().toISOString(),
      event: 'power_lost',
      energized: false,
    };

    const res = await request(app)
      .post('/api/telemetry/ingest')
      .send(validPayload);

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('Accepted');
    expect(telemetryQueue.add).toHaveBeenCalledWith('process-telemetry', validPayload, expect.any(Object));
  });
});
