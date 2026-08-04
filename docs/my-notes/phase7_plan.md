# Phase 7: Building the React/Vite Frontend

This phase focuses on building the frontend client to consume our Phase 6 API, specifically highlighting a custom SVG visualizer instead of relying on external graph libraries.

## Proposed Changes

### 1. Project Initialization & Tooling
- We will create a new Vite project in the `/frontend` directory: `npx create-vite frontend --template react-ts`.
- Install dependencies: `zustand` (global state), `axios` (API fetching), `lucide-react` (icons for the control panel/dashboard), and `tailwindcss` (for rapid styling of panels).
- Configure Vite proxy to route `/api` to our backend on port `3000`.

### 2. Global State Store (`store.ts`)
- Implement a Zustand store holding two primary state slices:
  - `gridState`: The raw `{ dts, poles, edges }` fetched from `/api/grid/state`.
  - `activeIncidents`: The raw `{ incidents, hardwareIssues }` fetched from `/api/incidents/active`.
- Expose methods `fetchGridState()` and `fetchIncidents()` to trigger API calls.
- Implement an initialization hook that runs these on mount and sets up a lightweight polling interval (e.g., every 3-5 seconds) to keep the UI reactive.

### 3. Component Architecture
- **`App.tsx`**: Main layout container (Grid Visualizer taking up most of the screen, with absolute positioned floating panels).
- **`components/SVGVisualizer.tsx`**: The core component. 
  - Computes the bounding box (min/max lat/lon) of all DTs and poles.
  - Normalizes the geographic coordinates into a scaled 2D coordinate system suitable for SVG (e.g., mapping to a 800x800 viewBox).
  - Iterates over `edges` to draw `<line>` primitives. Applies `stroke-dasharray` if `topologySource` is 'inferred' or 'inferred_ambiguous'.
  - Iterates over `dts` to draw `<rect>` primitives (larger, square shape).
  - Iterates over `poles` to draw `<circle>` primitives. Sets `fill` based on the pole's state (`live` -> green, `dark` -> red, `unknown` -> gray). Highlights poles if they are part of an active fault boundary.
- **`components/SimulatorPanel.tsx`**: A floating sidebar/panel.
  - Dropdowns to select target ID (Span, DT, Feeder).
  - Buttons to trigger `POST /api/simulate/fault` and `POST /api/simulate/repair`.
- **`components/IncidentDashboard.tsx`**: A reactive sidebar.
  - Maps over `activeIncidents.incidents` and `hardwareIssues`.
  - Displays boundary IDs, downstream count, and the v1 confidence score.

### 4. Custom SVG Implementation Details
- To render standard Lat/Lon data on a 2D screen, we need an affine transformation function. I will build a hook `useMapScale` that reads the extrema of the coordinates and provides a scaling function `(lat, lon) => { x, y }`.
- We will support basic SVG panning and zooming by wrapping the main `<svg>` group in a transform that listens to mouse wheel and drag events (or just keep it auto-scaled to fit the viewport for the MVP).

## Verification Plan

### Automated Tests
- While testing complex SVG geometry in Jest/Vitest is difficult, we can test the state management.
- I will write unit tests for the Zustand store to ensure it parses the API responses correctly.
- I will also write tests for the coordinate scaling utility to ensure the bounding box normalization works flawlessly.

### Commit Workflow (Acknowledged)
- *Acknowledged Instruction:* "Moving forward, whenever you write tests that pass deterministically and you propose a commit message to wrap up a unit of work, you must automatically execute the commit and push the changes to the repository."
