#!/bin/sh
# Wait for the database to be ready (optional but good practice)
echo "Running migrations..."
npx drizzle-kit push
echo "Seeding database..."
npx tsx src/scripts/seed.ts
echo "Starting backend processes..."
npx concurrently "npx tsx src/server.ts" "npx tsx src/workers/telemetryWorker.ts"
