# Final Review & Demonstration Plan

## Goal
Provide a complete script for the 5-minute demo video and perform a thorough "pre-flight" check against the Propel evaluation criteria (`03-deliverables-and-submission.md`) to ensure the submission passes all mandatory gates.

## User Review Required

> [!WARNING]
> **URGENT:** I have reviewed the company's evaluation rubric. **If you submit the repository exactly as it is right now, you will automatically fail Gate G2.** 
> 
> Gate G2 explicitly states: *"A reviewer must be able to run `docker compose up` at the root of the repository and bring up the **entire stack** (frontend, backend, database) with no manual steps."* Currently, your repository has no root `docker-compose.yml` and no Dockerfiles for the Node/React apps. I highly recommend we fix this immediately before you record your video!

## Pre-Flight Checklist (Propel Requirements)

### 🔴 Missing / Needs Fixing
1. **Dockerization (Gate G2):** We need to create a `Dockerfile` for the backend, a `Dockerfile` for the frontend, and a root `docker-compose.yml` that boots Postgres, Redis, Express, BullMQ, and React.
2. **Database Seeding on Startup (Gate G3):** The Docker composition must automatically run the `seed.ts` script when the database container starts so the evaluator doesn't see a blank screen.
3. **Rejecting Premature Resolution:** The checklist requires: *"Marked a ticket resolved while the poles were still dark. The system pushed back."* Our UI currently does not have a "Resolve Ticket" button that pushes back if the power is still out.

### 🟢 Passing
1. **Public URL (Gate G4):** You have successfully deployed to Vercel and Render.
2. **Localization (Gate G5):** Injecting a fault via the UI successfully pinpoints the exact boundary and confidence score.
3. **Hardware Issues:** The system successfully detects dead sensors without logging them as grid faults.

---

## The 5-Minute Demo Video Script (Once fixes are applied)

When you record your Loom/YouTube video, follow this exact script to hit every point the evaluators are looking for:

**0:00 - Introduction & Startup**
- *"Hi, this is my submission for the Fault Locator assignment."*
- Show your terminal. Run `docker compose up` from a fresh clone.
- Point out the terminal logs showing the database automatically seeding a synthetic network on boot.

**1:00 - The Live Network**
- Open your localhost (or public URL) in an incognito window.
- Show the visualizer displaying the 1,200 seeded assets. Point out that the data stream is live via SSE and Redis Pub/Sub.

**2:00 - Injecting a Span Fault**
- In the Simulator Panel, select a target pole and click "Run Simulation".
- Show the network map instantly highlighting the downstream outage.
- Draw attention to the Incident Dashboard: *"The localization algorithm successfully identified the boundary edge, generated a ticket, and calculated a confidence score based on topology and corroboration."*

**3:30 - Dead Sensor / Noise Handling**
- Explain how your algorithm handles false positives: *"If a pole drops off the network but its downstream children are still reporting 'live', the system flags it as a 'Sensor exception' (Hardware Issue) rather than triggering a false grid fault ticket."*

**4:00 - Auto-Verification & Repair**
- Click "Repair" on the simulator.
- Watch the frontend instantly clear the fault boundary and return to "Grid is operating normally."
- State: *"The ticket was auto-verified and closed purely from incoming restoration telemetry, requiring no manual operator intervention."*

## Next Steps
Do you want me to write the `Dockerfile`s and the root `docker-compose.yml` so you can pass Gate G2?
