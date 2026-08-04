import { describe, it, expect } from 'vitest';
import { getTopology, distanceInMeters, PoleData, Point } from './topology';

describe('Topology Reconstruction Logic', () => {
  const dtCoords: Point = { lat: 12.9716, lon: 77.5946 };
  
  it('should calculate distance in meters properly', () => {
    const dist = distanceInMeters(0, 0, 1, 0);
    expect(dist).toBeGreaterThan(110000);
    expect(dist).toBeLessThan(112000);
  });

  it('should build surveyed path correctly', () => {
    const poles: PoleData[] = [
      { id: 'P1', lat: 12.97161, lon: 77.5946, parentPoleId: null, seqOnLine: 1 },
      { id: 'P2', lat: 12.97162, lon: 77.5946, parentPoleId: 'P1', seqOnLine: 2 },
      { id: 'P3', lat: 12.97163, lon: 77.5946, parentPoleId: 'P2', seqOnLine: 3 },
    ];
    const edges = getTopology('D-1', dtCoords, poles);
    expect(edges).toHaveLength(3);
    expect(edges.find(e => e.childPoleId === 'P1')?.parentPoleId).toBe('DT_ROOT');
    expect(edges.find(e => e.childPoleId === 'P1')?.topologySource).toBe('surveyed');
    expect(edges.find(e => e.childPoleId === 'P2')?.parentPoleId).toBe('P1');
    expect(edges.find(e => e.childPoleId === 'P2')?.topologySource).toBe('surveyed');
  });

  it('should build inferred path (MST) without ambiguity', () => {
    const poles: PoleData[] = [
      { id: 'P1', lat: 12.9717, lon: 77.5946, parentPoleId: null, seqOnLine: null },
      { id: 'P2', lat: 12.9719, lon: 77.5946, parentPoleId: null, seqOnLine: null },
      { id: 'P3', lat: 12.9722, lon: 77.5946, parentPoleId: null, seqOnLine: null },
    ];
    const edges = getTopology('D-1', dtCoords, poles);
    expect(edges).toHaveLength(3);
    const e1 = edges.find(e => e.childPoleId === 'P1');
    expect(e1?.parentPoleId).toBe('DT_ROOT');
    expect(e1?.topologySource).toBe('inferred');
    const e2 = edges.find(e => e.childPoleId === 'P2');
    expect(e2?.parentPoleId).toBe('P1');
    expect(e2?.topologySource).toBe('inferred');
    const e3 = edges.find(e => e.childPoleId === 'P3');
    expect(e3?.parentPoleId).toBe('P2');
    expect(e3?.topologySource).toBe('inferred');
  });

  it('should tag edge as inferred_ambiguous if two potential parents are within 3m', () => {
    // DT: (12.97160, 77.59460)
    // P1: North 10m
    // P2: East 10m
    // P3: North-East 10m from DT (forms a square)
    // P1 and P2 will connect to DT. P3 will connect to either P1 or P2, but the distance difference is 0.
    const poles: PoleData[] = [
      { id: 'P1', lat: 12.97169, lon: 77.59460, parentPoleId: null, seqOnLine: null },
      { id: 'P2', lat: 12.97160, lon: 77.59469, parentPoleId: null, seqOnLine: null },
      { id: 'P3', lat: 12.97169, lon: 77.59469, parentPoleId: null, seqOnLine: null },
    ];
    const edges = getTopology('D-1', dtCoords, poles);
    
    const p1Edge = edges.find(e => e.childPoleId === 'P1');
    expect(p1Edge?.parentPoleId).toBe('DT_ROOT');
    expect(p1Edge?.topologySource).toBe('inferred');

    const p2Edge = edges.find(e => e.childPoleId === 'P2');
    expect(p2Edge?.parentPoleId).toBe('DT_ROOT');
    expect(p2Edge?.topologySource).toBe('inferred');

    const p3Edge = edges.find(e => e.childPoleId === 'P3');
    expect(p3Edge?.parentPoleId).not.toBe('DT_ROOT');
    expect(p3Edge?.topologySource).toBe('inferred_ambiguous');
  });
});
