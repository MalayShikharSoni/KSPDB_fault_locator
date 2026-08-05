# Decision Log

This log chronicles the major architectural and domain decisions made during the construction of the system, ordered newest first.

### [Phase 5] Strict Telemetry-Bound Resolution (Rejecting Manual Close)
- **Decision:** The API strictly rejects manual `PATCH` operations to close an incident if the underlying poles are still reporting a `dark` state.
- **Rejected:** Allowing an operator to forcefully close a ticket via a button.
- **Why:** The problem context explicitly demanded: *"Restoration must be verified from telemetry, not from someone clicking a button."* By hardcoding this validation, we mathematically enforce that tickets represent physical reality, preventing operators from falsifying metrics or clearing queues prematurely.

### [Phase 4] Minimum Spanning Tree (MST) for Unknown Topologies
- **Decision:** For the 60% of distribution transformers (DTs) lacking surveyed `seqOnLine` data, the system builds an adjacency map using Prim's algorithm (Haversine geographic distance).
- **Rejected:** Treating unknown grids as un-localizable, or using a simple geographic radius bounding box.
- **Why:** Radial networks are strictly tree structures. MST geometrically forces a tree structure out of an unmapped point cloud. If the MST calculates that the second-best edge is within a highly ambiguous delta (<= 3 meters) of the best edge, the system flags the connection as `inferred_ambiguous`, lowering the overall confidence score on the incident dashboard while still providing a highly actionable span location.

### [Phase 3] Depth-First Search (DFS) for Fault Bounding
- **Decision:** Implemented Fault Localization as an iterative DFS tree traversal over the adjacency map in the Node.js application layer.
- **Rejected:** Migrating to Neo4j or running heavy recursive SQL graph queries (`WITH RECURSIVE`).
- **Why:** The overhead of a dedicated GraphDB for a strictly radial LT network (where max depth rarely exceeds 100 poles) is massive overkill. Keeping the tree in-memory within Node.js allows the localization logic to execute in sub-millisecond time.

### [Phase 2] Redis Sequence Deduplication (Ignoring Timestamps)
- **Decision:** Deduplication and burst-handling strictly rely on the monotonically increasing `seq` integer per device, cached in a Redis Hash.
- **Rejected:** Discarding events based on `event.timestamp`.
- **Why:** As documented in `02-data-and-systems.md`, physical IoT device clocks can drift by up to ±90 seconds. A purely timestamp-based ordering algorithm would frequently mistake a stale packet for a fresh one during a network surge. Relying on `seq` guarantees deterministic ordering regardless of temporal drift.

### [Phase 1] BullMQ Ingestion over Synchronous Writes
- **Decision:** Placed a BullMQ worker queue between the Express ingestion route and the Redis state evaluator.
- **Rejected:** Writing telemetry payloads synchronously to PostgreSQL during the HTTP request.
- **Why:** When a feeder line drops, a "thundering herd" of thousands of offline signals hits the API simultaneously. Synchronous database writes would instantly exhaust the PostgreSQL connection pool. Queuing ensures the HTTP server returns `202 Accepted` immediately, offloading localization calculation to background threads.

---

## Retrospective

### What we would do with two more weeks
1. **WebGL Canvas Rendering:** For scaling beyond 100,000 poles, React SVG rendering becomes a DOM bottleneck. We would migrate the visualizer to WebGL/Canvas for native GPU acceleration.
2. **PostGIS Integration:** We would migrate the spatial latitude/longitude floats in PostgreSQL to native PostGIS geometry types to enable advanced spatial querying (e.g., cross-referencing faults with weather geometry layers).
3. **TimescaleDB Archival:** Currently, old telemetry states are aggressively overwritten in the fast Redis Hash to conserve memory. We would implement a cron worker to flush historical state snapshots into TimescaleDB for post-mortem analytics.
