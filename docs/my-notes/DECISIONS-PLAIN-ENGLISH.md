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
