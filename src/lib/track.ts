import { Color } from 'three';
import type { LapSamples } from './data-types';

/** Heights are stretched so elevation reads clearly; the UI says so. */
export const ELEVATION_SCALE = 3;

export type Vec3 = [number, number, number];

const BRAKE_COLOUR = new Color('#ff3b3b');
const SLOW_COLOUR = new Color('#a855f7');
const FAST_COLOUR = new Color('#22d3ee');

/** Maps OpenF1 metres (x/y across the map, z up) into the scene (y up), centred on the track. */
export interface TrackFrame {
  cx: number;
  cy: number;
  baseZ: number;
  /** Radius of the track's footprint in metres */
  radius: number;
}

export function trackFrame(s: LapSamples): TrackFrame {
  const minX = Math.min(...s.x);
  const maxX = Math.max(...s.x);
  const minY = Math.min(...s.y);
  const maxY = Math.max(...s.y);
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    baseZ: Math.min(...s.z),
    radius: Math.hypot(maxX - minX, maxY - minY) / 2,
  };
}

export function toScene(f: TrackFrame, x: number, y: number, z: number): Vec3 {
  return [x - f.cx, (z - f.baseZ) * ELEVATION_SCALE, -(y - f.cy)];
}

export function lapPoints(s: LapSamples, f: TrackFrame): Vec3[] {
  return s.t.map((_, i) => toScene(f, s.x[i], s.y[i], s.z[i]));
}

/** Red under braking, otherwise purple (slowest) to cyan (fastest point of the lap). */
export function speedColours(s: LapSamples): Vec3[] {
  const min = Math.min(...s.speed);
  const max = Math.max(...s.speed);
  const c = new Color();
  return s.speed.map((v, i) => {
    if (s.brake[i] > 0) return BRAKE_COLOUR.toArray() as Vec3;
    c.lerpColors(SLOW_COLOUR, FAST_COLOUR, (v - min) / (max - min || 1));
    return c.toArray() as Vec3;
  });
}

export interface LapState {
  position: Vec3;
  speed: number;
  gear: number;
  throttle: number;
  brake: number;
}

/** The car's interpolated state t seconds into the lap. */
export function lapStateAt(s: LapSamples, f: TrackFrame, t: number): LapState {
  const n = s.t.length;
  let i = 0;
  let hi = n - 1;
  while (i < hi - 1) {
    const mid = (i + hi) >> 1;
    if (s.t[mid] <= t) i = mid;
    else hi = mid;
  }
  const span = s.t[i + 1] - s.t[i];
  const k = span > 0 ? Math.min(1, Math.max(0, (t - s.t[i]) / span)) : 0;
  const lerp = (a: number[]) => a[i] + (a[i + 1] - a[i]) * k;
  return {
    position: toScene(f, lerp(s.x), lerp(s.y), lerp(s.z)),
    speed: Math.round(lerp(s.speed)),
    gear: s.gear[i],
    throttle: Math.round(lerp(s.throttle)),
    brake: s.brake[i],
  };
}

/** 100.562 → "1:40.562" */
export function formatLapTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds - m * 60).toFixed(3).padStart(6, '0');
  return `${m}:${s}`;
}
