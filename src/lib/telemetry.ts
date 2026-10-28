import type { LapSamples } from './data-types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Index of the last element of an ascending array that is <= value (0 when value is before the start). */
export function floorIndex(sorted: number[], value: number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (sorted[mid] <= value) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Index i and blend k so that axis[i] + (axis[i+1] - axis[i]) * k = value, clamped to the axis. */
function bracket(axis: number[], value: number): [number, number] {
  const v = clamp(value, axis[0], axis[axis.length - 1]);
  const i = Math.min(floorIndex(axis, v), axis.length - 2);
  const span = axis[i + 1] - axis[i];
  return [i, span > 0 ? (v - axis[i]) / span : 0];
}

const lerpAt = (values: number[], i: number, k: number) => values[i] + (values[i + 1] - values[i]) * k;

export interface CarState {
  /** Seconds into the lap, clamped to the lap */
  t: number;
  /** Metres from the start line */
  distance: number;
  /** 0 at the start line, 1 at the finish */
  fraction: number;
  speed: number;
  gear: number;
  throttle: number;
  brake: number;
  finished: boolean;
}

/** Where the car is and what it is doing t seconds into its lap. */
export function stateAtTime(s: LapSamples, t: number): CarState {
  const lapTime = s.t[s.t.length - 1];
  const [i, k] = bracket(s.t, t);
  const distance = lerpAt(s.d, i, k);
  return {
    t: clamp(t, 0, lapTime),
    distance,
    fraction: distance / s.d[s.d.length - 1],
    speed: lerpAt(s.speed, i, k),
    gear: s.gear[k < 1 ? i : i + 1],
    throttle: lerpAt(s.throttle, i, k),
    brake: s.brake[i],
    finished: t >= lapTime,
  };
}

/** Seconds into the lap at which the car reached a fraction (0-1) of its lap distance. */
export function timeAtFraction(s: LapSamples, fraction: number): number {
  const [i, k] = bracket(s.d, clamp(fraction, 0, 1) * s.d[s.d.length - 1]);
  return lerpAt(s.t, i, k);
}

/** A telemetry channel's value at a fraction (0-1) of the lap distance. */
export function valueAtFraction(s: LapSamples, channel: 'speed' | 'throttle' | 'brake', fraction: number): number {
  const [i, k] = bracket(s.d, clamp(fraction, 0, 1) * s.d[s.d.length - 1]);
  return lerpAt(s[channel], i, k);
}
