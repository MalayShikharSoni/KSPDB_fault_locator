import { useMemo } from 'react';
import { GridStateData } from '../store';

export function useMapScale(gridState: GridStateData | null, width: number, height: number, padding: number = 40) {
  return useMemo(() => {
    if (!gridState || (gridState.dts.length === 0 && gridState.poles.length === 0)) {
      return {
        scaleX: () => 0,
        scaleY: () => 0,
      };
    }

    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;

    const checkPoint = (lat: number, lon: number) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    };

    gridState.dts.forEach(dt => checkPoint(dt.lat, dt.lon));
    gridState.poles.forEach(p => checkPoint(p.lat, p.lon));

    // To prevent divide-by-zero if there's only one point
    if (maxLat === minLat) { maxLat += 0.001; minLat -= 0.001; }
    if (maxLon === minLon) { maxLon += 0.001; minLon -= 0.001; }

    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;

    // Use a flat linear projection to 2D svg coordinates
    // SVG origin (0,0) is top-left, so we invert Y (latitude)
    const scaleX = (lon: number) => {
      const normalized = (lon - minLon) / lonRange;
      return padding + normalized * (width - 2 * padding);
    };

    const scaleY = (lat: number) => {
      const normalized = (lat - minLat) / latRange;
      return height - padding - normalized * (height - 2 * padding);
    };

    return { scaleX, scaleY };
  }, [gridState, width, height, padding]);
}
