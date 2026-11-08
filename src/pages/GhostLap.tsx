import { useEffect, useMemo, useRef, useState } from 'react';
import { CameraSwitcher } from '../components/ui/CameraSwitcher';
import { ConditionsChart } from '../components/ui/ConditionsChart';
import { ConditionsStrip } from '../components/ui/ConditionsStrip';
import { DriverCard } from '../components/ui/DriverCard';
import { GapCard } from '../components/ui/GapCard';
import { LapComparison } from '../components/ui/LapComparison';
import { Leaderboard } from '../components/ui/Leaderboard';
import { PlaybackControls } from '../components/ui/PlaybackControls';
import { RacePicker } from '../components/ui/RacePicker';
import { TopNav } from '../components/ui/TopNav';
import { ZoomControls } from '../components/ui/ZoomControls';
import { RACER_COLOURS } from '../lib/colours';
import type { DataIndex, LapData, SessionFile } from '../lib/data-types';
import { buildGapProfile } from '../lib/gap';
import type { Selection } from '../lib/selection';
import { formatLapTime, trackCurve, trackFrame } from '../lib/track';
import { readingAt } from '../lib/weather';
import { wheelZooms, zoomModifier } from '../lib/zoom';
import { GhostLapScene, type Racer } from '../scenes/GhostLapScene';
import { usePlayback } from '../store/playback';
import { useView } from '../store/view';

const JUMP_S = 2;
/** How long the "use Ctrl + scroll" / "use two fingers" hint stays up after the last attempt. */
const HINT_MS = 1600;
/** Ctrl + scroll outside overview: zoom factor per pixel of wheel movement (pinches send small, frequent steps). */
const WHEEL_ZOOM_RATE = 0.002;
const MODIFIER = zoomModifier(navigator.userAgent);

interface Props {
  index: DataIndex;
  data: SessionFile;
  /** The two laps to replay, driver 1 first */
  laps: [LapData, LapData];
  onChoose: (selection: Selection) => Promise<void>;
}

