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
