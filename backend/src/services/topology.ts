// backend/src/services/topology.ts

export type TopologyEdge = {
  parentPoleId: string | 'DT_ROOT';
  childPoleId: string;
  topologySource: 'surveyed' | 'inferred' | 'inferred_ambiguous';
  distanceMeters: number;
};

export type Point = {
  lat: number;
  lon: number;
};

export type PoleData = {
  id: string;
  lat: number;
  lon: number;
  parentPoleId: string | null;
  seqOnLine: number | null;
};

// Haversine distance
export function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getTopology(dtId: string, dtCoords: Point, poles: PoleData[]): TopologyEdge[] {
  if (poles.length === 0) return [];

  // Check if surveyed (all poles have seqOnLine)
  // According to our constraints, a DT is either entirely surveyed or entirely inferred.
  const isSurveyed = poles.every(p => p.seqOnLine !== null);

  if (isSurveyed) {
    // Surveyed Path
    return poles.map(pole => {
      let parentPoleId = pole.parentPoleId;
      // If seqOnLine is 1, it's directly connected to the DT
      if (!parentPoleId || pole.seqOnLine === 1) {
        parentPoleId = 'DT_ROOT';
      }
      return {
        parentPoleId,
        childPoleId: pole.id,
        topologySource: 'surveyed',
        distanceMeters: parentPoleId === 'DT_ROOT' 
          ? distanceInMeters(dtCoords.lat, dtCoords.lon, pole.lat, pole.lon)
          : distanceInMeters(
              poles.find(p => p.id === parentPoleId)!.lat,
              poles.find(p => p.id === parentPoleId)!.lon,
              pole.lat,
              pole.lon
            )
      };
    });
  } else {
    // Inferred Path (MST via Prim's Algorithm)
    const edges: TopologyEdge[] = [];
    const unvisited = new Set(poles.map(p => p.id));
    const visited = new Set<string>();

    // We consider DT_ROOT as our starting visited node.
    visited.add('DT_ROOT');

    // Create a map for quick pole lookup
    const poleMap = new Map<string, Point>();
    poleMap.set('DT_ROOT', dtCoords);
    poles.forEach(p => poleMap.set(p.id, { lat: p.lat, lon: p.lon }));

    while (unvisited.size > 0) {
      let bestEdge: { u: string; v: string; dist: number } | null = null;
      let secondBestDist = Infinity;

      for (const u of visited) {
        const uCoords = poleMap.get(u)!;
        for (const v of unvisited) {
          const vCoords = poleMap.get(v)!;
          const dist = distanceInMeters(uCoords.lat, uCoords.lon, vCoords.lat, vCoords.lon);

          if (!bestEdge || dist < bestEdge.dist) {
            // The old best edge's distance becomes a candidate for second best
            if (bestEdge && bestEdge.v === v) { // same target node, different source
               if (bestEdge.dist < secondBestDist) {
                   secondBestDist = bestEdge.dist;
               }
            } else if (bestEdge) {
               // We only care about the second best edge to the *same* v if we were picking v,
               // but actually Prim's picks the globally smallest edge. The ambiguity is about
               // whether the chosen `v` has multiple equidistant parents in `visited`.
               // So let's re-evaluate second best distance after finding the absolute best edge.
            }
            bestEdge = { u, v, dist };
          }
        }
      }

      if (!bestEdge) break; // Should not happen if graph is fully connected

      // To properly find ambiguity, we look at the chosen `v` and see its distances to all `visited` nodes.
      const chosenV = bestEdge.v;
      const chosenVCoords = poleMap.get(chosenV)!;
      let min1 = Infinity;
      let min2 = Infinity;

      for (const u of visited) {
        const uCoords = poleMap.get(u)!;
        const d = distanceInMeters(uCoords.lat, uCoords.lon, chosenVCoords.lat, chosenVCoords.lon);
        if (d < min1) {
          min2 = min1;
          min1 = d;
        } else if (d < min2) {
          min2 = d;
        }
      }

      const isAmbiguous = (min2 - min1) <= 3.0;

      edges.push({
        parentPoleId: bestEdge.u,
        childPoleId: chosenV,
        topologySource: isAmbiguous ? 'inferred_ambiguous' : 'inferred',
        distanceMeters: bestEdge.dist
      });

      visited.add(chosenV);
      unvisited.delete(chosenV);
    }

    return edges;
  }
}
