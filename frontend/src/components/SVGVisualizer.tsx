import React, { useMemo } from 'react';
import { useStore } from '../store';
import { useMapScale } from '../hooks/useMapScale';

export function SVGVisualizer() {
  const { gridState, activeIncidents } = useStore();
  const width = window.innerWidth;
  const height = window.innerHeight;

  const { scaleX, scaleY } = useMapScale(gridState, width, height, 50);

  // Quick lookup to see if an edge or pole is part of an active fault incident
  const faultPoleIds = useMemo(() => {
    const set = new Set<string>();
    if (!activeIncidents) return set;
    
    activeIncidents.incidents.forEach(inc => {
      inc.affectedPoles.forEach(p => set.add(p.id));
    });
    return set;
  }, [activeIncidents]);

  if (!gridState) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-gray-400">
        Connecting to stream...
      </div>
    );
  }

  const getPoleColor = (state: string, id: string) => {
    if (faultPoleIds.has(id)) return '#ef4444'; // Red for faults
    if (state === 'live') return '#22c55e'; // Green
    if (state === 'dark') return '#ef4444'; // Red
    return '#9ca3af'; // Gray unknown
  };

  return (
    <svg width={width} height={height} className="bg-gray-950 absolute inset-0 -z-10">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#4b5563" />
        </marker>
      </defs>

      {/* Draw Edges */}
      {gridState.edges.map((edge, i) => {
        if (!edge.parentPoleId) return null; // Parent is DT, handled similarly but DT coordinates aren't in pole lookup.
        
        const childPole = gridState.poles.find(p => p.id === edge.childPoleId);
        // If parent is a pole
        let parentNode = gridState.poles.find(p => p.id === edge.parentPoleId) as any;
        // If parent is not a pole, it might be a DT
        if (!parentNode) {
          parentNode = gridState.dts.find(d => d.id === edge.parentPoleId);
        }

        if (!childPole || !parentNode) return null;

        const x1 = scaleX(parentNode.lon);
        const y1 = scaleY(parentNode.lat);
        const x2 = scaleX(childPole.lon);
        const y2 = scaleY(childPole.lat);

        const isSurveyed = edge.topologySource === 'surveyed';
        const isAmbiguous = edge.topologySource === 'inferred_ambiguous';

        return (
          <line
            key={`edge-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#4b5563"
            strokeWidth="2"
            strokeDasharray={isSurveyed ? "none" : (isAmbiguous ? "4 4" : "8 4")}
            opacity={0.6}
          />
        );
      })}

      {/* Draw DTs */}
      {gridState.dts.map(dt => (
        <rect
          key={dt.id}
          x={scaleX(dt.lon) - 8}
          y={scaleY(dt.lat) - 8}
          width="16"
          height="16"
          fill="#3b82f6" // Blue for DT
          stroke="#1e3a8a"
          strokeWidth="2"
        />
      ))}

      {/* Draw Poles */}
      {gridState.poles.map(pole => (
        <circle
          key={pole.id}
          cx={scaleX(pole.lon)}
          cy={scaleY(pole.lat)}
          r="4"
          fill={getPoleColor(pole.state, pole.id)}
          stroke="#1f2937"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
