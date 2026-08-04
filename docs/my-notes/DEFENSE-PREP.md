# Defense Prep (Phase 1)

**Q: Why use Postgres and Drizzle instead of a NoSQL DB like MongoDB for this?**
A: The physical reality of the domain is highly relational and specifically a tree structure. We need strict constraints (a pole belongs to exactly one DT) and ACID transactions when updating state. Postgres recursive CTEs (Common Table Expressions) allow us to traverse the tree efficiently in a single query, which would require multiple round trips or cumbersome document embedding in NoSQL.

**Q: What happens if your branching generation logic creates a circular loop?**
A: The generation logic is strictly radial, iterating outward from the center (DT) and explicitly assigning the `parentPoleId` to a previously generated node on that branch. It mathematically cannot form a cycle (loop) because a node can only have one parent, forming a strict directed acyclic graph (DAG) rooted at the DT.

**Q: Why did you seed exactly 1,200 poles?**
A: The brief requested a realistic slice (a few dozen DTs, a few thousand poles). 1,200 poles spread across 12 DTs averages 100 poles per DT, which perfectly aligns with the real-world median of ~70-240 poles per DT provided in the spec.
