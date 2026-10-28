import { gapAtFraction } from '../../lib/gap';
import { stateAtTime } from '../../lib/telemetry';
import type { Racer } from '../../scenes/GhostLapScene';
import { usePlayback } from '../../store/playback';

const signed = (s: number) => `${s < 0 ? '−' : '+'}${Math.abs(s).toFixed(3)}`;

/** How far the second driver is behind (or ahead of) the first, live. */
export function GapCard({ a, b, profile }: { a: Racer; b: Racer; profile: Float64Array }) {
  const time = usePlayback((s) => s.time);
  const sa = stateAtTime(a.lap.samples, time);
  const sb = stateAtTime(b.lap.samples, time);
  const finalGap = b.lap.lapTime - a.lap.lapTime;
  const done = sa.finished && sb.finished;
  const gap = done ? finalGap : gapAtFraction(profile, sb.fraction);
  const bCode = b.lap.driver.code;
  const aCode = a.lap.driver.code;

  return (
    <section className="card gap-card" aria-live="off">
      <p className="label">{done ? 'FINAL GAP' : `GAP AT ${Math.round(sb.distance).toLocaleString('en-GB')} M`}</p>
      <p className="gap-value" style={{ color: b.colour }}>
        {signed(gap)}
        <span className="unit"> s</span>
      </p>
      <p className="gap-note">
        {bCode} {gap >= 0 ? 'behind' : 'ahead of'} {aCode}. Finishes <span className="mono">{signed(finalGap)} s</span>.
      </p>
    </section>
  );
}
