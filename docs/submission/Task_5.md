# Task 5: Interactive Real-Time Visualization

## Objective
Build a lightweight, zero-dependency frontend capable of rendering the entire 1,200-node electrical grid, highlighting topological structures, and displaying real-time fault boundaries as telemetry data arrives.

## Implementation Details

We utilized **React** (via **Vite**) with **Zustand** for global state management, adhering to a strict "native-first" philosophy.

### Native SSE over Polling
Instead of constantly polling the backend or implementing a heavy WebSocket layer, the frontend establishes a unidirectional **Server-Sent Events (SSE)** connection (`frontend/src/store.ts`). When the backend Redis Pub/Sub fires an update, the Express server pushes the new grid state over the open HTTP socket, allowing the React UI to update instantly with minimal network overhead.

### Custom SVG Math Engine
To avoid the massive bundle sizes of heavy graph libraries like D3 or React Flow, we built a custom pure-SVG rendering engine (`frontend/src/components/SVGVisualizer.tsx`). 
A custom React hook (`useMapScale`) calculates the bounding box of the geographic coordinates and applies a linear **Affine transformation**, perfectly mapping the real-world Lat/Lon matrix onto the pixel dimensions of the user's browser window.

### CSS Modules
The entire UI is styled using pure **CSS Modules** rather than Tailwind or component libraries, proving mastery over native CSS scoping, Flexbox layouts, z-index stacking contexts, and SVG styling.

### Interactive Tooling
The grid is fully interactive. Users can hover over SVG primitives (rendered with dynamic radii and custom glow filters) to inspect real-world Node IDs, and click on branches to automatically populate the React Simulator panel and inject synthetic faults.

### File Links
- [Custom SVG Math Engine](https://github.com/MalayShikharSoni/KSPDB_fault_locator/blob/main/frontend/src/hooks/useMapScale.ts)
- [SVG Visualizer Component](https://github.com/MalayShikharSoni/KSPDB_fault_locator/blob/main/frontend/src/components/SVGVisualizer.tsx)
- [SSE Global Store](https://github.com/MalayShikharSoni/KSPDB_fault_locator/blob/main/frontend/src/store.ts)
