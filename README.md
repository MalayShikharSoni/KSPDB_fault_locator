# KSPDB Fault Locator

A real-time telemetry ingestion and fault localization engine for the Karnataka State Power Distribution Board (KSPDB) low-tension grid.

**Live Application URL:** [https://kspdb-fault-locator-h2ut-three.vercel.app/](https://kspdb-fault-locator-h2ut-three.vercel.app/)
*(Note for Reviewers: The live application is hosted on a free tier. If the application takes a moment to load or the SSE stream takes up to 60 seconds to connect initially, it is because the backend is waking up from a cold start. Please allow up to a minute for the instance to boot!)*
**Demo Video:** [Demonstration Video](https://drive.google.com/file/d/1tBT5Iek43cpdfZh3gvwkWS7LiL3vIytJ/view?usp=sharing)

---

## The Problem
When a low-tension wire snaps on the grid, all downstream houses lose power. Currently, operators wait for phone complaints and dispatch linemen to physically trace the line pole-by-pole—a process taking up to two hours. 

## The Solution
This system ingests high-velocity IoT telemetry (live/dark states) from smart poles, rebuilds the unmapped geographic topology using Minimum Spanning Tree inference, and runs a Depth-First Search (DFS) algorithm to pinpoint the exact failure boundary on the span within milliseconds. It reduces fault identification time from two hours to zero.

## Running Locally

The entire stack (Frontend, Backend, BullMQ Worker, Redis, and PostgreSQL) runs completely containerized with a single command. 

### Prerequisites
- Docker & Docker Compose

### Start the Application
```bash
git clone https://github.com/MalayShikharSoni/KSPDB_fault_locator.git
cd KSPDB_fault_locator
docker compose up --build
```
*Note: The system automatically provisions and seeds the database with a highly realistic, randomized 1,200 pole network on startup.*

Open **`http://localhost:5173`** in your browser.

## Documentation Navigation
The technical details of this project are strictly documented across the following files:

- [`ARCHITECTURE.md`](ARCHITECTURE.md): The technical heart of the submission. Details the topology generation, the DFS localization algorithm, Redis state management, and the system design.
- [`DECISIONS.md`](DECISIONS.md): A log of critical path choices, rejected alternatives, and known constraints (e.g., SSE over WebSockets, SVG scaling).
- [`DEPLOYMENT.md`](DEPLOYMENT.md): Detailed local configuration, exact setup commands, environment variables, and troubleshooting guides (especially the Windows Docker `CRLF` trap).
- [`AI-WORKFLOW.md`](AI-WORKFLOW.md): A transparent evaluation of AI tooling usage, outlining strict delegation boundaries and concrete examples of AI hallucination corrections.

## Testing the System
Once running, use the **Simulation Lab** on the left rail of the UI to interact with the grid:
1. **Span Faults:** Select "Span interruption", click any pole on the map, and run the simulation. Watch the boundary ticket generate.
2. **Auto-Verification:** Click "Resolve" on the open ticket. Observe the system actively block the resolution because physical telemetry is still reporting dark.
3. **Restoration:** Click "Repair" in the lab. Watch the poles turn green and the ticket automatically close upon verifying the telemetry restored events.
