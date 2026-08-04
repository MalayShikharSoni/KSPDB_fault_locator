# KSPDB Fault Locator (Propel Assignment)

**An end-to-end algorithmic visualization system for automated fault localization in radial power grids.**

This project demonstrates a full-stack engineering approach to ingesting high-volume device telemetry, inferring missing graph topologies using a Minimum Spanning Tree (Prim's Algorithm), executing real-time Depth-First Search (DFS) traversals to isolate electrical faults, and instantly streaming the results to a highly optimized, native React UI via Server-Sent Events (SSE).

## 🚀 Core Engineering Philosophies

1. **Native SSE over WebSockets**: To provide instant, real-time UI updates without the overhead of HTTP polling or the complexity of bi-directional WebSockets, we push updates unidirectionally via native Server-Sent Events (SSE) backed by a Redis Pub/Sub channel.
2. **Custom SVG Math over D3**: Rather than bloating the frontend bundle with D3 or React Flow, the visualizer leverages a custom React hook to perform a linear Affine transformation, mapping real-world Lat/Lon coordinates perfectly into a highly responsive, native 2D `<svg>` viewBox.
3. **CSS Modules over Tailwind**: In strict adherence to a "native-first, zero-dependency" philosophy, the UI is styled entirely using pure CSS Modules (`*.module.css`) and CSS Custom Properties, proving absolute mastery of vanilla CSS architecture and component encapsulation without build-time utility overhead.
4. **Resilient Ingestion (BullMQ + Redis)**: Out-of-order telemetry is strictly dropped using per-device sequence tracking via lightweight Redis string keys, preventing hot-key contention while absorbing massive feeder-trip thundering herds via BullMQ.

## ⚡ Quickstart (One-Command Spin Up)

You will need **Docker Desktop** running and **Node.js (v20+)** installed.

### 1. Install Dependencies
```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Start the Full Stack
We will use Docker Compose to spin up Postgres and Redis, flush/seed the database with synthetic branching geographic data, start the Express/BullMQ backend, and launch the Vite React frontend.

Open a terminal at the project root and run:
```bash
cd backend
npm run dev:all
```
*(Note: `dev:all` starts Docker, runs DB migrations, seeds the 1200-pole synthetic topography, starts the Express server and Telemetry Worker, and concurrently boots the Vite frontend).*

### 3. Access the Application
- **UI Dashboard**: [http://localhost:5173](http://localhost:5173)
- **API Backend**: [http://localhost:3000](http://localhost:3000)

## 🧪 E2E Manual Testing
Please see [docs/E2E_TEST_PLAN.md](./docs/E2E_TEST_PLAN.md) for a step-by-step interactive script on how to simulate faults (Span, DT, Feeder), observe the localization engine handle ambiguity, and watch the UI react in real-time.

## 📁 Project Structure

- `/backend`: Express, Drizzle ORM, Postgres, Redis, BullMQ. Contains the core algorithmic engines (`topology.ts` and `localization.ts`).
- `/frontend`: Vite, React, Zustand. Contains the custom SVG visualizer and native CSS Modules.
- `/docs/my-notes`: Detailed architectural decisions, algorithm glossaries, and defense prep questions.
