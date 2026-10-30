export interface ScreenPoint {
  x: number;
  y: number;
}

/** Angle of the line from one finger to another, in radians (screen y points down, so clockwise is positive). */
export const fingerAngle = (a: ScreenPoint, b: ScreenPoint) => Math.atan2(b.y - a.y, b.x - a.x);

/** The smallest signed turn from one angle to another, so crossing ±180° never reads as a full spin. */
export function turnBetween(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/**
 * The move along the ground that brings a point (given as its offset from a
 * centre) back inside a circle of `radius` round that centre; [0, 0] if it is
 * already inside.
 */
export function pullInside(dx: number, dz: number, radius: number): [number, number] {
  const distance = Math.hypot(dx, dz);
  if (distance <= radius) return [0, 0];
  const k = (distance - radius) / distance;
  return [-dx * k, -dz * k];
}
