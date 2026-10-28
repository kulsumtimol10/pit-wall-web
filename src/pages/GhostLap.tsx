import { useEffect, useMemo } from 'react';
import { ConditionsChart } from '../components/ui/ConditionsChart';
import { ConditionsStrip } from '../components/ui/ConditionsStrip';
import { DriverCard } from '../components/ui/DriverCard';
import { GapCard } from '../components/ui/GapCard';
import { Leaderboard } from '../components/ui/Leaderboard';
import { PlaybackControls } from '../components/ui/PlaybackControls';
import { TopNav } from '../components/ui/TopNav';
import type { SessionFile } from '../lib/data-types';
import { buildGapProfile } from '../lib/gap';
import { formatLapTime, trackCurve, trackFrame } from '../lib/track';
import { readingAt } from '../lib/weather';
import { GhostLapScene, type Racer } from '../scenes/GhostLapScene';
import { usePlayback } from '../store/playback';

/**
 * Fixed colours for the two cars. Team colours often clash (both cars here are
 * McLarens), so the first car is always orange and the second always blue.
 * The pair, with the conditions chart's green, passes the dataviz palette
 * validator on the dark panel (lightness band, colour-blind separation, contrast).
 */
const COLOURS = ['#e07020', '#4c8dff'] as const;
const JUMP_S = 2;

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

  useEffect(() => {
    usePlayback.getState().load(Math.max(a.lap.lapTime, b.lap.lapTime));
  }, [a, b]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, button, textarea, select')) return;
      const { toggle, seek, time } = usePlayback.getState();
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.code === 'ArrowLeft') {
        seek(time - JUMP_S);
      } else if (e.code === 'ArrowRight') {
        seek(time + JUMP_S);
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

          <div className="stage">
            <GhostLapScene racers={racers} frame={frame} curve={curve} />
            <ConditionsStrip reading={conditionsA} title={`At ${a.lap.driver.code}'s lap`} />
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
              <span>Height ×3 · cars and track enlarged · drag to orbit</span>
            </div>
          </div>
        </section>

        <aside className="side">
          <GapCard a={a} b={b} profile={profile} />
          <DriverCard racer={a} sessionBest={sessionBestSectors} conditions={conditionsA} utcOffset={session.utcOffset} />
          <DriverCard racer={b} sessionBest={sessionBestSectors} conditions={conditionsB} utcOffset={session.utcOffset} />
          <PlaybackControls />
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
