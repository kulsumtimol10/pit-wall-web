import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, Vector3 } from 'three';
import type { LapSamples } from './data-types';
import { valueAtFraction } from './telemetry';

/** Heights are stretched so elevation reads clearly; the UI says so. */
export const ELEVATION_SCALE = 3;

export type Vec3 = [number, number, number];

export const UP = new Vector3(0, 1, 0);

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

/**
 * A smooth closed spline through one lap. The lap's last sample sits on the
 * start line again, so it is dropped to close the loop cleanly. Positions
 * along it are read by arc length (getPointAt), which matches lap fraction.
 */
export function trackCurve(s: LapSamples, f: TrackFrame): CatmullRomCurve3 {
  const points = lapPoints(s, f)
    .slice(0, -1)
    .map(([x, y, z]) => new Vector3(x, y, z));
  const curve = new CatmullRomCurve3(points, true, 'centripetal');
  curve.arcLengthDivisions = 4000;
  curve.updateArcLengths();
  return curve;
}

/** Red under braking, otherwise purple (slowest) to cyan (fastest point of the lap). */
export function speedColourAt(s: LapSamples, fraction: number, out: Color, range: [number, number]): Color {
  if (valueAtFraction(s, 'brake', fraction) >= 50) return out.copy(BRAKE_COLOUR);
  const v = valueAtFraction(s, 'speed', fraction);
  return out.lerpColors(SLOW_COLOUR, FAST_COLOUR, (v - range[0]) / (range[1] - range[0] || 1));
}

export interface Ribbon {
  geometry: BufferGeometry;
  /** Points along the left and right edges, for drawing the track limits */
  left: Vector3[];
  right: Vector3[];
}

/** A flat track surface `width` metres wide following the curve, coloured by the lap's speed. */
export function buildRibbon(curve: CatmullRomCurve3, s: LapSamples, width: number, segments: number): Ribbon {
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const colours = new Float32Array((segments + 1) * 2 * 3);
  const indices: number[] = [];
  const left: Vector3[] = [];
  const right: Vector3[] = [];
  const p = new Vector3();
  const tangent = new Vector3();
  const side = new Vector3();
  const colour = new Color();
  const range: [number, number] = [Math.min(...s.speed), Math.max(...s.speed)];

  for (let i = 0; i <= segments; i++) {
    const u = (i / segments) % 1;
    curve.getPointAt(u, p);
    curve.getTangentAt(u, tangent);
    side.crossVectors(tangent, UP).normalize().multiplyScalar(width / 2);
    const l = p.clone().add(side);
    const r = p.clone().sub(side);
    left.push(l);
    right.push(r);
    positions.set([l.x, l.y, l.z, r.x, r.y, r.z], i * 6);
    speedColourAt(s, i / segments, colour, range);
    colours.set([colour.r, colour.g, colour.b, colour.r, colour.g, colour.b], i * 6);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  geometry.setIndex(indices);
  return { geometry, left, right };
}

/** 100.562 → "1:40.562" */
export function formatLapTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds - m * 60).toFixed(3).padStart(6, '0');
  return `${m}:${s}`;
}

/** 36.51 → "0:36.5" */
export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds - m * 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}
