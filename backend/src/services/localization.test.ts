import { describe, it, expect } from 'vitest';
import { localizeFaults, PoleState } from './localization';
import { TopologyEdge } from './topology';

describe('Localization Algorithm Logic', () => {
  // Common tree structure:
  // DT_ROOT -> P1 -> P2 -> P3
  // P1 -> P4 -> P5
  const topology: TopologyEdge[] = [
    { parentPoleId: 'DT_ROOT', childPoleId: 'P1', topologySource: 'surveyed', distanceMeters: 10 },
    { parentPoleId: 'P1', childPoleId: 'P2', topologySource: 'surveyed', distanceMeters: 10 },
    { parentPoleId: 'P2', childPoleId: 'P3', topologySource: 'surveyed', distanceMeters: 10 },
    { parentPoleId: 'P1', childPoleId: 'P4', topologySource: 'surveyed', distanceMeters: 10 },
    { parentPoleId: 'P4', childPoleId: 'P5', topologySource: 'surveyed', distanceMeters: 10 },
  ];

  it('1. Single Mid-Line Fault', () => {
    // P2 is dark, meaning P2 and P3 are dark. P1, P4, P5 are live.
    const states: Record<string, PoleState> = {
      P1: 'live',
      P2: 'dark',
      P3: 'dark',
      P4: 'live',
      P5: 'live',
    };

    const result = localizeFaults(topology, states);
    
    expect(result.hardwareIssues).toHaveLength(0);
    expect(result.incidents).toHaveLength(1);
    
    const incident = result.incidents[0];
    expect(incident.type).toBe('span_fault');
    expect(incident.boundaryEdge?.childPoleId).toBe('P2');
    expect(incident.affectedPoles).toEqual(expect.arrayContaining(['P2', 'P3']));
    // topology(1.0)*0.4 + corro(1.0)*0.3 + fresh(1.0)*0.2 + clarity(1.0)*0.1 = 1.0
    expect(incident.confidence).toBeCloseTo(1.0, 5);
  });

  it('2. Multiple Simultaneous Faults', () => {
    // P2 is dark (P3 dark). P4 is dark (P5 dark). P1 is live.
    const states: Record<string, PoleState> = {
      P1: 'live',
      P2: 'dark',
      P3: 'dark',
      P4: 'dark',
      P5: 'dark',
    };

    const result = localizeFaults(topology, states);
    
    expect(result.hardwareIssues).toHaveLength(0);
    expect(result.incidents).toHaveLength(2);
    
    const edgeTargets = result.incidents.map(i => i.boundaryEdge?.childPoleId);
    expect(edgeTargets).toContain('P2');
    expect(edgeTargets).toContain('P4');
  });

  it('3. DT Outage', () => {
    // Everything is dark.
    const states: Record<string, PoleState> = {
      P1: 'dark',
      P2: 'dark',
      P3: 'dark',
      P4: 'dark',
      P5: 'dark',
    };

    const result = localizeFaults(topology, states);
    
    expect(result.hardwareIssues).toHaveLength(0);
    expect(result.incidents).toHaveLength(1);
    
    const incident = result.incidents[0];
    expect(incident.type).toBe('dt_fault');
    expect(incident.boundaryEdge).toBeNull();
    expect(incident.affectedPoles.length).toBe(5);
  });

  it('4. Broken Sensor Exception', () => {
    // P2 is dark, but P3 is live. P1, P4, P5 are live.
    const states: Record<string, PoleState> = {
      P1: 'live',
      P2: 'dark',
      P3: 'live',
      P4: 'live',
      P5: 'live',
    };

    const result = localizeFaults(topology, states);
    
    // P2 should be isolated as a hardware issue.
    expect(result.hardwareIssues).toHaveLength(1);
    expect(result.hardwareIssues[0].poleId).toBe('P2');
    
    // There should be NO power incidents.
    expect(result.incidents).toHaveLength(0);
  });

  it('should penalize clarity confidence if boundary involves unknown poles', () => {
    const states: Record<string, PoleState> = {
      P1: 'live',
      P2: 'unknown',
      P3: 'dark',
      P4: 'live',
      P5: 'live',
    };

    const result = localizeFaults(topology, states);
    
    expect(result.hardwareIssues).toHaveLength(0);
    expect(result.incidents).toHaveLength(1);
    
    const incident = result.incidents[0];
    expect(incident.type).toBe('span_fault');
    expect(incident.boundaryEdge?.childPoleId).toBe('P3');
    expect(incident.affectedPoles).toEqual(['P3']);
    expect(incident.confidence).toBeCloseTo(0.95, 5);
  });
});
