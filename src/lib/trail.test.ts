import { describe, expect, it } from 'vitest';
import { speedRange, trailBrightness, trailWindow } from './trail';

describe('trailWindow', () => {
  it('covers the given distance behind the car', () => {
    const [tail, head] = trailWindow(0.5, 7000, 700);
    expect(head).toBe(0.5);
    expect(tail).toBeCloseTo(0.4);
  });
  it('starts at the line early in the lap', () => {
    expect(trailWindow(0.05, 7000, 700)).toEqual([0, 0.05]);
    expect(trailWindow(0, 7000, 700)).toEqual([0, 0]);
  });
  it('stops just short of the finish, where the closed track wraps round', () => {
    const [, head] = trailWindow(1, 7000, 700);
    expect(head).toBeLessThan(1);
  });
});

describe('trailBrightness', () => {
  it('fades in from dark at the tail', () => {
    expect(trailBrightness(0, 160)).toBe(0);
    expect(trailBrightness(40, 160)).toBeLessThan(trailBrightness(80, 160));
  });
  it('stays at true colour (1 or less) until the head, which glows past 1', () => {
    for (let i = 0; i < 147; i++) expect(trailBrightness(i, 160)).toBeLessThanOrEqual(1);
    expect(trailBrightness(159, 160)).toBeCloseTo(1.8);
  });
});

describe('speedRange', () => {
  it('spans every lap', () => {
    expect(speedRange([{ speed: [90, 300] }, { speed: [80, 330, 120] }])).toEqual([80, 330]);
  });
});
