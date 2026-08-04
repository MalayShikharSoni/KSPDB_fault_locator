import express from 'express';
import { z } from 'zod';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const app = express();
app.use(express.json());

// Initialize Redis connection
export const connection = new IORedis({
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

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
