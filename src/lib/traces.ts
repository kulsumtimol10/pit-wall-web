import type { LapSamples, Sectors } from './data-types';
import { stateAtTime } from './telemetry';

/** A telemetry channel against distance round the lap: [fraction of the lap, value] per sample. */
export function channelByDistance(s: LapSamples, field: 'speed' | 'throttle'): [number, number][] {
  const lap = s.d[s.d.length - 1];
  return s.d.map((d, i) => [d / lap, s[field][i]]);
}

/** The stretches of the lap, as fractions, where the brake is on. */
export function brakeZones(s: LapSamples): [number, number][] {
  const lap = s.d[s.d.length - 1];
  const zones: [number, number][] = [];
  let start: number | null = null;
  for (let i = 0; i < s.d.length; i++) {
    const on = s.brake[i] >= 50;
    if (on && start === null) start = s.d[i] / lap;
    if (!on && start !== null) {
      zones.push([start, s.d[i] / lap]);
      start = null;
    }
  }
  if (start !== null) zones.push([start, 1]);
  return zones;
}

/** Where sectors 1 and 2 end, as fractions of the lap; null unless both sector times are known. */
export function sectorEnds(s: LapSamples, sectors: Sectors | undefined): [number, number] | null {
  const [s1, s2] = sectors ?? [null, null];
  if (s1 == null || s2 == null) return null;
  return [stateAtTime(s, s1).fraction, stateAtTime(s, s1 + s2).fraction];
}

/** Round-number axis ticks from lo to hi, roughly `count` of them (steps of 1, 2 or 5 × a power of ten). */
export function niceTicks(lo: number, hi: number, count: number): number[] {
  const raw = (hi - lo) / Math.max(1, count);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) ticks.push(Number(t.toFixed(10)));
  return ticks;
}
