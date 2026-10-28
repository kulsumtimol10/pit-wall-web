import { describe, expect, it } from 'vitest';
import type { LapData, WeatherReading } from './data-types';
import { idealLap, sectorColour, sectorsAt } from './sectors';
import { compass, localClock, localMinutes, readingAt } from './weather';

const lap = {
  sectors: [30.005, 42.579, 27.978],
  personalBestSectors: [29.991, 42.579, 27.879],
} as LapData;
const sessionBest: [number, number, number] = [29.761, 42.532, 27.978];

describe('sectorColour', () => {
  it('uses F1 colours: session best purple, personal best green, else yellow', () => {
    expect(sectorColour(29.761, 29.761, 29.9)).toBe('purple');
    expect(sectorColour(42.579, 42.532, 42.579)).toBe('green');
    expect(sectorColour(30.005, 29.761, 29.991)).toBe('yellow');
  });
});

describe('sectorsAt', () => {
  it('reveals each sector once the car passes its end', () => {
    const at = (t: number) => sectorsAt(lap, sessionBest, t)!.map((s) => s.done);
    expect(at(29.9)).toEqual([false, false, false]);
    expect(at(30.005)).toEqual([true, false, false]);
    expect(at(72.6)).toEqual([true, true, false]);
    expect(at(100.562)).toEqual([true, true, true]);
  });
  it('colours sectors only once they are done', () => {
    const views = sectorsAt(lap, sessionBest, 100.6)!;
    expect(views.map((s) => s.colour)).toEqual(['yellow', 'green', 'purple']);
    expect(sectorsAt(lap, sessionBest, 1)![0].colour).toBeNull();
  });
  it('returns null for a lap without sector data', () => {
    expect(sectorsAt({} as LapData, sessionBest, 50)).toBeNull();
  });
});

describe('idealLap', () => {
  it('adds the best sectors, or gives up if one is missing', () => {
    expect(idealLap([29.991, 42.532, 27.879])).toBeCloseTo(100.402);
    expect(idealLap([29.991, null, 27.879])).toBeNull();
  });
});

describe('weather helpers', () => {
  const r = (date: string, trackTemp: number) => ({ date, trackTemp }) as WeatherReading;
  const readings = [r('2025-07-26T14:49:00.000Z', 39.1), r('2025-07-26T14:50:00.000Z', 39.4), r('2025-07-26T14:51:00.000Z', 39.6)];
  it('finds the latest reading at or before a moment', () => {
    expect(readingAt(readings, '2025-07-26T14:50:56.915Z')?.trackTemp).toBe(39.4);
    expect(readingAt(readings, '2025-07-26T10:00:00.000Z')?.trackTemp).toBe(39.1);
    expect(readingAt([], '2025-07-26T10:00:00.000Z')).toBeNull();
  });
  it('names compass points', () => {
    expect(compass(342)).toBe('NNW');
    expect(compass(0)).toBe('N');
    expect(compass(359)).toBe('N');
    expect(compass(90)).toBe('E');
  });
  it('shows local circuit time', () => {
    expect(localClock('2025-07-26T14:50:56.915Z', '+02:00')).toBe('16:50');
    expect(localClock('2025-07-26T14:50:56.915Z', undefined)).toBe('14:50 UTC');
    expect(localMinutes('2025-07-26T14:30:30.000Z', '-05:00')).toBeCloseTo(9 * 60 + 30.5);
  });
});
