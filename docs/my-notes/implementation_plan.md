# Telemetry Worker Loop Bug Fix Plan

## Goal
Fix a critical bug in `backend/src/workers/telemetryWorker.ts` that causes the UI to rapidly flash between active faults and "Grid operating normally" when a fault is simulated.

## Analysis
The user reported that the grid flashes and loops between faults and "normal" states. I have identified the root cause:
When the `telemetryWorker` processes a single telemetry event, it loops over all 12 Distribution Transformers (DTs). Inside this loop, it calls `localizeFaults` for the specific DT, and then **immediately overwrites the global `active_incidents` Redis key** with that single DT's result. It also fires a `state_updates` SSE event. 

Because it iterates over 12 DTs, it fires 12 rapid SSE updates per payload. If DT #1 has a fault but DT #12 does not, the frontend receives the fault state, and a millisecond later, receives an empty state, causing the UI to flicker to "Operating normally". Since a simulation pushes dozens of payloads (one for each affected pole), the frontend is bombarded with hundreds of conflicting SSE updates over a few seconds.

## Proposed Changes

### `backend/src/workers/telemetryWorker.ts`
- **[MODIFY]** Extract the `active_incidents` caching and SSE publishing logic *outside* of the `for (const dtId of dts)` loop.
- **[MODIFY]** Inside the loop, aggregate all `incidents` and `hardwareIssues` from every DT into a master array.
- **[MODIFY]** Once the loop finishes processing all DTs, write the aggregated master list to Redis `active_incidents` and fire a *single* `state_updates` SSE event.

## Verification Plan
1. Apply the fixes to `backend/src/workers/telemetryWorker.ts`.
2. Stop the local `concurrently` process and restart it.
3. Run a new simulation via the UI.
4. Verify that the UI smoothly renders the fault path once and stays solid, without any flickering or looping.
