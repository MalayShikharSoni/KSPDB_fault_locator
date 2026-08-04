import express from 'express';
import { z } from 'zod';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import cors from 'cors';
import { db } from './db';
import { poles, dts } from './db/schema';
import { getTopology } from './services/topology';
import { TelemetrySimulator } from './services/simulator';

export const app = express();
app.use(cors());
app.use(express.json());

const simulator = new TelemetrySimulator();

// Initialize Redis connection
export const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const subscriber = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

export const telemetryQueue = new Queue('telemetry-ingest', { connection });

const TelemetrySchema = z.object({
  device_id: z.string(),
  seq: z.number(),
  timestamp: z.string().datetime(),
  event: z.enum(['boot', 'power_lost', 'power_restored']),
  energized: z.boolean(),
  fw: z.string().optional(),
});

app.post('/api/telemetry/ingest', async (req, res) => {
  const result = TelemetrySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  await telemetryQueue.add('process-telemetry', result.data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  });

  return res.status(202).json({ status: 'Accepted' });
});

async function fetchGridStateData() {
  const allDts = await db.select().from(dts);
  const allPoles = await db.select().from(poles);
  const allStates = await connection.hgetall('pole:states');
  
  const mappedPoles = allPoles.map(p => {
    let state = 'unknown';
    if (p.deviceId && allStates[p.deviceId]) {
      state = allStates[p.deviceId];
    }
    return {
      id: p.id,
      dtId: p.dtId,
      lat: p.lat,
      lon: p.lon,
      deviceId: p.deviceId,
      state
    };
  });

  const edges = [];
  for (const dt of allDts) {
    const dtPoles = allPoles.filter(p => p.dtId === dt.id);
    const topology = getTopology(dt.id, { lat: dt.lat, lon: dt.lon }, dtPoles as any);
    edges.push(...topology);
  }

  return { dts: allDts, poles: mappedPoles, edges };
}

async function fetchIncidentsData() {
  const incidentsJson = await connection.get('active_incidents');
  if (incidentsJson) {
    return JSON.parse(incidentsJson);
  }
  return { incidents: [], hardwareIssues: [] };
}

const sseClients = new Set<express.Response>();

subscriber.subscribe('state_updates');
subscriber.on('message', async (channel, message) => {
  if (channel === 'state_updates') {
    if (sseClients.size === 0) return;
    const gridState = await fetchGridStateData();
    const incidents = await fetchIncidentsData();
    const data = JSON.stringify({ gridState, activeIncidents: incidents });
    for (const client of sseClients) {
      client.write(`data: ${data}\n\n`);
    }
  }
});

app.get('/api/stream/state', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  // Send initial data
  const gridState = await fetchGridStateData();
  const incidents = await fetchIncidentsData();
  res.write(`data: ${JSON.stringify({ gridState, activeIncidents: incidents })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

app.get('/api/grid/state', async (req, res) => {
  try {
    const data = await fetchGridStateData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/incidents/active', async (req, res) => {
  try {
    const data = await fetchIncidentsData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const SimulateFaultSchema = z.object({
  type: z.enum(['span', 'dt', 'feeder']),
  targetId: z.string(),
  dtId: z.string().optional()
});

app.post('/api/simulate/fault', async (req, res) => {
  try {
    const result = SimulateFaultSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const { type, targetId, dtId } = result.data;
    let faultId: string;

    if (type === 'span') {
      if (!dtId) return res.status(400).json({ error: 'dtId required for span fault' });
      faultId = await simulator.injectSpanFault(dtId, targetId);
    } else if (type === 'dt') {
      faultId = await simulator.injectDtFault(targetId);
    } else {
      faultId = await simulator.injectFeederFault(targetId);
    }

    res.json({ faultId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const SimulateRepairSchema = z.object({
  faultId: z.string()
});

app.post('/api/simulate/repair', async (req, res) => {
  try {
    const result = SimulateRepairSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    await simulator.repairFault(result.data.faultId);
    res.json({ status: 'Repaired' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
