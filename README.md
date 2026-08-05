# KSPDB Fault Locator

**An end-to-end algorithmic visualization system for automated fault localization in radial power grids.**

This system ingests high-volume device telemetry, infers missing graph topologies using a modified Minimum Spanning Tree (Prim's), executes real-time Depth-First Search (DFS) traversals to isolate electrical faults, and streams the results instantly to a pure React UI via Server-Sent Events (SSE).

## 🚀 Live Demo & Links

- **Public URL**: [INSERT_YOUR_VERCEL_URL_HERE] *(The deployed Vercel UI connected to Render/Neon)*
- **Demo Video**: [INSERT_YOUR_LOOM_LINK_HERE] *(A 5-minute walkthrough of injecting and repairing a fault)*

## ⚡ One-Command Start (Local Development)

The entire architecture is containerized and relies strictly on Docker. There is no manual migration or configuration required. 

To spin up the Postgres database, Redis cache, Express backend, BullMQ worker, and React frontend simultaneously with a fully seeded synthetic grid:

```bash
git clone https://github.com/MalayShikharSoni/KSPDB_fault_locator.git
cd KSPDB_fault_locator
docker compose up -d
```
*(Wait ~10 seconds for the Drizzle seed script to finish generating the 1200 geographic poles, then open [http://localhost:5173](http://localhost:5173)).*

## 📚 Documentation Map

As per the deliverable requirements, the complete system context is documented at the repository root:

1. [**`ARCHITECTURE.md`**](./ARCHITECTURE.md) - The technical heart. Covers our data flow, topological modeling, DFS localization algorithm, and API design.
2. [**`DEPLOYMENT.md`**](./DEPLOYMENT.md) - A step-by-step guide on deploying this stack to production (Vercel, Render, Neon), including environment variables and exact troubleshooting steps for common edge cases.
3. [**`DECISIONS.md`**](./DECISIONS.md) - A chronological log of critical engineering decisions, rejected frameworks (like D3 and Tailwind), and identified fragile edge cases.
4. [**`AI-WORKFLOW.md`**](./AI-WORKFLOW.md) - A transparent breakdown of how LLMs were utilized during construction, where they failed, and the manual engineering required to ship.
