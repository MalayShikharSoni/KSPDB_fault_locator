# Pan & Zoom Implementation Walkthrough

## What was changed?
- **Interactive SVG**: Replaced the static `<svg>` container with an interactive view utilizing React State for `view.x`, `view.y`, and `view.k` (scale).
- **Mouse Wheel Zoom**: Implemented the `onWheel` handler with coordinate math to ensure zooming scales directly toward your mouse pointer's current location, just like Google Maps.
- **Click & Drag Pan**: Intercepted pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`) to allow clicking on the background to drag the map around.
- **UI Controls**: Added a floating top-right control panel with explicit `+`, `-`, and `Reset` buttons for operators using trackpads or touchscreens without scroll wheels.

## Verification
- `npm run build` was executed successfully to ensure there are no strict TypeScript or JSX errors before deployment.
- The `pointer-events: none` css rule on edges ensures they don't intercept drag clicks, and `e.stopPropagation()` was added to node clicks so selecting a node doesn't accidentally trigger a map drag.

Your grid UI is now fully explorable!
