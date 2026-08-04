# Changelog Explained

## feat(backend): init project and data layer schema
**What changed**: Initialized the Node.js backend environment with TypeScript, Drizzle ORM, and Postgres. Created the full relational schema (`schema.ts`) for the KSPDB power network, including substations, feeders, DTs, poles, telemetry events, and tickets.
**Why**: This forms the foundational data contract for the entire application. We need a strongly typed DB schema to accurately store and query the highly relational physics of the electrical grid. 
**Runtime impact**: No runtime yet, just structure. The DB is now ready to receive synthetic generation and run complex tree traversals later.

## feat(backend): build branching geographic synthetic generator
**What changed**: Added `seed.ts` to procedurally generate a realistic test network (12 DTs, ~1200 poles) using Haversine distance and bearing formulas. Implemented constraints: exactly 40% surveyed/60% inferred topologies, exactly 9% missing devices, and exactly 3% missing pincodes.
**Why**: We cannot build and test the complex MST inference and localization algorithms without realistic, ambiguous, and imperfect data to test against. A straight line is too easy; branching tests the real edge cases.
**Runtime impact**: Running `npx tsx src/scripts/seed.ts` will flush the DB and insert ~1200 rows of deterministic, geographically coherent test data into Postgres.
