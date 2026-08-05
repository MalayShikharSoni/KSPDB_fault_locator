# Typo & Sync Bug Fixes Plan

## Goal
Fix a series of data mismatch bugs between the backend's localization service and the frontend's React components that cause `undefined` runtime errors in the `IncidentDashboard` and prevent the `SVGVisualizer` from correctly highlighting active fault paths.

## User Review Required
Please review the bugs identified below. Once you approve, I will apply these fixes locally so you can test them before we push to GitHub!

## Proposed Changes

### 1. `backend/src/services/localization.ts`
- **[MODIFY]** The backend's `localizeFaults` function calculates incident factors (topology, corroboration, etc.) but fails to include them in the returned `Incident` objects, which causes the frontend to crash when trying to render them. I will add the missing `factors` payload.
- **[MODIFY]** I will rename the backend's `confidence` field to `confidenceScore` to match what the frontend expects.
- **[MODIFY]** I will generate a unique `id` for each incident so React doesn't complain about missing keys.

### 2. `frontend/src/store.ts`
- **[MODIFY]** Update the frontend `Incident` and `HardwareIssue` interface definitions to accurately reflect the shapes of the data the backend is actually sending (e.g. `affectedPoles` is an array of strings, not objects, and `HardwareIssue` uses `poleId` and `reason`).

### 3. `frontend/src/components/IncidentDashboard.tsx`
- **[MODIFY]** Update the `HardwareIssue` mapping logic to use `item.poleId` and `item.reason` instead of the incorrect array indexing, allowing the UI to render broken sensors correctly.

### 4. `frontend/src/components/SVGVisualizer.tsx`
- **[MODIFY]** Fix the `faultPoleIds` lookup map. Currently, it expects `pole.id`, but because the backend sends an array of string IDs, it resulted in `undefined` and failed to highlight fault boundaries in red.

## Verification Plan
1. Start the React frontend and Node backend.
2. Ensure the UI loads successfully without a React error boundary crash.
3. Run a span interruption simulation.
4. Verify the Incident Dashboard successfully renders the fault boundary, impact size, and topology source without crashing.
5. Verify the `SVGVisualizer` successfully highlights the affected poles in red.
