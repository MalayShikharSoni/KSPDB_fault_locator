# Task 4: Fault Localization Engine

## Objective
Identify the exact location of an electrical fault based on the real-time pattern of `live` and `dark` telemetry signals streaming in from the smart meters on the grid.

## Implementation Details

We implemented a **Depth-First Search (DFS)** graph traversal algorithm (`backend/src/services/localization.ts`) that runs continuously as new telemetry data hits the Redis state cache.

### Algorithmic Approach
1. **State Aggregation**: The algorithm queries Redis for the live/dark status of all poles within a given DT network.
2. **Boundary Detection**: Starting from the DT (root), we execute a DFS traversal down the radial tree structure. We are searching for the precise topological edge where the parent pole is `live` (energized) and the child pole is `dark` (de-energized).
3. **Multi-Fault Support**: The recursive traversal is capable of identifying multiple independent fault boundaries occurring simultaneously on different branches.
4. **Confidence Scoring**: We built a dynamic heuristic scoring model that generates a `confidenceScore` (0-100%). The score penalizes the algorithmic confidence if the boundary edge was inferred ambiguously in Task 2, or if upstream nodes have stale/missing telemetry data.
5. **Caching**: Detected incidents are serialized and cached back into Redis (`SET active_incidents`) to serve read-heavy frontend requests in single-digit milliseconds.

### File Links
- [Fault Localization Engine](https://github.com/MalayShikharSoni/KSPDB_fault_locator/blob/main/backend/src/services/localization.ts)
