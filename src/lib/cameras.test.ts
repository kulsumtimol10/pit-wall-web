import { CatmullRomCurve3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { activeSpot, tvSpots } from './cameras';

describe('activeSpot', () => {
  const spots = [0.1, 0.3, 0.5, 0.7, 0.9];
  it('films the cars from the camera they are heading for', () => {
    expect(activeSpot(spots, 0.05, 0.01)).toBe(0);
    expect(activeSpot(spots, 0.25, 0.01)).toBe(1);
  });
  it('holds the shot just after they pass, then cuts to the next', () => {
    expect(activeSpot(spots, 0.305, 0.01)).toBe(1);
    expect(activeSpot(spots, 0.32, 0.01)).toBe(2);
  });
  it('wraps to the first camera after the last', () => {
    expect(activeSpot(spots, 0.95, 0.01)).toBe(0);
  });
});

describe('tvSpots', () => {
  // A circle of radius 100 round the origin, on the ground.
  const circle = new CatmullRomCurve3(
    Array.from({ length: 32 }, (_, i) => new Vector3(Math.cos((i / 32) * 2 * Math.PI) * 100, 0, Math.sin((i / 32) * 2 * Math.PI) * 100)),
    true,
  );

  it('spreads the cameras round the lap, set back from the track and raised', () => {
    const spots = tvSpots(circle, 4, 30, 20);
    expect(spots.map((s) => s.fraction)).toEqual([0.125, 0.375, 0.625, 0.875]);
    for (const { position } of spots) {
      expect(position.y).toBeCloseTo(20);
      expect(Math.abs(Math.hypot(position.x, position.z) - 100)).toBeCloseTo(30, 0);
    }
  });
  it('alternates sides of the track', () => {
    const [first, second] = tvSpots(circle, 4, 30, 20);
    const inside = (p: Vector3) => Math.hypot(p.x, p.z) < 100;
    expect(inside(first.position)).not.toBe(inside(second.position));
  });
});
