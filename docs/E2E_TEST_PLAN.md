# End-to-End (E2E) Test Plan

This document outlines the manual verification steps to test the full end-to-end telemetry ingestion, fault localization, and real-time visualization pipeline of the KSPDB Fault Locator.

## Prerequisites
Ensure the full stack is running via the quickstart command:
```bash
cd backend
npm run dev:all
```
Open [http://localhost:5173](http://localhost:5173) in your browser. You should see a stable grid with all poles colored green or gray (unknown state), and the "Grid Stable" indicator in the top right.

---

## Scenario 1: Injecting a Span (Edge) Fault
**Objective**: Verify that a localized line fault correctly identifies the boundary and downstream affected poles, and updates the UI in real-time.

1. **Locate a Target**: In the UI, find a child pole that has a clear parent. Note its ID (e.g., `P-0010`) and its Distribution Transformer context (e.g., `D-0001`).
2. **Inject the Fault**: 
   - Open the **Simulator Control** panel on the left.
   - Set **Fault Type** to `Span (Edge)`.
   - Set **DT ID** to your chosen context (e.g., `D-0001`).
   - Set **Target ID** to the child pole (e.g., `P-0010`).
   - Click **Inject**.
3. **Verify UI Reaction**:
   - The targeted pole and all its downstream children should instantly turn Red on the visualizer.
   - The **Active Incidents** dashboard on the right should pop open.
   - The dashboard should show 1 incident, explicitly listing the Boundary ID (e.g., `edge-P-0005-P-0010`), the number of affected poles, and the Topology Source.
4. **Verify Repair**:
   - Click **Repair** in the Simulator Control panel.
   - Watch the UI instantly return to Green, and the Active Incidents panel revert to "Grid Stable".

---

## Scenario 2: Injecting a DT-Level Fault
**Objective**: Verify the system can handle a massive scale outage originating at the Distribution Transformer level.

1. **Locate a Target**: Pick any DT on the map (the large blue squares). Note its ID (e.g., `D-0002`).
2. **Inject the Fault**:
   - In the **Simulator Control** panel, set **Fault Type** to `Distribution Transformer`.
   - Set **Target ID** to the chosen DT (`D-0002`).
   - Click **Inject**.
3. **Verify UI Reaction**:
   - Every single pole connected to that DT should immediately turn Red.
   - The **Active Incidents** dashboard should show a `DT_FAULT` with a boundary pointing to the DT itself (e.g., `boundary: DT: D-0002`).
   - The impact count should equal the entire sub-network for that DT (~100 poles).
4. **Verify Repair**:
   - Click **Repair**. The entire DT sub-network should turn Green.

---

## Scenario 3: Hardware Exceptions (Broken Sensors)
**Objective**: Verify that the localization engine's DFS isolates localized sensor failures so they don't trigger false line-crew dispatches.

1. *This scenario requires manual API or database manipulation since the Simulator doesn't explicitly have a "break single sensor" button, but you can simulate it by observing the natural noise.*
2. Because our Simulator randomly drops 30% of payloads and completely silences `1.2.x` devices, you may occasionally see a single pole turn Red while its children remain Green. 
3. **Verify UI Reaction**:
   - Look at the **Active Incidents** dashboard. 
   - This pole will NOT be listed under Active Incidents. Instead, it will be caught by the pre-screening logic and listed explicitly under the **Hardware Issues** block at the bottom of the dashboard (with the `Cpu` icon).

---

## Scenario 4: Multiple Simultaneous Faults
**Objective**: Prove that the DFS logic traverses independent branches correctly without merging separate incidents.

1. **Locate Targets**: Find two independent branches on the same DT. Pick a target pole on Branch A (e.g., `P-0020`) and a target pole on Branch B (e.g., `P-0050`).
2. **Inject Faults**:
   - Inject a Span fault at `P-0020`.
   - Wait 2 seconds.
   - Without repairing, inject a second Span fault at `P-0050` (you can do this via an external POST request to `/api/simulate/fault` if the UI disables the inject button while a fault is active).
3. **Verify UI Reaction**:
   - Both branches should highlight Red independently.
   - The **Active Incidents** dashboard should distinctly show **2 separate incidents**, each with their own calculated boundary and confidence score.
