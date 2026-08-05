# Task 1: Database Schema & Spatial Grid Modeling

## Objective
Design a relational database schema capable of representing a radial electrical distribution grid, including Substations, Feeders, Distribution Transformers (DTs), and Poles, along with their geographic coordinates.

## Implementation Details

We utilized **PostgreSQL** as our primary relational database, interfaced via **Drizzle ORM** for strict, end-to-end type safety in TypeScript. 

### Schema Architecture
The schema (`backend/src/db/schema.ts`) is designed for high-performance spatial and hierarchical queries:
- **`substations`**: The root energy sources.
- **`feeders`**: The primary lines extending from substations.
- **`dts` (Distribution Transformers)**: Includes `lat`/`lon` for geographic placement and capacity metadata (`capacityKva`, `householdsServed`).
- **`poles`**: The individual nodes representing smart meters or checkpoints. Contains spatial data (`lat`, `lon`), hierarchical linking (`parentPoleId`, `seqOnLine`), and hardware metadata (`fw`, `pincode`, `deviceId`).

### Spatial Seeding
We implemented a robust geographic seeding algorithm (`backend/src/scripts/seed.ts`) that generates synthetic branching topologies. It uses Haversine distance and bearing calculations to generate 1,200 unique poles branching radially from 12 DTs across a realistic coordinate bounding box (Bangalore center). 

### File Links
- [Database Schema](https://github.com/MalayShikharSoni/KSPDB_fault_locator/blob/main/backend/src/db/schema.ts)
- [Synthetic DB Seeder](https://github.com/MalayShikharSoni/KSPDB_fault_locator/blob/main/backend/src/scripts/seed.ts)
