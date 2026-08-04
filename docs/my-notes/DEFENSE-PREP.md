# Defense Prep (Phase 1, 2, 3, 4, 5, 6 & 7)

**Q: Why use Postgres and Drizzle instead of a NoSQL DB like MongoDB for this?**
A: The physical reality of the domain is highly relational and specifically a tree structure. We need strict constraints (a pole belongs to exactly one DT) and ACID transactions when updating state. Postgres recursive CTEs (Common Table Expressions) allow us to traverse the tree efficiently in a single query, which would require multiple round trips or cumbersome document embedding in NoSQL.

**Q: What happens if your branching generation logic creates a circular loop?**
A: The generation logic is strictly radial, iterating outward from the center (DT) and explicitly assigning the `parentPoleId` to a previously generated node on that branch. It mathematically cannot form a cycle (loop) because a node can only have one parent, forming a strict directed acyclic graph (DAG) rooted at the DT.

**Q: Why did you seed exactly 1,200 poles?**
A: The brief requested a realistic slice (a few dozen DTs, a few thousand poles). 1,200 poles spread across 12 DTs averages 100 poles per DT, which perfectly aligns with the real-world median of ~70-240 poles per DT provided in the spec.

**Q: Why use Prim's algorithm over Kruskal's for the MST?**
A: Both yield a Minimum Spanning Tree, but Kruskal's builds a forest and merges it, while Prim's grows a single connected component outward from a starting root. Since our physical domain explicitly requires rooting the tree at the Distribution Transformer (DT) and establishing a strict parent-child directional flow for power, Prim's is the natural fit.

**Q: How do you handle ambiguity mathematically?**
A: During Prim's traversal, when selecting the best edge to connect a new unvisited node `V` to the existing tree, we find the shortest distance `min1` from `V` to any visited node, and the second shortest distance `min2` to a different visited node. If `min2 - min1 <= 3.0` meters, we tag the edge as ambiguous, because physically, the wire could have easily been tapped from either line.

**Q: How do you handle a single pole reporting dark when its children are live?**
A: That's a physical impossibility for a line fault. We perform a pre-check pass on the tree. If any pole reports dark but has a live descendant anywhere in its subtree, we isolate that pole as a hardware/sensor failure (`HardwareIssue`) and treat it as 'live' for the sake of the downstream boundary search so it doesn't break the actual power fault detection.

**Q: Why does the DFS logic naturally handle multiple simultaneous faults?**
A: Because DFS traverses each branch independently. If branch A has a fault at pole 10, the DFS hits pole 10, creates an incident, and stops going deeper on branch A. It then continues to branch B. If branch B has a fault at pole 50, it hits pole 50, creates a separate incident, and groups branch B's dark poles independently. They never merge into one ticket.

**Q: How did you test the localization algorithm against missing data?**
A: I built a Simulator that queries the actual Postgres database topology and dynamically drops 30% of the `power_lost` messages (simulating dying capacitors) and 100% of the messages from devices running firmware `1.2.x`. This forces the localization DFS to operate on Swiss-cheese data, exactly as it would in production.

**Q: Why use individual keys (`device:seq:{id}`) in Redis instead of a single Hash map for the sequences?**
A: When a feeder trips, thousands of poles send telemetry simultaneously. If we used a single Redis Hash to store sequences for the entire city, that key would become a severe write bottleneck (a "hot key"). Using individual strings spreads the load and allows Redis to natively shard those keys across a cluster in a production environment.

**Q: If `localizeFaults` is computationally heavy, why trigger it on every single message in the queue?**
A: For the scope of this MVP assignment, doing it per-message ensures deterministic state transitions for testing. However, in a real massive-scale production environment, doing heavy graph traversals on every message is unscalable. We would introduce a debouncing mechanism—buffering events for a DT and waiting ~500ms after the first event to allow the cascade to settle before running the localization logic once.

**Q: Why cache the incidents in Redis instead of having the endpoint calculate them?**
A: Compute on write, optimize for read. It is vastly more scalable to have the worker do the heavy lifting of the DFS graph traversal and dump the answer in a fast cache. This ensures the Express endpoint (`GET /api/incidents/active`) returns instantly, even if a frontend dashboard is polling it every second.

**Q: Why use Server-Sent Events (SSE) instead of WebSockets or polling?**
A: Polling creates massive HTTP overhead, and WebSockets represent a complex bi-directional connection. Since our data flow is strictly unidirectional (backend notifying frontend of grid updates), SSE is the perfect native HTTP protocol. It maintains a single open connection and uses far fewer server resources than WebSockets while providing the exact same real-time latency.

**Q: Why build a custom SVG Visualizer instead of using React Flow or D3?**
A: Graph libraries are heavily bloated (React Flow is ~50kb+ gzipped) and introduce complex virtual DOM overhead for large datasets. By translating the raw Lat/Lon coordinates via a simple linear mathematical scaling function (`useMapScale`) and rendering native SVG primitives, we maintain absolute control over the render cycle, ensure hyper-responsive scaling, and keep the bundle size minimal.
