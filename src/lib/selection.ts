// Which session and drivers the page shows. The choice lives in the URL
// (?session=9935&drivers=NOR,PIA), so a link opens the same replay.

import type { DataIndex, EventSummary, SessionSummary } from './data-types';

export interface Selection {
  session: number;
  /** Driver codes, driver 1 first */
  drivers: [string, string];
}

/** The session and drivers a URL's query string asks for; parts that are missing or malformed are null or empty. */
export function readSelection(search: string): { session: number | null; drivers: string[] } {
  const params = new URLSearchParams(search);
  const session = Number(params.get('session'));
  const drivers = (params.get('drivers') ?? '')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code) => /^[A-Z]{3}$/.test(code));
  return { session: Number.isInteger(session) && session > 0 ? session : null, drivers };
}

export const selectionSearch = ({ session, drivers }: Selection) => `?session=${session}&drivers=${drivers.join(',')}`;

/** A session and the race weekend it belongs to. */
export function findSession(index: DataIndex, key: number): { event: EventSummary; session: SessionSummary } | null {
  for (const event of index.events) {
    const session = event.sessions.find((s) => s.key === key);
    if (session) return { event, session };
  }
  return null;
}

/** The most recent session in the index. */
export function latestSession(index: DataIndex): SessionSummary | null {
  let latest: SessionSummary | null = null;
  for (const event of index.events) {
    for (const s of event.sessions) if (!latest || s.date > latest.date) latest = s;
  }
  return latest;
}

/**
 * The two drivers to compare: the requested ones that have a lap in the
 * session, topped up from the front of the order (pole first). Null when the
 * session has fewer than two laps.
 */
export function pickDrivers(available: string[], requested: string[]): [string, string] | null {
  const picks = [...new Set(requested)].filter((code) => available.includes(code)).slice(0, 2);
  for (const code of available) {
    if (picks.length === 2) break;
    if (!picks.includes(code)) picks.push(code);
  }
  return picks.length === 2 ? [picks[0], picks[1]] : null;
}

/**
 * Short names for the race tiles: the country, or the circuit where a season
 * has more than one race in that country (Miami, Austin, Las Vegas).
 */
export function raceNames(events: EventSummary[]): Map<number, string> {
  const SHORT: Record<string, string> = {
    'United Kingdom': 'Britain',
    'United Arab Emirates': 'Abu Dhabi',
    'United States': 'USA',
  };
  const count = new Map<string, number>();
  for (const e of events) count.set(`${e.year} ${e.country}`, (count.get(`${e.year} ${e.country}`) ?? 0) + 1);
  return new Map(
    events.map((e) => [e.key, count.get(`${e.year} ${e.country}`)! > 1 ? e.circuit : (SHORT[e.country] ?? e.country)]),
  );
}
