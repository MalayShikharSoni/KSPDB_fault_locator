# Task 3: High-Throughput Telemetry Ingestion Pipeline

## Objective
Design a highly scalable data ingestion pipeline capable of receiving thousands of concurrent telemetry signals from smart devices (e.g., during a massive grid failure causing a "thundering herd" of offline signals) without dropping data or overwhelming the database.

## Implementation Details

We utilized **Redis** and **BullMQ** to build a decoupled, high-performance async processing pipeline.

### The Ingestion API
The Express backend exposes a `/api/telemetry/ingest` POST endpoint (`backend/src/server.ts`). To ensure maximum throughput, this endpoint performs strict Zod validation on the incoming JSON payload and immediately offloads the task to a BullMQ queue backed by Redis, responding to the client with a fast `202 Accepted`.

### The Worker & Deduplication
The background worker (`backend/src/workers/telemetryWorker.ts`) consumes messages from the queue. We implemented strict chronological sequencing to handle out-of-order UDP/TCP packets:
- We track the latest `seq` integer for every unique device using Redis (`device:seq:${device_id}`).
- If a message arrives with an older sequence number, it is cleanly dropped to prevent stale state overwrites.
- The validated state is then written to a fast Redis Hash (`pole:states`) for O(1) reads, completely bypassing Postgres writes for ephemeral real-time state.

### File Links
- [Express Ingestion Endpoint](https://github.com/MalayShikharSoni/KSPDB_fault_locator/blob/main/backend/src/server.ts)
- [BullMQ Telemetry Worker](https://github.com/MalayShikharSoni/KSPDB_fault_locator/blob/main/backend/src/workers/telemetryWorker.ts)
