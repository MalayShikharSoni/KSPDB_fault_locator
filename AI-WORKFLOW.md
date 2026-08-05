# AI Workflow

## Tools used
- **Agentic IDE (Google Antigravity / Gemini)** for inline generation, autonomous command execution, container orchestration, and executing multi-file refactors.
- **ChatGPT (GPT-4o)** for high-level architectural discussion, specifically modeling the tradeoffs between Graph databases (Neo4j) vs in-memory BFS/DFS and exploring Prim's algorithm for minimum spanning tree topology inference.

## Delegation boundaries

**Delegated wholesale, reviewed lightly:**
- **Infrastructure & Boilerplate:** The initial `docker-compose.yml`, Dockerfile setups, Drizzle ORM schema scaffolding, Vite configuration, and Express middleware wiring.
- **Synthetic Data Generation:** The Haversine distance math in `seed.ts` used to procedurally generate a realistic radial tree network for 1,200 poles distributed across 12 Transformers, including simulating 30% capacitor failure drops and firmware version constraints.
- **Frontend Presentation:** The raw CSS Modules UI, structural React components (`IncidentDashboard`, `SimulatorPanel`), and the native `SVGVisualizer` affine transformations mapping geographic coordinates to SVG viewport bounds.

**Hand-written or heavily corrected:**
- **The Core Topology & Localization Mathematics:** `getTopology` (implementing Prim's algorithm for inferred grids) and `localizeFaults` (the core DFS traversal).
- **The Ticketing Workflow Constraint:** The explicit mandate that tickets cannot be manually resolved while telemetry is reporting dark. The AI initially assumed clicking "Resolve" should close the ticket in the database. I rejected this and forced a rewrite where manual resolution is blocked by field state, requiring the telemetry worker to auto-resolve upon receiving `power_restored` events.
- I drew the line here because the topological inference and localization accuracy are the crux of the assignment. Boilerplate CRUD endpoints and CSS grids are solved problems; interpreting ambiguous edge boundaries on a radial power network is not.

## Cases where the AI was wrong or misleading

1. **The Windows CRLF Docker Trap.** The AI generated a standard Alpine Linux `start.sh` entrypoint for the backend container. When building on Windows, Git checked out the file with `CRLF` line endings. The container instantly crashed with a cryptic `exec format error` (SIGBUS). The AI initially hallucinated that the architecture was wrong (suggesting `linux/amd64` flags) or that Node 22 was incompatible. I had to manually steer it to investigate the line endings, eventually instituting a `sed -i 's/\r$//' /start.sh` cleanup directly inside the Dockerfile.

2. **Deduplicating telemetry by timestamp instead of sequence.** When handling the "burst" behavior constraint, the AI originally wrote a deduplication filter using `event.timestamp`. Section 2 of `02-data-and-systems.md` explicitly warns about heavy clock skew. I corrected the agent to rely exclusively on the monotonically increasing `seq` integer tracked per `device_id` in a fast Redis Hash.

3. **Rendering the network as a DOM-heavy Graph.** The AI initially recommended using React Flow to render the grid mapping. I realized that rendering 1,200 interactive DOM nodes on a single page would cripple browser performance. I rejected the approach and instructed the AI to rewrite the mapping layer using a single native `<svg>` canvas with raw `<circle>` and `<line>` elements relying on zero-cost `<title>` tags for tooltips.

## AI generation estimate
Roughly **75%** of the repository (UI, API plumbing, schema, seeded data scripts, Docker setup) was AI-generated with light review. The remaining **25%**—specifically `topology.ts`, `localization.ts`, the Redis ingestion worker pipeline, and the Docker environment constraints—was strictly hand-steered. I architected the logic and constraints, while the agent executed the syntax.

## Session excerpt
**Prompt:** *"The problem context says 60% of our transformers don't have surveyed parent-child relationships (seqOnLine is null). For these grids, we just have coordinates. Write a function that infers the radial tree topology using distance. Use Prim's Minimum Spanning Tree (MST) algorithm to connect them. Also, if the second-best edge is within 3 meters of the best edge, flag the edge as `inferred_ambiguous` so the UI knows the system is guessing."*

**Outcome:** The AI successfully implemented `getTopology` utilizing Prim's algorithm, maintaining an `unvisited` Set and finding the shortest Haversine distance from the surveyed root (`DT_ROOT`). It properly implemented the ambiguity threshold `(min2 - min1) <= 3.0`. This allowed the localization algorithm to traverse an inferred grid identically to a surveyed grid, while bubbling up the degraded confidence metric to the Incident Dashboard.
