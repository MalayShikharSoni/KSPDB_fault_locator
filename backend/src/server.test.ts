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

// Mock Simulator to prevent real simulator execution in HTTP tests
vi.mock('./services/simulator', () => {
  return {
    TelemetrySimulator: class {
      injectSpanFault = vi.fn().mockResolvedValue('FAULT-SPAN-123');
      injectDtFault = vi.fn().mockResolvedValue('FAULT-DT-123');
      injectFeederFault = vi.fn().mockResolvedValue('FAULT-FEEDER-123');
      repairFault = vi.fn().mockResolvedValue(undefined);
    }
  };
});

describe('Express Server Routes', () => {
  afterAll(() => {
    connection.disconnect();
  });

  describe('POST /api/telemetry/ingest', () => {
    it('should return 400 for invalid payloads', async () => {
      const res = await request(app)
        .post('/api/telemetry/ingest')
        .send({
          device_id: 'DEV-1',
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

  describe('GET /api/grid/state', () => {
    it('should return successfully with structured data', async () => {
      const res = await request(app).get('/api/grid/state');
      expect(res.status).toBe(200);
      expect(res.body.dts).toBeDefined();
      expect(res.body.poles).toBeDefined();
      expect(res.body.edges).toBeDefined();
    });
  });

  describe('GET /api/incidents/active', () => {
    it('should return empty incidents if none exist', async () => {
      // Clear redis first
      await connection.del('active_incidents');
      const res = await request(app).get('/api/incidents/active');
      expect(res.status).toBe(200);
      expect(res.body.incidents).toEqual([]);
      expect(res.body.hardwareIssues).toEqual([]);
    });

    it('should return cached incidents from Redis', async () => {
      const fakeIncidents = { incidents: [{ type: 'span_fault' }], hardwareIssues: [] };
      await connection.set('active_incidents', JSON.stringify(fakeIncidents));
      
      const res = await request(app).get('/api/incidents/active');
      expect(res.status).toBe(200);
      expect(res.body.incidents.length).toBe(1);
      expect(res.body.incidents[0].type).toBe('span_fault');
    });
  });

  describe('POST /api/simulate/fault', () => {
    it('should return 400 if dtId is missing for span fault', async () => {
      const res = await request(app)
        .post('/api/simulate/fault')
        .send({ type: 'span', targetId: 'P-123' });
      expect(res.status).toBe(400);
    });

    it('should return 200 and faultId for valid span fault', async () => {
      const res = await request(app)
        .post('/api/simulate/fault')
        .send({ type: 'span', targetId: 'P-123', dtId: 'DT-1' });
      expect(res.status).toBe(200);
      expect(res.body.faultId).toBe('FAULT-SPAN-123');
    });
  });

  describe('POST /api/simulate/repair', () => {
    it('should return 200 and status Repaired', async () => {
      const res = await request(app)
        .post('/api/simulate/repair')
        .send({ faultId: 'FAULT-SPAN-123' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Repaired');
    });
  });
});
