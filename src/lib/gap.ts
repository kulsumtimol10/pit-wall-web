import type { LapSamples } from './data-types';
import { timeAtFraction } from './telemetry';

/**
 * How far car B is behind car A at each point of the lap, in seconds
 * (negative = B ahead). Index i is the point i / (length - 1) of the lap.
 *
 * Raw differences jitter by a few hundredths because positions arrive only
 * ~3.7 times a second, so the profile is smoothed with a centred moving
 * average. The window shrinks near the ends so the start (0) and the final
 * gap (B's lap time minus A's) are kept exactly.
 */
export function buildGapProfile(a: LapSamples, b: LapSamples, points = 1001, halfWindow = 15): Float64Array {
  const raw = new Float64Array(points);
  for (let i = 0; i < points; i++) {
    const f = i / (points - 1);
    raw[i] = timeAtFraction(b, f) - timeAtFraction(a, f);
  }
  const smooth = new Float64Array(points);
  for (let i = 0; i < points; i++) {
    const h = Math.min(halfWindow, i, points - 1 - i);
    let sum = 0;
    for (let j = i - h; j <= i + h; j++) sum += raw[j];
    smooth[i] = sum / (2 * h + 1);
  }
  return smooth;
}

/** The gap at a fraction (0-1) of the lap, interpolated from a profile. */
export function gapAtFraction(profile: Float64Array, fraction: number): number {
  const x = Math.min(1, Math.max(0, fraction)) * (profile.length - 1);
  const i = Math.min(Math.floor(x), profile.length - 2);
  return profile[i] + (profile[i + 1] - profile[i]) * (x - i);
}
