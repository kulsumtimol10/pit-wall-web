/**
 * The stretch of lap a car's trail covers, as lap fractions: from `metres`
 * behind the car (never before the start line, where the lap begins) up to
 * the car itself.
 */
export function trailWindow(carFraction: number, lapMetres: number, metres: number): [number, number] {
  const head = Math.min(Math.max(carFraction, 0), 0.99999);
  return [Math.max(0, head - metres / lapMetres), head];
}

/** Points at the car end of a trail that brighten past 1, so the bloom pass lights up the trail's head. */
const HEAD_POINTS = 12;
const HEAD_GLOW = 1.8;

/**
 * Brightness along a trail of `count` points: 0 at the tail rising towards 1
 * (slowly at first, so the tail fades out softly), then up to HEAD_GLOW over
 * the last few points. Only that head goes past 1, so only it blooms and the
 * rest of the trail keeps its true speed colour.
 */
export function trailBrightness(index: number, count: number): number {
  const k = count > 1 ? index / (count - 1) : 1;
  const head = Math.max(0, (index - (count - 1 - HEAD_POINTS)) / HEAD_POINTS);
  return k ** 1.5 * (1 + (HEAD_GLOW - 1) * head * head);
}

/** The slowest and fastest speed across several laps, so every trail uses the same colour scale. */
export function speedRange(laps: { speed: number[] }[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const { speed } of laps) {
    for (const v of speed) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  return [lo, hi];
}
