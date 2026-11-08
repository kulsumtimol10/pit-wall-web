import { Vector3, type CatmullRomCurve3 } from 'three';
import { UP } from './track';

/** A trackside camera: where it stands and how far round the lap that is (0-1). */
export interface TvSpot {
  fraction: number;
  position: Vector3;
}

/**
 * Trackside cameras spread evenly round the lap, alternating sides of the
 * track, `setBack` metres from the racing line and `height` metres up.
 */
export function tvSpots(curve: CatmullRomCurve3, count: number, setBack: number, height: number): TvSpot[] {
  const p = new Vector3();
  const tangent = new Vector3();
  const side = new Vector3();
  return Array.from({ length: count }, (_, k) => {
    const fraction = (k + 0.5) / count;
    curve.getPointAt(fraction, p);
    curve.getTangentAt(fraction, tangent);
    side.crossVectors(tangent, UP).normalize();
    const position = p.clone().addScaledVector(side, k % 2 ? setBack : -setBack);
    position.y += height;
    return { fraction, position };
  });
}

/**
 * Which trackside camera films the cars: the next one they are heading for,
 * kept until they are `holdPast` (lap fraction) beyond it, then a cut to the
 * one after. Past the last camera it wraps to the first, across the line.
 */
export function activeSpot(spotFractions: number[], focus: number, holdPast: number): number {
  const i = spotFractions.findIndex((f) => f > focus - holdPast);
  return i === -1 ? 0 : i;
}
