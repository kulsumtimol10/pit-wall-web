import { useEffect, useMemo, useRef, useState } from 'react';
import { ConditionsChart } from '../components/ui/ConditionsChart';
import { ConditionsStrip } from '../components/ui/ConditionsStrip';
import { DriverCard } from '../components/ui/DriverCard';
import { GapCard } from '../components/ui/GapCard';
import { Leaderboard } from '../components/ui/Leaderboard';
import { PlaybackControls } from '../components/ui/PlaybackControls';
import { TopNav } from '../components/ui/TopNav';
import { ZoomControls } from '../components/ui/ZoomControls';
import type { SessionFile } from '../lib/data-types';
import { buildGapProfile } from '../lib/gap';
import { formatLapTime, trackCurve, trackFrame } from '../lib/track';
import { readingAt } from '../lib/weather';
import { wheelZooms, zoomModifier } from '../lib/zoom';
import { GhostLapScene, type Racer } from '../scenes/GhostLapScene';
import { usePlayback } from '../store/playback';
import { useView } from '../store/view';

/**
 * Fixed colours for the two cars. Team colours often clash (both cars here are
 * McLarens), so the first car is always orange and the second always blue.
 * The pair, with the conditions chart's green, passes the dataviz palette
 * validator on the dark panel (lightness band, colour-blind separation, contrast).
 */
const COLOURS = ['#e07020', '#4c8dff'] as const;
const JUMP_S = 2;
/** How long the "use Ctrl + scroll" / "use two fingers" hint stays up after the last attempt. */
const HINT_MS = 1600;
const MODIFIER = zoomModifier(navigator.userAgent);

export function GhostLapPage({ data }: { data: SessionFile }) {
  const { session, laps, weather, classification, sessionBestSectors } = data;
  const racers = useMemo<[Racer, Racer]>(
    () => [
      { lap: laps[0], colour: COLOURS[0] },
      { lap: laps[1], colour: COLOURS[1] },
    ],
    [laps],
  );
  const [a, b] = racers;
  const frame = useMemo(() => trackFrame(a.lap.samples), [a]);
  const curve = useMemo(() => trackCurve(a.lap.samples, frame), [a, frame]);
  const profile = useMemo(() => buildGapProfile(a.lap.samples, b.lap.samples), [a, b]);
  const conditionsA = readingAt(weather, a.lap.startedAt);
  const conditionsB = readingAt(weather, b.lap.startedAt);
  const stageRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState({ text: '', visible: false });

  useEffect(() => {
    usePlayback.getState().load(Math.max(a.lap.lapTime, b.lap.lapTime));
  }, [a, b]);

  // Plain scrolling over the 3D view scrolls the page instead of zooming; a
  // hint says how to zoom. Listening in the capture phase on the stage stops
  // the wheel event before OrbitControls (inside it) can zoom or block scrolling.
  // On touch screens one finger scrolls the page (with a hint) and two fingers
  // belong to the 3D view, so they must not scroll the page as well.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let timer: number | undefined;
    const show = (text: string) => {
      setHint({ text, visible: true });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setHint((h) => ({ ...h, visible: false })), HINT_MS);
    };
    const onWheel = (e: WheelEvent) => {
      if (wheelZooms(e)) return;
      e.stopPropagation();
      show(`Use ${MODIFIER} + scroll to zoom the track`);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) show('Use two fingers to move, zoom and rotate the track');
      else if (e.cancelable) e.preventDefault();
    };
    stage.addEventListener('wheel', onWheel, { capture: true, passive: true });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      window.clearTimeout(timer);
      stage.removeEventListener('wheel', onWheel, { capture: true });
      stage.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, button, textarea, select')) return;
      const { toggle, seek, time } = usePlayback.getState();
      // Leave Ctrl/⌘ + plus/minus/0 to the browser's own page zoom.
      const plainKey = !e.ctrlKey && !e.metaKey && !e.altKey;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.code === 'ArrowLeft') {
        seek(time - JUMP_S);
      } else if (e.code === 'ArrowRight') {
        seek(time + JUMP_S);
      } else if (plainKey && (e.key === '+' || e.key === '=')) {
        useView.getState().zoomIn();
      } else if (plainKey && (e.key === '-' || e.key === '_')) {
        useView.getState().zoomOut();
      } else if (plainKey && e.key === '0') {
        useView.getState().resetView();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="page">
      <TopNav current="Ghost Lap" />
      <main className="ghost">
        <div className="replay">
          <section className="stage-column">
            <div className="session-head">
              <div>
                <p className="eyebrow">
                  {session.year} · {session.name.toUpperCase()} · FASTEST LAPS
                </p>
                <h1>
                  {session.meeting} <span className="muted">· {session.circuit}</span>
                </h1>
              </div>
              <div className="chips">
                {racers.map((r, i) => (
                  <span key={r.lap.driver.number} className="chip-group">
                    {i === 1 && <span className="muted vs">vs</span>}
                    <span className="chip">
                      <span className="dot" style={{ background: r.colour }} />
                      <strong>{r.lap.driver.code}</strong>
                      <span className="mono">{formatLapTime(r.lap.lapTime)}</span>
                      {r.lap.segment && <span className="segment-tag">{r.lap.segment}</span>}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="viewer">
              <div className="stage" ref={stageRef}>
                <GhostLapScene racers={racers} frame={frame} curve={curve} />
                <ConditionsStrip reading={conditionsA} title={`At ${a.lap.driver.code}'s lap`} />
                <ZoomControls />
                <div className="legend">
                  <span>
                    <span className="swatch" style={{ background: '#ff3b3b' }} />
                    Braking
                  </span>
                  <span>
                    <span className="swatch gradient" />
                    Slow to fast
                  </span>
                  <span>
                    <span className="swatch post" />
                    Start / finish
                  </span>
                  <span className="for-mouse">
                    Height ×3 · drag to move · {MODIFIER} + drag to rotate · {MODIFIER} + scroll or + − to zoom
                  </span>
                  <span className="for-touch">Height ×3 · two fingers to move, zoom and rotate</span>
                </div>
                <div className={`zoom-hint${hint.visible ? ' show' : ''}`} role="status" aria-live="polite">
                  {hint.text && <p>{hint.text}</p>}
                </div>
              </div>
              <PlaybackControls />
            </div>
          </section>

          <aside className="side">
            <GapCard a={a} b={b} profile={profile} />
            <DriverCard racer={a} sessionBest={sessionBestSectors} conditions={conditionsA} utcOffset={session.utcOffset} />
            <DriverCard racer={b} sessionBest={sessionBestSectors} conditions={conditionsB} utcOffset={session.utcOffset} />
          </aside>
        </div>

        {classification?.length || weather?.length ? (
          <div className="details">
            {classification?.length ? <Leaderboard rows={classification} racers={racers} sessionName={session.name} /> : null}
            {weather?.length ? (
              <ConditionsChart
                readings={weather}
                utcOffset={session.utcOffset}
                laps={racers
                  .filter((r) => r.lap.startedAt)
                  .map((r) => ({ code: r.lap.driver.code, colour: r.colour, startedAt: r.lap.startedAt!, segment: r.lap.segment }))}
              />
            ) : null}
          </div>
        ) : null}
      </main>
      <footer className="credit">Data: OpenF1 (CC BY-NC-SA 4.0) · Unofficial fan project, not associated with Formula 1</footer>
    </div>
  );
}
