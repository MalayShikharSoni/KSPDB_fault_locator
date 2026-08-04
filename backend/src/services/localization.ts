import { TopologyEdge } from './topology';

export type PoleState = 'live' | 'dark' | 'unknown';

export type Incident = {
  type: 'dt_fault' | 'span_fault';
  boundaryEdge: TopologyEdge | null;
  affectedPoles: string[];
  confidence: number;
};

export type HardwareIssue = {
  poleId: string;
  reason: string;
};

export type LocalizationResult = {
  incidents: Incident[];
  hardwareIssues: HardwareIssue[];
};

export function localizeFaults(
  topology: TopologyEdge[],
  states: Record<string, PoleState>
): LocalizationResult {
  const incidents: Incident[] = [];
  const hardwareIssues: HardwareIssue[] = [];

  // 1. Build adjacency list
  const childrenMap = new Map<string, string[]>();
  const edgeMap = new Map<string, TopologyEdge>();

  for (const edge of topology) {
    if (!childrenMap.has(edge.parentPoleId)) {
      childrenMap.set(edge.parentPoleId, []);
    }
    childrenMap.get(edge.parentPoleId)!.push(edge.childPoleId);
    edgeMap.set(edge.childPoleId, edge);
  }

  const getState = (id: string) => states[id] || 'unknown';

  // 2. Pre-process: Check for Broken Sensors (dark pole with live children downstream)
  const hasLiveDescendant = new Map<string, boolean>();

  function checkLiveDescendants(node: string): boolean {
    let hasLive = false;
    const children = childrenMap.get(node) || [];
    for (const child of children) {
      const childState = getState(child);
      const childHasLiveDescendant = checkLiveDescendants(child);
      if (childState === 'live' || childHasLiveDescendant) {
        hasLive = true;
      }
    }
    hasLiveDescendant.set(node, hasLive);
    return hasLive;
  }

  const dtChildren = childrenMap.get('DT_ROOT') || [];
  for (const child of dtChildren) {
    checkLiveDescendants(child);
  }

  // 3. Find Broken Sensors
  const brokenSensors = new Set<string>();
  for (const node of Object.keys(states)) {
    if (getState(node) === 'dark' && hasLiveDescendant.get(node)) {
      brokenSensors.add(node);
      hardwareIssues.push({
        poleId: node,
        reason: 'Pole reports dark but has live children downstream',
      });
    }
  }

  // 4. Check for DT-Level Fault
  let allDtChildrenDark = true;
  let hasAnyDark = false;
  for (const child of dtChildren) {
    if (getState(child) === 'live') {
      allDtChildrenDark = false;
      break;
    }
    if (hasLiveDescendant.get(child)) {
      allDtChildrenDark = false;
      break;
    }
    if (getState(child) === 'dark') {
      hasAnyDark = true;
    }
  }

  if (dtChildren.length > 0 && allDtChildrenDark && hasAnyDark) {
    const affectedPoles: string[] = [];
    
    function collectAll(node: string) {
      if (!brokenSensors.has(node) && getState(node) === 'dark') {
        affectedPoles.push(node);
      }
      const children = childrenMap.get(node) || [];
      for (const child of children) {
        collectAll(child);
      }
    }

    for (const child of dtChildren) {
      collectAll(child);
    }

    incidents.push({
      type: 'dt_fault',
      boundaryEdge: null,
      affectedPoles,
      confidence: 1.0, 
    });

    return { incidents, hardwareIssues };
  }

  // 5. DFS for Span Fault Boundaries
  function dfs(node: string) {
    const state = getState(node);

    let effectiveState = state;
    if (brokenSensors.has(node)) {
       effectiveState = 'live'; 
    }

    if (effectiveState === 'dark') {
      const edge = edgeMap.get(node)!;
      const affectedPoles: string[] = [];
      
      function collectDark(n: string) {
        if (!brokenSensors.has(n) && getState(n) === 'dark') {
          affectedPoles.push(n);
        }
        const children = childrenMap.get(n) || [];
        for (const child of children) {
          collectDark(child);
        }
      }

      collectDark(node);

      let topologyConf = 1.0;
      if (edge.topologySource === 'inferred') topologyConf = 0.6;
      if (edge.topologySource === 'inferred_ambiguous') topologyConf = 0.35;

      const corroborationConf = 1.0; 
      const freshnessConf = 1.0; 

      let clarityConf = 1.0;
      const parentState = edge.parentPoleId === 'DT_ROOT' ? 'live' : getState(edge.parentPoleId);
      const childState = getState(edge.childPoleId);
      if (parentState === 'unknown' && childState === 'unknown') clarityConf = 0.2;
      else if (parentState === 'unknown' || childState === 'unknown') clarityConf = 0.5;

      const confidence = 
        0.4 * topologyConf + 
        0.3 * corroborationConf + 
        0.2 * freshnessConf + 
        0.1 * clarityConf;

      incidents.push({
        type: 'span_fault',
        boundaryEdge: edge,
        affectedPoles,
        confidence,
      });

      return;
    }

    const children = childrenMap.get(node) || [];
    for (const child of children) {
      dfs(child);
    }
  }

  for (const child of dtChildren) {
    dfs(child);
  }

  return { incidents, hardwareIssues };
}