export function GhostLapPage({ index, data, laps, onChoose }: Props) {
  const { session, weather, classification, sessionBestSectors } = data;
  const racers = useMemo<[Racer, Racer]>(
    () => [
      { lap: laps[0], colour: RACER_COLOURS[0] },
      { lap: laps[1], colour: RACER_COLOURS[1] },
    ],
    [laps],
  );
  const [a, b] = racers;
  const [picking, setPicking] = useState(false);
  const frame = useMemo(() => trackFrame(a.lap.samples), [a]);
  const curve = useMemo(() => trackCurve(a.lap.samples, frame), [a, frame]);
  const profile = useMemo(() => buildGapProfile(a.lap.samples, b.lap.samples), [a, b]);
  const conditionsA = readingAt(weather, a.lap.startedAt);
  const conditionsB = readingAt(weather, b.lap.startedAt);
  const stageRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState({ text: '', visible: false });
  const trailColours = useView((s) => s.trailColours);
  const setTrailColours = useView((s) => s.setTrailColours);
  const cameraMode = useView((s) => s.camera);
  // The chase camera follows the slower lap unless the visitor picks: the faster one is the car to chase.
  const follow = useView((s) => s.follow) ?? (b.lap.lapTime >= a.lap.lapTime ? 1 : 0);

  useEffect(() => {
    usePlayback.getState().load(Math.max(a.lap.lapTime, b.lap.lapTime));
  }, [a, b]);

  useEffect(() => {
    document.title = `${a.lap.driver.code} vs ${b.lap.driver.code} · ${session.meeting} ${session.year} · Pit Wall`;
  }, [a, b, session]);

  // The camera mode carries over to the next replay, but its cars start with the default to follow.
  useEffect(() => () => useView.getState().setFollow(null), []);

  // Plain scrolling over the 3D view scrolls the page instead of zooming; a
  // hint says how to zoom. Listening in the capture phase on the stage stops
  // the wheel event before OrbitControls (inside it) can zoom or block scrolling.
  // Ctrl + scroll goes on to OrbitControls in overview; the other cameras have
  // the controls switched off, so it zooms them here instead (and must not
  // fall through to the browser's page zoom).
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
      if (!wheelZooms(e)) {
        e.stopPropagation();
        show(`Use ${MODIFIER} + scroll to zoom the track`);
      } else if (useView.getState().camera !== 'overview') {
        e.preventDefault();
        useView.getState().zoomBy(Math.exp(e.deltaY * WHEEL_ZOOM_RATE));
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        if (e.cancelable) e.preventDefault();
      } else if (useView.getState().camera === 'overview') {
        show('Use two fingers to move, zoom and rotate the track');
      }
    };
    stage.addEventListener('wheel', onWheel, { capture: true, passive: false });
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
      // Charts that read their own arrow keys mark themselves data-own-keys.
      if (target.closest('input, button, textarea, select, dialog, [data-own-keys]')) return;
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
      <TopNav current="Ghost Lap" season={session.year} />
      <main className="ghost">
        <div className="replay">
          <section className="stage-column">
            <div className="session-head">
              <div>
                <p className="eyebrow">
                  <button type="button" className="eyebrow-button" aria-haspopup="dialog" onClick={() => setPicking(true)}>
                    {session.year} · {session.name.toUpperCase()} · FASTEST LAPS
                    <Chevron />
                    <span className="visually-hidden">: choose another race</span>
                  </button>
                </p>
                <h1>
                  {session.meeting} <span className="muted">· {session.circuit}</span>
                </h1>
              </div>
              <div className="chips">
                {racers.map((r, i) => (
                  <span key={r.lap.driver.number} className="chip-group">
                    {i === 1 && <span className="muted vs">vs</span>}
                    <button
                      type="button"
                      className="chip"
                      aria-haspopup="dialog"
                      aria-label={`Change driver ${i + 1}, ${r.lap.driver.name}`}
                      onClick={() => setPicking(true)}
                    >
                      <span className="dot" style={{ background: r.colour }} />
                      <strong>{r.lap.driver.code}</strong>
                      <span className="mono">{formatLapTime(r.lap.lapTime)}</span>
                      {r.lap.segment && <span className="segment-tag">{r.lap.segment}</span>}
                      <Chevron />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            {picking && (
              <RacePicker
                index={index}
                current={{ session: session.key, drivers: [a.lap.driver.code, b.lap.driver.code] }}
                currentFile={data}
                onClose={() => setPicking(false)}
                onChoose={onChoose}
              />
            )}

            <div className="viewer">
              <div className="stage" ref={stageRef}>
                <GhostLapScene racers={racers} frame={frame} curve={curve} follow={follow} />
                <ConditionsStrip reading={conditionsA} title={`At ${a.lap.driver.code}'s lap`} />
                <CameraSwitcher racers={racers} follow={follow} />
                <ZoomControls />
                <div className="legend">
                  <div className="trail-switch" role="group" aria-label="Trail colour">
                    <span>Trail colour</span>
                    <button type="button" aria-pressed={trailColours === 'speed'} onClick={() => setTrailColours('speed')}>
                      Speed
                    </button>
                    <button type="button" aria-pressed={trailColours === 'driver'} onClick={() => setTrailColours('driver')}>
                      Driver
                    </button>
                  </div>
                  {trailColours === 'speed' ? (
                    <>
                      <span>
                        <span className="swatch gradient" />
                        Slow to fast
                      </span>
                      <span>
                        <span className="swatch" style={{ background: '#ff3b3b' }} />
                        Braking
                      </span>
                    </>
                  ) : (
                    racers.map((r) => (
                      <span key={r.lap.driver.number}>
                        <span className="swatch" style={{ background: r.colour }} />
                        {r.lap.driver.code}
                      </span>
                    ))
                  )}
                  <span>
                    <span className="swatch post" />
                    Start / finish
                  </span>
                  {cameraMode === 'overview' ? (
                    <>
                      <span className="for-mouse">
                        Height ×3 · drag to move · {MODIFIER} + drag to rotate · {MODIFIER} + scroll or + − to zoom
                      </span>
                      <span className="for-touch">Height ×3 · two fingers to move, zoom and rotate</span>
                    </>
                  ) : (
                    <>
                      <span className="for-mouse">Height ×3 · {MODIFIER} + scroll or + − to zoom</span>
                      <span className="for-touch">Height ×3 · + − to zoom</span>
                    </>
                  )}
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

        <LapComparison racers={racers} profile={profile} />

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

function Chevron() {
  return (
    <svg className="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
