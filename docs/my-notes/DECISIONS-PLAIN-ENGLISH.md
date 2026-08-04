# Decisions Explained

## 1. Using an Adjacency List for the Pole Tree in Postgres
**Decision**: We modeled the tree structure natively in Postgres using an adjacency list (`parent_pole_id` referencing the `poles` table itself), instead of complex alternatives like nested sets or materialized paths.
**Why**: The physical domain of a power network is explicitly a tree where each pole connects to one parent. Adjacency lists map 1:1 to this physical reality. With Postgres recursive CTEs, traversing this tree is fast and straightforward. It handles branches and spurs naturally, which is crucial for our geographic generation and MST inference.

## 2. Generating Branching Trees Geographically
**Decision**: In our synthetic generator, we placed poles radially from the DT, forming a main line and two branches that angle off, instead of a single straight line.
**Why**: Real power lines aren't perfectly straight; they follow streets and branch into alleys. Generating branched geometry ensures that our Minimum Spanning Tree (MST) inference logic later will actually be tested against ambiguous tie-breakers and non-linear shapes, proving its robustness.

## 3. Embedding Tickets Edge-Based Boundary State
**Decision**: We included `boundaryParentPoleId` and `boundaryChildPoleId` directly on the `tickets` table as foreign keys.
**Why**: The core problem of fault localization is finding the exact span (edge) where power is lost. Modeling the incident boundary as an edge (rather than a single node) prevents ambiguity and naturally supports the "no-device gap" scenario by allowing us to identify the bounding poles around the gap.

## 4. Prim's Algorithm for MST Inference
**Decision**: When inferring the topology of poles with missing connection data, we construct a Minimum Spanning Tree using Prim's algorithm rooted at the DT.
**Why**: Power utilities lay cable to minimize cost (wire length), which mathematically maps exactly to a Minimum Spanning Tree using geographic (Haversine) distances. Prim's algorithm is perfect here because it natively grows outward from a root (the DT), allowing us to assign parents iteratively and definitively orient the tree away from the power source.

## 5. Ambiguity Tagging via Tie-Breakers
**Decision**: An edge is tagged as `inferred_ambiguous` if a child pole's distance to its assigned parent is within 3 meters of its distance to a *second* potential parent that is already part of the MST.
**Why**: This represents a true geometric tie where the algorithm is virtually guessing which of the two nearby lines the pole taps into. We only compare against nodes already visited by Prim's algorithm, as those represent the live, connected network available at that step.

## 6. Identifying Fault Boundaries with DFS
**Decision**: We use a Depth-First Search (DFS) starting from the DT to walk down the topology tree, flagging the first edge where a parent is live and a child is dark as the fault boundary.
**Why**: Faults in a radial network always manifest as a live-to-dark transition. By traversing top-down, we naturally catch the highest point of failure, automatically grouping all subsequent downstream dark poles into the same incident. This inherently handles multiple simultaneous faults on different branches.

## 7. Isolating Hardware Issues (Broken Sensors)
**Decision**: Before searching for boundaries, we do a post-order traversal to check if any dark pole has live children anywhere beneath it. If so, we strip it out of the power incident flow and flag it as a `HardwareIssue`.
**Why**: Power cannot jump over a broken wire. If a parent is dark but children are live, it is physically impossible to be a line fault; the sensor on the parent is simply dead or reporting incorrectly. We must not dispatch line crews for this.

## 8. Simulator Architecture
**Decision**: We built a custom telemetry simulator that queries the true database topology to generate downstream fault cascades.
**Why**: The localization engine is useless if it's not robust against noise. By building a simulator that natively drops 30% of messages (simulating capacitor death) and strictly silences firmware 1.2.x devices, we can test our localization confidence scores against truly imperfect, real-world data distributions.

## 9. Async Ingestion and Individual Redis Sequence Keys
**Decision**: Incoming telemetry is validated synchronously (via Zod) and immediately pushed to a BullMQ queue, returning a 202 Accepted. The worker process uses individual Redis string keys (`device:seq:${device_id}`) to track sequence numbers rather than a single massive Hash map.
**Why**: The ingest layer must absorb massive thundering herd spikes when a feeder trips. The queue provides a resilient buffer. Using individual Redis keys prevents hot-key contention during a spike and inherently supports horizontal sharding across a Redis cluster later.

## 10. Per-Message Localization Execution (MVP Trade-off)
**Decision**: In this MVP, the worker triggers the full `localizeFaults` DFS tree traversal immediately after updating state for *every* valid, deduplicated message.
**Why**: This makes the system extremely deterministic and easy to unit test for the assignment. **Trade-off**: In a production environment with high throughput, executing the DFS on every single message is computationally heavy. We would realistically implement a debounce or batching window (e.g., waiting 500ms after the first telemetry event on a DT before running the localization algorithm once on the aggregated states).

## 11. Caching Incidents in Redis for Read-Heavy Endpoints
**Decision**: The `/api/incidents/active` API reads directly from a JSON string cached in Redis (`active_incidents`), which is updated by the queue worker.
**Why**: Compute on write, optimize for read. It is vastly more scalable to have the worker do the heavy lifting of the DFS graph traversal and dump the answer in a fast cache, rather than forcing the Express endpoint to re-calculate the topology and incidents every time the frontend polls for active faults.

## 12. Using Server-Sent Events (SSE) instead of Polling
**Decision**: For real-time updates on the frontend, we use Server-Sent Events (SSE) via the `/api/stream/state` endpoint, triggered by a Redis Pub/Sub channel (`state_updates`), instead of polling.
**Why**: Polling the REST endpoints every few seconds creates unnecessary HTTP overhead and latency. SSE maintains a single unidirectional connection, allowing the backend to instantly push updates to the UI exactly when a new fault is detected by the worker, resulting in a hyper-responsive, low-overhead UX.

## 13. Custom SVG Visualizer via Linear Affine Transformation
**Decision**: We built a custom `<svg>` visualizer natively in React, mapping geographic coordinates (Lat/Lon) to pixels using a simple flat linear projection (scaling based on the bounding box), rather than pulling in D3.js or a heavy map library.
**Why**: Since our grid is a localized geometry spanning only a few kilometers, Earth's curvature distortion is negligible. A simple affine transform perfectly translates the coordinates to a 2D viewBox. Building this natively with basic primitives (`<line>`, `<circle>`) keeps the JS bundle ultra-lightweight and demonstrates absolute control over the DOM.
