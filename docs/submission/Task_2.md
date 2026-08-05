# Task 2: Topology Inference Algorithm

## Objective
The database is initialized with partially missing topological data. We need to infer the connections (edges) between poles that lack explicit `parentPoleId` relationships to construct a complete, routable electrical graph.

## Implementation Details

We implemented a **Minimum Spanning Tree (MST)** approximation using Prim's algorithm, heavily modified for radial electrical topologies (`backend/src/services/topology.ts`).

### Algorithmic Approach
1. **Explicit Graph Extraction**: We first traverse the DB to extract all explicit (surveyed) parent-child relationships.
2. **Orphan Resolution**: For poles missing a `parentPoleId`, we calculate the Haversine distance matrix between the orphan pole and all known surveyed poles within the same DT context.
3. **Distance Heuristics**: We attach the orphan to the closest valid surveyed pole. If multiple poles are equidistant (within a strict geographic tolerance delta), we flag the edge as `inferred_ambiguous` to represent uncertainty in the physical wiring.
4. **Graph Construction**: The output is a strictly directed acyclic graph (DAG) representing the flow of electricity from the DT out to the furthest branch nodes.

### File Links
- [Topology Inference Engine](https://github.com/MalayShikharSoni/KSPDB_fault_locator/blob/main/backend/src/services/topology.ts)
