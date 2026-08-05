# Pan and Zoom Implementation Plan

## Goal
Implement a robust, native interactive zoom and pan feature for the newly updated `SVGVisualizer` component, supporting mouse wheel/touchpad zooming, click-and-drag panning, and physical UI buttons for zoom control.

## User Review Required
- I will wrap your grid elements (edges and nodes) in a master `<g>` tag that applies a CSS transform (`translate` and `scale`).
- I will intercept `wheel` and `pointer` events natively to update the view state.
- I will add a floating control panel (Zoom In, Zoom Out, Reset) in the corner of the visualizer.

## Proposed Changes

### 1. `frontend/src/components/SVGVisualizer.tsx`
- **[MODIFY]** Add state for the transform: `const [view, setView] = useState({ x: 0, y: 0, k: 1 });`
- **[MODIFY]** Add pointer state for dragging: `const [isDragging, setIsDragging] = useState(false);`
- **[MODIFY]** Implement `handleWheel` to calculate zoom centered on the cursor position.
- **[MODIFY]** Implement `handlePointerDown`, `handlePointerMove`, and `handlePointerUp` for click-and-drag panning.
- **[MODIFY]** Wrap the SVG contents (excluding `<defs>`) in `<g transform={\`translate(\${view.x}, \${view.y}) scale(\${view.k})\`}>`.
- **[MODIFY]** Inject an absolutely positioned `div` containing `+`, `-`, and `Reset` buttons.

### 2. `frontend/src/components/SVGVisualizer.module.css`
- **[MODIFY]** Add styles for the zoom control panel (floating bottom-right or top-right, translucent background, modern button hover states).
- **[MODIFY]** Apply `touch-action: none;` to the SVG container to prevent the browser from hijacking scroll/pinch gestures.

## Verification Plan
After implementing, I will run the local Vite dev server and verify:
1. The mouse scroll wheel zooms smoothly in and out without shaking.
2. Clicking and dragging the background pans the grid.
3. Clicking nodes still successfully selects them (drag events do not block click events).
4. The overlay buttons successfully modify the zoom level.

Once you approve this plan, I will execute the React state logic and math!
