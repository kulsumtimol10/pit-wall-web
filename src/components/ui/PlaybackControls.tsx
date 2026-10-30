import { formatClock } from '../../lib/track';
import { nextRate, RATES, replayEnd, usePlayback } from '../../store/playback';

/**
 * The transport bar under the 3D view: play/pause, replay from the start, a
 * scrubber over the whole replay and speed. When the bar is too narrow for the
 * four speed buttons, one button steps through the speeds instead.
 */
export function PlaybackControls() {
  const { time, duration, playing, rate, seek, toggle, restart, setRate } = usePlayback();
  const end = replayEnd(duration);

  return (
    <div className="transport" role="group" aria-label="Replay controls">
      <button
        type="button"
        className="play"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        aria-keyshortcuts="Space"
        title={playing ? 'Pause (Space)' : 'Play (Space)'}
      >
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
      <button type="button" className="restart" onClick={restart} aria-label="Replay from the start" title="Replay from the start">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 6a7 7 0 1 0 6.06 3.5" />
          <path d="M15 3l-3 3 3 3" />
        </svg>
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
          aria-keyshortcuts="ArrowLeft ArrowRight"
          title="Drag to scrub · ← → to jump 2 s"
          style={{ '--progress': `${(time / (duration || 1)) * 100}%` } as React.CSSProperties}
        />
        <div className="scrub-times mono">
          <span className="now">{formatClock(Math.min(time, end))}</span>
          <span>{formatClock(end)}</span>
        </div>
      </div>
      <div className="rates" role="group" aria-label="Playback speed">
        {RATES.map((r) => (
          <button key={r} type="button" aria-pressed={rate === r} onClick={() => setRate(r)}>
            {r}×
          </button>
        ))}
      </div>
      <button
        type="button"
        className="rate-step mono"
        onClick={() => setRate(nextRate(rate))}
        aria-label={`Playback speed ${rate}×`}
        title="Change playback speed"
      >
        {rate}×
      </button>
    </div>
  );
}
