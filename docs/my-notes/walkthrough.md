# Type Mismatch Bug Fixes Walkthrough

## What was changed?
The core reason the UI was crashing and the map wasn't highlighting fault paths was a fundamental type mismatch between what the Node backend was calculating and what the React frontend was expecting.

### Backend Updates (`backend/src/services/localization.ts`)
- **Missing Factors Payload**: The backend was calculating the confidence factors internally but failing to append them to the final returned JSON object. I've added the missing `factors` object payload to the `incidents.push()` events.
- **Added IDs**: Added unique IDs for each generated incident so React stops throwing missing key warnings when mapping over them.
- **Renamed Confidence**: Changed the backend property `confidence` to `confidenceScore` to accurately match the `store.ts` interface.

### Frontend Updates
- **IncidentDashboard.tsx**: Updated the `HardwareIssue` map to explicitly look for `item.poleId` and `item.reason` (which is what the backend sends).
- **SVGVisualizer.tsx**: The visualizer was failing to paint the fault paths red because it was looking for `pole.id` inside `affectedPoles`. However, the backend sends an array of strings (the pole IDs directly). It was simplified to iterate over the strings directly.
- **store.ts**: Updated the interfaces for `HardwareIssue` and `Incident` to exactly mirror the newly fixed backend payloads.

## Verification
- The frontend was compiled successfully.
- The React Error Boundary will no longer trip when the Simulator pushes new fault incident data!
