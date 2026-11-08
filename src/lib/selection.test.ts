import { describe, expect, it } from 'vitest';
import type { DataIndex, EventSummary } from './data-types';
import { findSession, latestSession, pickDrivers, raceNames, readSelection, selectionSearch } from './selection';

const event = (key: number, year: number, country: string, circuit: string, sessions: [number, string][]): EventSummary => ({
  key,
  year,
  round: 1,
  meeting: `${country} Grand Prix`,
  circuit,
  country,
  date: sessions[0][1],
  sessions: sessions.map(([sessionKey, date]) => ({
    key: sessionKey,
    meetingKey: key,
    year,
    meeting: `${country} Grand Prix`,
    name: 'Qualifying',
    circuit,
    country,
    date,
    file: `sessions/${sessionKey}.json`,
    drivers: ['NOR', 'PIA', 'VER'],
  })),
});

const index: DataIndex = {
  version: 2,
  generatedAt: '',
  events: [
    event(20, 2026, 'Australia', 'Melbourne', [[200, '2026-03-07T05:00:00Z']]),
    event(10, 2025, 'United States', 'Miami', [[100, '2025-05-03T20:00:00Z']]),
    event(11, 2025, 'United States', 'Austin', [[110, '2025-10-18T21:00:00Z']]),
    event(12, 2025, 'United Kingdom', 'Silverstone', [[120, '2025-07-05T14:00:00Z']]),
  ],
};

describe('readSelection', () => {
  it('reads the session and driver codes', () => {
    expect(readSelection('?session=9935&drivers=nor,PIA')).toEqual({ session: 9935, drivers: ['NOR', 'PIA'] });
  });

  it('ignores what it cannot use', () => {
    expect(readSelection('?session=abc&drivers=NOR,,LONGER,1')).toEqual({ session: null, drivers: ['NOR'] });
    expect(readSelection('')).toEqual({ session: null, drivers: [] });
  });

  it('round-trips with selectionSearch', () => {
    expect(readSelection(selectionSearch({ session: 7, drivers: ['VER', 'HAM'] }))).toEqual({ session: 7, drivers: ['VER', 'HAM'] });
  });
});

describe('findSession and latestSession', () => {
  it('finds a session and its race weekend', () => {
    expect(findSession(index, 110)?.event.circuit).toBe('Austin');
    expect(findSession(index, 999)).toBeNull();
  });

  it('picks the most recent session, whatever the order of the index', () => {
    expect(latestSession(index)?.key).toBe(200);
    expect(latestSession({ ...index, events: [] })).toBeNull();
  });
});

describe('pickDrivers', () => {
  const order = ['NOR', 'PIA', 'VER', 'LEC'];

  it('keeps the requested drivers in the requested order', () => {
    expect(pickDrivers(order, ['VER', 'NOR'])).toEqual(['VER', 'NOR']);
  });

  it('tops up from pole when a requested driver has no lap', () => {
    expect(pickDrivers(order, ['XYZ', 'LEC'])).toEqual(['LEC', 'NOR']);
    expect(pickDrivers(order, [])).toEqual(['NOR', 'PIA']);
    expect(pickDrivers(order, ['PIA', 'PIA'])).toEqual(['PIA', 'NOR']);
  });

  it('needs two laps', () => {
    expect(pickDrivers(['NOR'], ['NOR'])).toBeNull();
  });
});

describe('raceNames', () => {
  it('uses the country, or the circuit when a season visits a country twice', () => {
    expect([...raceNames(index.events).values()]).toEqual(['Australia', 'Miami', 'Austin', 'Britain']);
  });
});
