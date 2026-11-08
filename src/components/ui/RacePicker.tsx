import { useEffect, useRef, useState } from 'react';
import { RACER_COLOURS } from '../../lib/colours';
import { fetchSession } from '../../lib/data';
import type { DataIndex, SessionFile, SessionSummary } from '../../lib/data-types';
import { findSession, raceNames, type Selection } from '../../lib/selection';
import { formatLapTime } from '../../lib/track';

/** Driver codes in the two slots; a slot keeps its colour while the other changes. */
type Slots = [string | null, string | null];

interface Props {
  index: DataIndex;
  current: Selection;
  /** The session file already loaded for the current replay */
  currentFile: SessionFile;
  onClose: () => void;
  /** Loads and shows the chosen replay; rejects if it can't */
  onChoose: (selection: Selection) => Promise<void>;
}

type SessionLoad = { key: number; data?: SessionFile; error?: string };

/**
 * A modal dialog to pick a race, a session and two drivers. It opens when
 * mounted; the replay switches once the chosen laps have loaded.
 */
export function RacePicker({ index, current, currentFile, onClose, onChoose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const selectedTile = useRef<HTMLButtonElement>(null);
  const start = findSession(index, current.session);
  const [eventKey, setEventKey] = useState(start?.event.key);
  const [year, setYear] = useState(start?.event.year ?? index.events[0]?.year);
  const [sessionKey, setSessionKey] = useState(current.session);
  const [slots, setSlots] = useState<Slots>(current.drivers);
  const [loaded, setLoaded] = useState<SessionLoad>({ key: current.session, data: currentFile });
  const [status, setStatus] = useState<{ busy: boolean; error?: string }>({ busy: false });

  const names = raceNames(index.events);
  const seasons = [...new Set(index.events.map((e) => e.year))].sort((a, b) => a - b);
  const races = index.events.filter((e) => e.year === year).sort((a, b) => a.round - b.round);
  const event = index.events.find((e) => e.key === eventKey);
  const summary = event?.sessions.find((s) => s.key === sessionKey);
  const file = loaded.key === sessionKey ? loaded.data : undefined;
  const ready = Boolean(file && slots[0] && slots[1]);

  useEffect(() => {
    const dialog = dialogRef.current!;
    if (!dialog.open) dialog.showModal();
    selectedTile.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  useEffect(() => {
    if (!summary || loaded.key === summary.key) return;
    let cancelled = false;
    fetchSession(summary.file)
      .then((data) => !cancelled && setLoaded({ key: summary.key, data }))
      .catch((err: unknown) => !cancelled && setLoaded({ key: summary.key, error: String(err) }));
    return () => {
      cancelled = true;
    };
  }, [summary, loaded.key]);

  const close = () => dialogRef.current?.close();

  /** Switches session, keeping the picked drivers who have a lap in it (else its front row). */
  const pickSession = (s: SessionSummary) => {
    setSessionKey(s.key);
    setStatus({ busy: false });
    setSlots((picked) => {
      const kept = picked.map((code) => (code && s.drivers.includes(code) ? code : null)) as Slots;
      return kept[0] || kept[1] ? kept : [s.drivers[0] ?? null, s.drivers[1] ?? null];
    });
  };

  const pickRace = (key: number) => {
    const race = index.events.find((e) => e.key === key);
    if (!race?.sessions.length) return;
    setEventKey(key);
    pickSession(race.sessions.find((s) => s.name === 'Qualifying') ?? race.sessions[race.sessions.length - 1]);
  };

  const toggleDriver = (code: string) => {
    setStatus({ busy: false });
    setSlots(([one, two]) => {
      if (one === code) return [null, two];
      if (two === code) return [one, null];
      if (one === null) return [code, two];
      // Fills the empty second slot, or replaces driver 2.
      return [one, code];
    });
  };

  const confirm = async () => {
    if (!ready || status.busy) return;
    const selection: Selection = { session: sessionKey, drivers: [slots[0]!, slots[1]!] };
    if (selection.session === current.session && selection.drivers.join() === current.drivers.join()) {
      close();
      return;
    }
    setStatus({ busy: true });
    try {
      // On success the page switches to the new replay and this dialog goes with it.
      await onChoose(selection);
      setStatus({ busy: false });
    } catch (err) {
      setStatus({ busy: false, error: `Couldn't load those laps. ${String(err)}` });
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="picker"
      aria-labelledby="picker-title"
      onClose={onClose}
      onPointerDown={(e) => (pressedOnBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => pressedOnBackdrop.current && e.target === e.currentTarget && close()}
    >
      <div className="picker-head">
        <div>
          <h2 id="picker-title">Choose a lap to replay</h2>
          <p>Pick a race, a session and any two drivers. Their fastest laps race each other on the 3D track.</p>
        </div>
        <button type="button" className="picker-close" aria-label="Close" onClick={close}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="picker-body">
        <section className="picker-col picker-races" aria-labelledby="picker-race">
          <div className="picker-col-head">
            <h3 id="picker-race" className="picker-step">
              1 · RACE
            </h3>
            {seasons.length > 1 && (
              <div className="season-tabs" role="group" aria-label="Season">
                {seasons.map((y) => (
                  <button key={y} type="button" aria-pressed={y === year} onClick={() => setYear(y)}>
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="race-grid">
            {races.map((race) => (
              <button
                key={race.key}
                ref={race.key === eventKey ? selectedTile : undefined}
                type="button"
                className="race-tile"
                aria-pressed={race.key === eventKey}
                aria-label={`Round ${race.round}, ${race.meeting}`}
                onClick={() => pickRace(race.key)}
              >
                <span className="round mono">{race.round}</span>
                <svg width="56" height="38" viewBox="0 0 56 38" aria-hidden="true">
                  {race.outline && <path d={race.outline} />}
                </svg>
                <span className="name">{names.get(race.key)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="picker-col picker-sessions" aria-labelledby="picker-session">
          <div className="picker-col-head">
            <h3 id="picker-session" className="picker-step">
              2 · SESSION
            </h3>
          </div>
          <div className="session-options">
            {event?.sessions.map((s) => (
              <button key={s.key} type="button" className="session-option" aria-pressed={s.key === sessionKey} onClick={() => pickSession(s)}>
                <strong>{s.name}</strong>
                <span>Fastest laps · {s.drivers.length} drivers</span>
              </button>
            ))}
            <button type="button" className="session-option" disabled>
              <strong>Race</strong>
              <span>Coming later</span>
            </button>
          </div>
          <p className="picker-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 4v5h-5" />
            </svg>
            New qualifying sessions appear every Sunday, before the race.
          </p>
        </section>

        <section className="picker-col picker-drivers" aria-labelledby="picker-drivers">
          <div className="picker-col-head">
            <h3 id="picker-drivers" className="picker-step">
              3 · TWO DRIVERS
            </h3>
            <div className="driver-slots">
              {slots.map((code, i) => (
                <span key={i} className="driver-slot" style={code ? { borderColor: RACER_COLOURS[i], color: 'var(--text)' } : undefined}>
                  <span className="dot" style={{ background: code ? RACER_COLOURS[i] : 'var(--border-strong)' }} />
                  Driver {i + 1}
                  {code && `: ${code}`}
                </span>
              ))}
            </div>
          </div>
          {file ? (
            <div className="driver-list" role="group" aria-label="Drivers, in classification order">
              {file.laps.map((lap) => {
                const slot = slots.indexOf(lap.driver.code);
                const colour = slot >= 0 ? RACER_COLOURS[slot] : undefined;
                return (
                  <button
                    key={lap.driver.number}
                    type="button"
                    className="driver-row"
                    aria-pressed={slot >= 0}
                    aria-label={`P${lap.position} ${lap.driver.name}, ${lap.driver.team}, ${formatLapTime(lap.lapTime)}${slot >= 0 ? `, driver ${slot + 1}` : ''}`}
                    style={colour ? { borderColor: colour, background: `${colour}1a` } : undefined}
                    onClick={() => toggleDriver(lap.driver.code)}
                  >
                    <span className="badge" style={colour ? { background: colour, borderColor: colour } : undefined}>
                      {slot >= 0 ? slot + 1 : ''}
                    </span>
                    <span className="position mono">{lap.position}</span>
                    <span className="team-bar" style={{ background: `#${lap.driver.teamColour}` }} />
                    <strong>{lap.driver.code}</strong>
                    <span className="driver-name">{lap.driver.name}</span>
                    <span className="driver-team">{lap.driver.team}</span>
                    <span className="lap-time mono">{formatLapTime(lap.lapTime)}</span>
                    <span className="segment mono">{lap.segment ?? ''}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="picker-loading muted" role="status">
              {loaded.key === sessionKey && loaded.error ? `Couldn't load the drivers. ${loaded.error}` : 'Loading drivers…'}
            </p>
          )}
        </section>
      </div>

      <div className="picker-foot">
        <p className="picker-summary" role="status">
          {status.error ? (
            <span className="picker-error">{status.error}</span>
          ) : (
            <>
              {event && `Round ${event.round} · ${event.meeting} · `}
              {summary && `${summary.name} · `}
              <strong>{slots[0] && slots[1] ? `${slots[0]} vs ${slots[1]}` : 'pick two drivers'}</strong>
            </>
          )}
        </p>
        <div className="picker-actions">
          <button type="button" className="button-secondary" onClick={close}>
            Cancel
          </button>
          <button type="button" className="button-primary" disabled={!ready || status.busy} onClick={confirm}>
            {status.busy ? 'Loading laps…' : ready ? 'Replay these laps' : 'Pick two drivers'}
            {ready && !status.busy && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}
