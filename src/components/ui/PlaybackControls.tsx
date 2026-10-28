import { formatClock } from '../../lib/track';
import { RATES, replayEnd, usePlayback } from '../../store/playback';

/** Play/pause, a scrubber over the whole replay and speed buttons. */
export function PlaybackControls() {
  const { time, duration, playing, rate, seek, toggle, setRate } = usePlayback();
  const end = replayEnd(duration);

  return (
    <section className="card playback">
      <div className="playback-row">
        <button type="button" className="play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          )}
        </button>
        <div className="scrub">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Replay position"
            style={{ '--progress': `${(time / (duration || 1)) * 100}%` } as React.CSSProperties}
          />
          <div className="scrub-times mono">
            <span className="now">{formatClock(Math.min(time, end))}</span>
            <span>{formatClock(end)}</span>
          </div>
        </div>
      </div>
      <div className="rates" role="group" aria-label="Playback speed">
        {RATES.map((r) => (
          <button key={r} type="button" aria-pressed={rate === r} onClick={() => setRate(r)}>
            {r}×
          </button>
        ))}
      </div>
      <p className="hint">Space to play or pause · ← → to jump 2 s · + − to zoom</p>
    </section>
  );
}
