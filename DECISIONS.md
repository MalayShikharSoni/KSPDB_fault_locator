# Decision Log

This log chronicles the major architectural decisions made during the construction of the system, ordered newest first.

### [Phase 8] Separation of Vercel and Render for Production
- **Decision:** Split the frontend and backend deployments across Vercel and Render, injecting absolute `VITE_API_URL` environment variables and strictly configuring Express CORS.
- **Rejected:** Deploying the entire monolith to Vercel.
- **Why:** Vercel strictly enforces Serverless execution. Our background BullMQ telemetry ingestor and persistent Server-Sent Events (SSE) UI stream mathematically cannot function within a serverless timeout window.
- **Assumptions:** We assumed the evaluation allowed multi-platform deployment as long as they were free tiers and accessible via a single public URL.

### [Phase 7] Interactive UI over Static Monitoring
- **Decision:** Migrated the static SVG nodes into interactive elements leveraging native `<title>` tooltips and global Zustand selection state to automatically populate the Fault Simulator inputs.
- **Rejected:** Building a custom React portal tooltip component.
- **Why:** The native `<title>` tag provides zero-cost HTML hover tooltips without bloating the DOM or requiring complex z-index/portal management.

### [Phase 6] Pure CSS Modules over Tailwind CSS
- **Decision:** Stripped Tailwind entirely and rewrote the UI in pure CSS Modules (`.module.css`).
- **Rejected:** Tailwind CSS, Material UI.
- **Why:** To enforce a "native-first, zero-dependency" philosophy and demonstrate absolute mastery over CSS grid, flexbox, and SVG styling without relying on utility-class abstractions.

### [Phase 5] Native SSE over WebSockets (Socket.io)
- **Decision:** Utilized Server-Sent Events (SSE) for unidirectional real-time UI updates, backed by a Redis Pub/Sub channel.
- **Rejected:** WebSockets / Socket.io / HTTP Polling.
- **Why:** Polling generates massive unnecessary HTTP overhead. WebSockets are bi-directional, which is overkill since the UI only needs to *listen* to the grid state, not emit high-frequency events back to the server (simulator inputs are standard REST POSTs).

### [Phase 4] Custom SVG Affine Math over Graph Libraries
- **Decision:** Wrote a custom React hook to calculate a bounding box and apply a linear Affine transformation to map geographic Lat/Lon to pixel coordinates within an SVG viewBox.
- **Rejected:** D3.js, React Flow, Cytoscape.
- **Why:** Rendering 1,200 nodes in React Flow caused massive DOM lag. Pure SVG with custom projection math is exponentially lighter, keeping the frontend bundle nearly dependency-free.

### [Phase 3] DFS Bounding over GraphDB Traversal
- **Decision:** Implemented the Fault Localization algorithm as a recursive Depth-First Search (DFS) in the Node.js application layer.
- **Rejected:** Migrating to Neo4j or ArangoDB.
- **Why:** The overhead of maintaining a dedicated Graph Database cluster for a strictly radial tree topology was unnecessary. PostgreSQL with application-layer DFS is highly performant for trees of this scale.

### [Phase 2] Minimum Spanning Tree (MST) Inference
- **Decision:** Used a geographic heuristic (Haversine distance) to attach orphaned poles (missing `parentPoleId`) to the closest valid surveyed pole within the same DT, flagging the edge as `inferred`.
- **Rejected:** Dropping orphaned poles from the network entirely.
- **Why:** An ambiguous guess with an associated confidence penalty is strictly better for a grid operator than an invisible, unmapped asset. 

### [Phase 1] BullMQ / Redis Deduplication Pipeline
- **Decision:** Placed a BullMQ worker queue between the Express ingestion route and the Redis state cache. 
- **Rejected:** Writing telemetry payloads synchronously to PostgreSQL during the HTTP request.
- **Why:** A massive grid failure causes a "thundering herd" of offline signals. Writing directly to Postgres would cause connection pool exhaustion. Queuing ensures the server remains responsive.

---

## Retrospective & Known Issues

### What is currently wrong or fragile?
1. **Visual Density on Mobile:** The SVG rendering, while mathematically precise, is not optimized for small touch screens. The nodes overlap significantly at high zoom scales.
2. **Hardcoded Zod Schemas:** The ingestion payload schema is strictly hardcoded to `['boot', 'power_lost', 'power_restored']`. A new hardware revision sending different event types would break the ingestion queue.
3. **No Auth:** The REST endpoints and Simulator Panel are completely unsecured.

### What we would do with two more weeks:
1. **Implement WebSocket/Canvas Rendering:** For scaling beyond 100,000 poles, React SVG rendering becomes a bottleneck. We would migrate the visualizer to WebGL/Canvas (PixiJS) for native GPU acceleration.
2. **PostGIS Integration:** We would migrate the spatial latitude/longitude floats to native PostGIS geometry types to enable spatial querying (e.g., "Find all faults within a 5km radius").
3. **Telemetry Archival:** Currently, old telemetry states are overwritten in the fast Redis Hash. We would implement a cron job to flush historical state snapshots into TimescaleDB for post-mortem analytics.
