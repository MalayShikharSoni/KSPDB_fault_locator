import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMapScale } from './useMapScale';

describe('useMapScale', () => {
  it('should return 0 scale if gridState is null', () => {
    const { result } = renderHook(() => useMapScale(null, 800, 600, 10));
    expect(result.current.scaleX(100)).toBe(0);
    expect(result.current.scaleY(100)).toBe(0);
  });

  it('should scale coordinates correctly within the bounding box', () => {
    const gridState = {
      dts: [
        { lat: 10, lon: 20 },
        { lat: 20, lon: 30 }
      ],
      poles: [],
      edges: []
    } as unknown as import('../store').GridStateData;

    // Width=100, Height=100, padding=0
    // minLat=10, maxLat=20 -> Range=10
    // minLon=20, maxLon=30 -> Range=10

    const { result } = renderHook(() => useMapScale(gridState, 100, 100, 0));

    // scaleX: (lon - minLon)/Range * width
    // scaleX(20) -> (20-20)/10 * 100 = 0
    expect(result.current.scaleX(20)).toBe(0);
    // scaleX(30) -> (30-20)/10 * 100 = 100
    expect(result.current.scaleX(30)).toBe(100);
    // scaleX(25) -> (25-20)/10 * 100 = 50
    expect(result.current.scaleX(25)).toBe(50);

    // scaleY is inverted: height - (lat - minLat)/Range * height
    // scaleY(10) -> 100 - (10-10)/10 * 100 = 100
    expect(result.current.scaleY(10)).toBe(100);
    // scaleY(20) -> 100 - (20-10)/10 * 100 = 0
    expect(result.current.scaleY(20)).toBe(0);
    // scaleY(15) -> 100 - 50 = 50
    expect(result.current.scaleY(15)).toBe(50);
  });
});
