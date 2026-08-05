import { useMemo } from 'react';
import { useStore } from '../store';
import { useMapScale } from '../hooks/useMapScale';
import styles from './SVGVisualizer.module.css';

export function SVGVisualizer() {
  const { gridState, activeIncidents, selectedTargetId, selectedContextDtId, setSelectedTargetId, setSelectedContextDtId } = useStore();
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
      <div className={styles.loadingContainer}>
        Connecting to stream...
      </div>
    );
  }

  const getPoleColor = (state: string, id: string) => {
    if (faultPoleIds.has(id)) return 'var(--color-red-500)'; // Red for faults
    if (state === 'live') return 'var(--color-green-500)'; // Green
    if (state === 'dark') return 'var(--color-red-500)'; // Red
    return 'var(--color-text-secondary)'; // Gray unknown
  };

  return (
    <svg width={width} height={height} className={styles.svgCanvas}>
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-fault" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Draw Edges */}
      {gridState.edges.map((edge, i) => {
        if (!edge.parentPoleId) return null; 
        
        const childPole = gridState.poles.find(p => p.id === edge.childPoleId);
        let parentNode: { lat: number; lon: number } | undefined = gridState.poles.find(p => p.id === edge.parentPoleId);
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
            stroke="var(--color-text-muted)"
            strokeWidth="1"
            strokeDasharray={isSurveyed ? "none" : (isAmbiguous ? "2 2" : "4 2")}
            opacity={isSurveyed ? 0.4 : 0.2}
          />
        );
      })}

      {gridState.dts.map(dt => {
        const isSelected = selectedContextDtId === dt.id;
        return (
          <rect
            key={dt.id}
            x={scaleX(dt.lon) - 4}
            y={scaleY(dt.lat) - 4}
            width="8"
            height="8"
            rx="2"
            fill="var(--color-blue-500)"
            stroke={isSelected ? "var(--color-text-primary)" : "var(--color-blue-400)"}
            strokeWidth={isSelected ? "2" : "1"}
            filter="url(#glow)"
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedContextDtId(dt.id)}
          >
            <title>{`DT ID: ${dt.id}\nCapacity: ${dt.capacityKva} kVA`}</title>
          </rect>
        );
      })}

      {gridState.poles.map(pole => {
        const isSelected = selectedTargetId === pole.id;
        return (
          <circle
            key={pole.id}
            cx={scaleX(pole.lon)}
            cy={scaleY(pole.lat)}
            r={faultPoleIds.has(pole.id) ? "2.5" : (isSelected ? "3" : "1.5")}
            fill={isSelected ? "var(--color-text-primary)" : getPoleColor(pole.state, pole.id)}
            filter={faultPoleIds.has(pole.id) ? "url(#glow-fault)" : undefined}
            opacity={pole.state === 'unknown' ? 0.5 : 1}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setSelectedTargetId(pole.id);
              setSelectedContextDtId(pole.dtId);
            }}
          >
            <title>{`Pole ID: ${pole.id}\nState: ${pole.state}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}
