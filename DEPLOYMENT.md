# Deployment Guide

This guide details how to deploy the KSPDB Fault Locator into a production environment utilizing a Hybrid architecture (Vercel for the static frontend, Render for the Node backend, and Neon for Serverless PostgreSQL).

## Prerequisites
- Node.js v20+
- Git
- Free tier accounts on: **Render.com**, **Neon.tech**, **Upstash.com**, and **Vercel.com**.

## Exact Deployment Commands

### 1. Database (Neon) & Redis (Upstash)
1. Create a free Postgres project on Neon.tech and copy the `DATABASE_URL`.
2. Create a free Redis database on Upstash.com and copy the `rediss://...` URL.

### 2. Backend Web Service (Render.com)
Connect your GitHub repo to Render and deploy the Express server:
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npx tsx src/server.ts`
- **Environment Variables**:
  - `DATABASE_URL`: [Your Neon URL]
  - `REDIS_HOST`: [Your Upstash URL]

*(Copy the provided `https://xyz.onrender.com` URL once live).*

### 3. Frontend Static Site (Vercel.com)
Connect your GitHub repo to Vercel and deploy the Vite frontend:
- **Root Directory**: `frontend`
- **Framework**: Vite
- **Environment Variables**:
  - `VITE_API_URL`: [Your Render Backend URL]

### 4. Seed the Production Database
Locally run the Drizzle migrations against your remote Neon database to provision the schema and synthetic data:
```bash
cd backend
export DATABASE_URL="[Your Neon URL]"
npx drizzle-kit push
npx tsx src/scripts/seed.ts
```

### Verification
Navigate to your live Vercel domain. You should immediately see the dark SVG grid populated with blue Distribution Transformers and grey/green Poles. Click on any pole and hit "Inject" in the Simulator Panel. The UI will stream the localized fault boundary dynamically.

---

## Environment Variables

| Variable | Location | Purpose | Required | Safe Default |
|----------|----------|---------|----------|--------------|
| `DATABASE_URL` | Backend | Postgres connection string | Yes | `postgresql://postgres:postgres@localhost:5433/kspdb` |
| `REDIS_HOST` | Backend | Redis connection string / host | Yes | `localhost` |
| `REDIS_PORT` | Backend | Redis TCP port | No | `6379` |
| `VITE_API_URL` | Frontend | Absolute URL to Backend API | Yes (Prod) | `""` (falls back to local `/api` proxy) |

*(See committed `.env.example` files in `/backend` and `/frontend`).*

---

## Troubleshooting Failure Modes

During construction, we encountered and resolved several critical deployment edge cases:

**1. Vercel Serverless Killing SSE Streams**
- **Symptom**: The Server-Sent Events UI stream terminates after 10-60 seconds on Vercel, causing the frontend UI to freeze and stop showing real-time updates.
- **Fix**: Vercel's serverless architecture strictly limits execution time and buffers HTTP streams. We migrated the Backend to Render.com, which provides long-running Node.js processes natively capable of maintaining open HTTP/1.1 TCP connections for SSE.

**2. BullMQ Worker Crashing on Vercel**
- **Symptom**: Background processing of telemetry queues simply does not run in production.
- **Fix**: Serverless functions cannot run background event loops listening to Redis. Migrating the backend to a VPS or Render Web Service resolved this.

**3. Cross-Origin Resource Sharing (CORS) Blocks**
- **Symptom**: Browser console throws a CORS preflight error when the Vercel frontend attempts to POST to the Render backend.
- **Fix**: Upgraded the Express backend with `app.use(cors())` and refactored the Vite frontend to use absolute `import.meta.env.VITE_API_URL` endpoints instead of relying on the local Vite proxy.

**4. Drizzle Push Racing Database Provisioning**
- **Symptom**: Running `npx drizzle-kit push` immediately upon container start fails with "Connection Refused".
- **Fix**: In our local `docker-compose.yml`, the Express server booted faster than the PostgreSQL container finished initializing its volume. While retry logic could be implemented, running the push explicitly as an independent step guarantees stability.

---

## Clean State Reset

To wipe the grid entirely and generate a new random synthetic topography:

```bash
# Connect to Neon Postgres and truncate the tables
psql $DATABASE_URL -c "TRUNCATE TABLE poles, dts, feeders, substations CASCADE;"

# Clear the Redis state cache
redis-cli -h $REDIS_HOST flushall

# Reseed the grid
npx tsx src/scripts/seed.ts
```
