import { describe, expect, it } from 'vitest';
import { fingerAngle, pullInside, turnBetween } from './gestures';

describe('fingerAngle', () => {
  it('measures clockwise on screen as positive', () => {
    expect(fingerAngle({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0);
    expect(fingerAngle({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(Math.PI / 2);
  });
});

describe('turnBetween', () => {
  it('gives the short way round', () => {
    expect(turnBetween(0.1, 0.3)).toBeCloseTo(0.2);
    expect(turnBetween(0.3, 0.1)).toBeCloseTo(-0.2);
  });
  it('does not spin when the angle crosses ±180°', () => {
    expect(turnBetween(Math.PI - 0.05, -Math.PI + 0.05)).toBeCloseTo(0.1);
    expect(turnBetween(-Math.PI + 0.05, Math.PI - 0.05)).toBeCloseTo(-0.1);
  });
});

describe('pullInside', () => {
  it('leaves points inside the circle alone', () => {
    expect(pullInside(3, 4, 5)).toEqual([0, 0]);
  });
  it('pulls points outside straight back to the edge', () => {
    const [sx, sz] = pullInside(6, 8, 5);
    expect(sx).toBeCloseTo(-3);
    expect(sz).toBeCloseTo(-4);
    expect(Math.hypot(6 + sx, 8 + sz)).toBeCloseTo(5);
  });
});
