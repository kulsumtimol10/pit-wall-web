import type { WeatherReading } from './data-types';

/** The latest reading at or before a moment (ISO 8601), or the first reading if all are later. */
export function readingAt(readings: WeatherReading[] | undefined, iso: string | undefined): WeatherReading | null {
  if (!readings?.length) return null;
  if (!iso) return readings[0];
  let found = readings[0];
  for (const r of readings) {
    if (r.date > iso) break;
    found = r;
  }
  return found;
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

/** 342 → "NNW" (16-point compass) */
export function compass(degrees: number): string {
  return POINTS[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
}

/** Offset like "+02:00" in minutes. */
function offsetMinutes(utcOffset: string | undefined): number {
  const m = utcOffset ? /^([+-])(\d{2}):(\d{2})$/.exec(utcOffset) : null;
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** Local time at the circuit, e.g. "16:50"; UTC (with the suffix) when the offset is unknown. */
export function localClock(iso: string, utcOffset: string | undefined): string {
  const d = new Date(Date.parse(iso) + offsetMinutes(utcOffset) * 60_000);
  const hhmm = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return utcOffset ? hhmm : `${hhmm} UTC`;
}

/** Minutes since midnight at the circuit, for placing readings on a time axis. */
export function localMinutes(iso: string, utcOffset: string | undefined): number {
  const d = new Date(Date.parse(iso) + offsetMinutes(utcOffset) * 60_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
}
