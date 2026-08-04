# Changelog Explained

## feat(backend): init project and data layer schema
**What changed**: Initialized the Node.js backend environment with TypeScript, Drizzle ORM, and Postgres. Created the full relational schema (`schema.ts`) for the KSPDB power network, including substations, feeders, DTs, poles, telemetry events, and tickets.
**Why**: This forms the foundational data contract for the entire application. We need a strongly typed DB schema to accurately store and query the highly relational physics of the electrical grid. 
**Runtime impact**: No runtime yet, just structure. The DB is now ready to receive synthetic generation and run complex tree traversals later.

## feat(backend): build branching geographic synthetic generator
**What changed**: Added `seed.ts` to procedurally generate a realistic test network (12 DTs, ~1200 poles) using Haversine distance and bearing formulas. Implemented constraints: exactly 40% surveyed/60% inferred topologies, exactly 9% missing devices, and exactly 3% missing pincodes.
**Why**: We cannot build and test the complex MST inference and localization algorithms without realistic, ambiguous, and imperfect data to test against. A straight line is too easy; branching tests the real edge cases.
**Runtime impact**: Running `npx tsx src/scripts/seed.ts` will flush the DB and insert ~1200 rows of deterministic, geographically coherent test data into Postgres.

## feat(backend): implement topology reconstruction service
**What changed**: Added `topology.ts` service with `getTopology()` function. It builds Surveyed trees by directly mapping IDs, and Inferred trees by running Prim's Algorithm over Haversine distances to construct a Minimum Spanning Tree. Added strict geometric tie-breaker logic to tag ambiguous edges. Added `vitest` unit tests covering linear paths and the tie-breaker geometry.
**Why**: 60% of our distribution transformers are missing wiring data. Without this MST inference, we wouldn't be able to map faults to a tree at all. The ambiguity tagging ensures operators know exactly when the algorithm is mathematically unsure about the wiring path.
**Runtime impact**: Fast, deterministic graph building in memory. Operates in $O(V^2)$ where $V$ is poles per DT, which is negligible since the maximum poles per DT is ~240.

## feat(backend): implement localization algorithm and confidence scoring
**What changed**: Added `localization.ts` which uses a DFS traversal over the topology tree to identify fault boundaries (`live` -> `dark`). It groups all downstream dark poles into single incidents. Added logic to pre-screen for "Broken Sensors" (dark poles with live children) and route them to a separate hardware queue. Implemented the v1 confidence formula (Topology + Corroboration + Freshness + Clarity). Added comprehensive `vitest` cases for single faults, simultaneous faults, DT outages, and sensor failures.
**Why**: This is the core engine of the KSPDB system. Without this, we just have a pile of telemetry. This translates 40 blinking red lights into 1 actionable work ticket with an exact span location and a calculated confidence score.
**Runtime impact**: Fast in-memory tree traversals ($O(V)$) that can easily execute in milliseconds, well within the 120s SLA.

## feat(backend): build telemetry fault simulator
**What changed**: Updated the DB schema and `seed.ts` to assign `fw = '1.2.x'` to 8% of devices. Built `simulator.ts` to dynamically inject span, DT, and feeder faults into the topology. Added mathematical logic to randomly drop 30% of telemetry payloads (capacitor death) and strictly silence 100% of the `1.2.x` devices. Built a `repairFault` method to reset sequence numbers and emit boots. Added 4 strict `vitest` cases covering the drop rates and sequence behavior.
**Why**: We must prove the Phase 3 localization algorithm works against missing data. If we only test against perfect streams of telemetry, we will fail in production. The simulator guarantees we are testing the true "Swiss cheese" data constraints.
**Runtime impact**: Operates entirely in memory and only triggers DB calls on demand when injecting faults. Tests run in under 10ms.

## feat(backend): build redis queue and ingest worker
**What changed**: Added `redis:alpine` to the Docker compose stack. Built a fast Express POST route (`/api/telemetry/ingest`) that validates incoming telemetry via Zod and instantly pushes it to a BullMQ queue, returning HTTP 202. Built `telemetryWorker.ts` which processes the queue. It stores and compares the `seq` number in Redis individual string keys (`device:seq:{id}`) to deduplicate and drop out-of-order messages. If valid, it updates the state in a Redis hash and fires the `localizeFaults` DFS graph algorithm. Added tests proving Zod validation and deduplication logic.
**Why**: We need a resilient buffer to absorb massive thundering herds when a feeder trips. The Express API ensures we capture the message instantly. The deduplication logic in the worker filters the burst of noise (duplicate messages) and out-of-order older messages to ensure the graph algorithm only ever sees a strictly ordered, clean state.
**Runtime impact**: Highly scalable architecture. By using individual string keys for sequences, we avoid hot keys. In an MVP, localization runs per message (heavy but deterministic). In production, a 500ms debounce would be required to prevent redundant CPU cycles.

## feat(backend): expose client API and link simulator
**What changed**: Added `cors` support. Built `GET /api/grid/state` to merge Postgres topology with real-time Redis pole states. Updated the `telemetryWorker` to cache calculated incidents into a Redis string, and built `GET /api/incidents/active` to serve that cached JSON instantly. Modified `simulator.ts` to push its generated events directly into the BullMQ `telemetry-ingest` queue instead of memory, completing the end-to-end pipeline. Exposed `POST /api/simulate/fault` and `POST /api/simulate/repair` to trigger the simulator.
**Why**: The React frontend needs clean, typed JSON contracts to visualize the physical grid and the fault boundaries. By caching the active incidents in Redis, we optimize the read-heavy polling endpoints so they don't block the Node event loop doing heavy graph computations.
**Runtime impact**: Very fast reads. The heavy lifting is done asynchronously by the worker, while the Express routes mostly just pull pre-calculated states from the fast Redis cache.
