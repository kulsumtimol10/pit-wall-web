import type { LapData, Sectors } from './data-types';

/** F1 timing colours: purple = fastest of the session, green = driver's personal best, yellow = neither. */
export type SectorColour = 'purple' | 'green' | 'yellow';

export interface SectorView {
  label: 'S1' | 'S2' | 'S3';
  time: number | null;
  /** The car has crossed the end of this sector in the replay */
  done: boolean;
  colour: SectorColour | null;
}

/** Times are given to the millisecond; allow for float rounding when comparing. */
const EPS = 0.0005;
const LABELS = ['S1', 'S2', 'S3'] as const;

export function sectorColour(time: number, sessionBest: number | null, personalBest: number | null): SectorColour {
  if (sessionBest !== null && time <= sessionBest + EPS) return 'purple';
  if (personalBest !== null && time <= personalBest + EPS) return 'green';
  return 'yellow';
}

/**
 * The lap's three sectors as they stand t seconds into the replay. A sector
 * shows its official time once the car's clock passes the end of it.
 * Returns null for laps without sector data.
 */
export function sectorsAt(lap: LapData, sessionBest: Sectors | undefined, t: number): SectorView[] | null {
  if (!lap.sectors) return null;
  let end = 0;
  return lap.sectors.map((time, i) => {
    end += time ?? 0;
    // Summed sector times can land a hair above the lap time (float rounding).
    const done = time !== null && t + EPS >= end;
    return {
      label: LABELS[i],
      time,
      done,
      colour: done ? sectorColour(time, sessionBest?.[i] ?? null, lap.personalBestSectors?.[i] ?? null) : null,
    };
  });
}

/** The driver's best three sectors added together, or null if any is missing. */
export function idealLap(personalBest: Sectors | undefined): number | null {
  if (!personalBest || personalBest.some((s) => s === null)) return null;
  return (personalBest as number[]).reduce((a, b) => a + b, 0);
}
