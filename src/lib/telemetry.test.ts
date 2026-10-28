import { describe, expect, it } from 'vitest';
import type { LapSamples } from './data-types';
import { buildGapProfile, gapAtFraction } from './gap';
import { floorIndex, stateAtTime, timeAtFraction, valueAtFraction } from './telemetry';

/** A lap of `metres` driven at constant speed in `seconds`, sampled every second. */
function steadyLap(metres: number, seconds: number): LapSamples {
  const t = Array.from({ length: seconds + 1 }, (_, i) => i);
  const d = t.map((s) => (metres * s) / seconds);
  const kmh = (metres / seconds) * 3.6;
  return {
    t,
    d,
    x: d,
    y: t.map(() => 0),
    z: t.map(() => 0),
    speed: t.map(() => kmh),
    throttle: t.map((s) => (s < seconds / 2 ? 100 : 50)),
    brake: t.map(() => 0),
    gear: t.map((s) => (s < seconds / 2 ? 7 : 8)),
    rpm: t.map(() => 11000),
  };
}

describe('floorIndex', () => {
  it('finds the last element <= value and clamps before the start', () => {
    expect(floorIndex([0, 1, 2, 3], 2.5)).toBe(2);
    expect(floorIndex([0, 1, 2, 3], 3)).toBe(3);
    expect(floorIndex([0, 1, 2, 3], -1)).toBe(0);
  });
});

describe('stateAtTime', () => {
  const lap = steadyLap(1000, 10);
  it('interpolates distance and fraction', () => {
    const s = stateAtTime(lap, 2.5);
    expect(s.distance).toBeCloseTo(250);
    expect(s.fraction).toBeCloseTo(0.25);
    expect(s.finished).toBe(false);
  });
  it('holds at the finish once the lap is over', () => {
    const s = stateAtTime(lap, 99);
    expect(s.fraction).toBe(1);
    expect(s.t).toBe(10);
    expect(s.finished).toBe(true);
  });
  it('steps gear instead of blending it', () => {
    expect(stateAtTime(lap, 4.9).gear).toBe(7);
    expect(stateAtTime(lap, 5).gear).toBe(8);
  });
});

describe('timeAtFraction / valueAtFraction', () => {
  const lap = steadyLap(1000, 10);
  it('inverts distance back to time', () => {
    expect(timeAtFraction(lap, 0.5)).toBeCloseTo(5);
    expect(timeAtFraction(lap, 1)).toBeCloseTo(10);
  });
  it('reads a channel by lap fraction', () => {
    expect(valueAtFraction(lap, 'throttle', 0.25)).toBeCloseTo(100);
  });
});

describe('gap profile', () => {
  const a = steadyLap(1000, 10);
  const b = steadyLap(1000, 11);
  const profile = buildGapProfile(a, b, 101, 5);
  it('starts level and ends at the lap time difference', () => {
    expect(profile[0]).toBeCloseTo(0);
    expect(profile[100]).toBeCloseTo(1);
  });
  it('grows steadily for a steadily slower car', () => {
    expect(gapAtFraction(profile, 0.5)).toBeCloseTo(0.5);
    expect(gapAtFraction(profile, 0.25)).toBeCloseTo(0.25);
  });
  it('is negative when B is quicker', () => {
    expect(gapAtFraction(buildGapProfile(b, a, 101, 5), 0.5)).toBeCloseTo(-0.5);
  });
});
