import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { useMapScale } from '../hooks/useMapScale';
import styles from './SVGVisualizer.module.css';

export function SVGVisualizer() {
  const { gridState, activeIncidents, selectedTargetId, selectedContextDtId, setSelectedTargetId, setSelectedContextDtId } = useStore();
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 620 });
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => setSize({ width: host.clientWidth, height: host.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);

    const preventNativeZoom = (e: WheelEvent) => e.preventDefault();
    host.addEventListener('wheel', preventNativeZoom, { passive: false });

    return () => {
      observer.disconnect();
      host.removeEventListener('wheel', preventNativeZoom);
    };
  }, []);

  const { scaleX, scaleY } = useMapScale(gridState, size.width, size.height, 54);
  const polesById = useMemo(() => new Map(gridState?.poles.map(pole => [pole.id, pole])), [gridState]);
  const dtsById = useMemo(() => new Map(gridState?.dts.map(dt => [dt.id, dt])), [gridState]);
  const faultPoleIds = useMemo(() => new Set(activeIncidents?.incidents.flatMap(incident => incident.affectedPoles) ?? []), [activeIncidents]);

  if (!gridState) return <div ref={hostRef} className={styles.loadingContainer}><span className={styles.spinner} />Establishing secure data stream…</div>;
  const getPoleClass = (state: string, id: string) => faultPoleIds.has(id) ? styles.faultPole : state === 'live' ? styles.livePole : state === 'dark' ? styles.darkPole : styles.unknownPole;

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    const scaleChange = e.deltaY * -0.001;
    const newK = Math.min(Math.max(view.k * (1 + scaleChange), 0.5), 10);
    const pointerX = (e.nativeEvent.offsetX - view.x) / view.k;
    const pointerY = (e.nativeEvent.offsetY - view.y) / view.k;
    setView({
      x: e.nativeEvent.offsetX - pointerX * newK,
      y: e.nativeEvent.offsetY - pointerY * newK,
      k: newK
    });
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // Only left click pan
    setIsDragging(true);
    dragStart.current = { x: e.clientX - view.x, y: e.clientY - view.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setView(v => ({ ...v, x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }));
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const zoomCenter = (factor: number) => {
    setView(v => {
      const newK = Math.min(Math.max(v.k * factor, 0.5), 10);
      const centerX = size.width / 2;
      const centerY = size.height / 2;
      const pointerX = (centerX - v.x) / v.k;
      const pointerY = (centerY - v.y) / v.k;
      return { x: centerX - pointerX * newK, y: centerY - pointerY * newK, k: newK };
    });
  };

  return (
    <div ref={hostRef} className={styles.mapHost}>
      <div className={styles.zoomControls}>
        <button className={styles.zoomButton} onClick={() => zoomCenter(1.5)} title="Zoom In">+</button>
        <button className={styles.zoomButton} onClick={() => zoomCenter(1/1.5)} title="Zoom Out">−</button>
        <button className={styles.zoomButton} onClick={() => setView({ x: 0, y: 0, k: 1 })} title="Reset Zoom">⟲</button>
      </div>
      <svg 
        viewBox={`0 0 ${size.width} ${size.height}`} 
        preserveAspectRatio="none" 
        className={styles.svgCanvas} 
        role="img" 
        aria-label="Interactive grid topology"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        <defs>
          <filter id="faultGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
          <g className={styles.edges}>
            {gridState.edges.map((edge, index) => {
              if (!edge.parentPoleId) return null;
              const child = polesById.get(edge.childPoleId);
              const parent = polesById.get(edge.parentPoleId) ?? dtsById.get(edge.parentPoleId);
              if (!child || !parent) return null;
              const classes = `${styles.edge} ${edge.topologySource === 'surveyed' ? styles.surveyed : edge.topologySource === 'inferred_ambiguous' ? styles.ambiguous : styles.inferred}`;
              return <line key={`${edge.childPoleId}-${index}`} className={classes} x1={scaleX(parent.lon)} y1={scaleY(parent.lat)} x2={scaleX(child.lon)} y2={scaleY(child.lat)} />;
            })}
          </g>
          <g>
            {gridState.dts.map(dt => <rect key={dt.id} className={`${styles.transformer} ${selectedContextDtId === dt.id ? styles.selectedTransformer : ''}`} x={scaleX(dt.lon) - 4} y={scaleY(dt.lat) - 4} width="8" height="8" rx="1.5" onPointerDown={(e) => e.stopPropagation()} onClick={() => setSelectedContextDtId(dt.id)}><title>{`Transformer ${dt.id}\nCapacity: ${dt.capacityKva} kVA`}</title></rect>)}
            {gridState.poles.map(pole => <circle key={pole.id} className={`${styles.pole} ${getPoleClass(pole.state, pole.id)} ${selectedTargetId === pole.id ? styles.selectedPole : ''}`} cx={scaleX(pole.lon)} cy={scaleY(pole.lat)} r={faultPoleIds.has(pole.id) ? 3.1 : selectedTargetId === pole.id ? 3.2 : 1.75} filter={faultPoleIds.has(pole.id) ? 'url(#faultGlow)' : undefined} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setSelectedTargetId(pole.id); setSelectedContextDtId(pole.dtId); }}><title>{`Pole ${pole.id}\nStatus: ${pole.state}\nTransformer: ${pole.dtId}`}</title></circle>)}
          </g>
        </g>
      </svg>
    </div>
  );
}
