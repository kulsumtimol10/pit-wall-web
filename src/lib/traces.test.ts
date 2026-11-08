import { describe, expect, it } from 'vitest';
import type { LapSamples } from './data-types';
import { brakeZones, channelByDistance, niceTicks, sectorEnds } from './traces';

/** A 1000 m lap at a steady 100 m every 5 s, with the brake on where given. */
function lap(brake: number[]): LapSamples {
  const n = brake.length;
  const d = Array.from({ length: n }, (_, i) => (1000 * i) / (n - 1));
  const zeros = Array(n).fill(0);
  return { t: d.map((m) => m / 20), d, x: zeros, y: zeros, z: zeros, speed: d.map((m) => 100 + m / 10), throttle: zeros, brake, gear: zeros, rpm: zeros };
}

describe('channelByDistance', () => {
  it('pairs each value with its fraction of the lap', () => {
    const points = channelByDistance(lap([0, 0, 0, 0, 0]), 'speed');
    expect(points[0]).toEqual([0, 100]);
    expect(points[2]).toEqual([0.5, 150]);
    expect(points[4]).toEqual([1, 200]);
  });
});

describe('brakeZones', () => {
  it('finds each stretch with the brake on', () => {
    expect(brakeZones(lap([0, 100, 100, 0, 0, 100, 0, 0, 0]))).toEqual([
      [0.125, 0.375],
      [0.625, 0.75],
    ]);
  });
  it('closes a zone still open at the line', () => {
    expect(brakeZones(lap([0, 0, 0, 100, 100]))).toEqual([[0.75, 1]]);
  });
});

describe('sectorEnds', () => {
  it('turns sector times into fractions of the lap', () => {
    // 50 s lap: 10 s in, the car is a fifth of the way round; 30 s in, three fifths.
    expect(sectorEnds(lap([0, 0, 0, 0, 0]), [10, 20, 20])).toEqual([0.2, 0.6]);
  });
  it('gives nothing when a sector time is missing', () => {
    expect(sectorEnds(lap([0, 0, 0]), [10, null, 20])).toBeNull();
    expect(sectorEnds(lap([0, 0, 0]), undefined)).toBeNull();
  });
});

describe('niceTicks', () => {
  it('picks round steps', () => {
    expect(niceTicks(50, 350, 3)).toEqual([100, 200, 300]);
    expect(niceTicks(-0.05, 0.4, 3)).toEqual([0, 0.2, 0.4]);
    expect(niceTicks(0, 7, 6)).toEqual([0, 2, 4, 6]);
  });
});
