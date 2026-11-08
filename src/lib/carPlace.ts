import { Vector3, type CatmullRomCurve3 } from 'three';
import { carScale, sideShift } from './carSize';
import type { LapSamples } from './data-types';
import { stateAtTime } from './telemetry';
import { UP } from './track';

/** Where a car is drawn and how big. */
export interface CarPlace {
  position: Vector3;
  /** Direction of travel */
  tangent: Vector3;
  /** Times life size (see carScale) */
  scale: number;
  /** How far round the lap, 0-1 */
  fraction: number;
}

export const newCarPlace = (): CarPlace => ({ position: new Vector3(), tangent: new Vector3(), scale: 1, fraction: 0 });

const side = new Vector3();

/**
 * Where a car is drawn `time` seconds into its lap, seen from `eye`: on the
 * track at its lap fraction, pushed `offset` metres off the racing line (more
 * when the camera is far, see sideShift) and scaled for the camera distance.
 */
export function placeCar(samples: LapSamples, curve: CatmullRomCurve3, offset: number, time: number, eye: Vector3, out: CarPlace): CarPlace {
  const u = Math.min(stateAtTime(samples, time).fraction, 0.99999);
  curve.getPointAt(u, out.position);
  curve.getTangentAt(u, out.tangent);
  out.scale = carScale(eye.distanceTo(out.position));
  side.crossVectors(out.tangent, UP).normalize();
  out.position.addScaledVector(side, sideShift(offset, out.scale));
  out.fraction = u;
  return out;
}
