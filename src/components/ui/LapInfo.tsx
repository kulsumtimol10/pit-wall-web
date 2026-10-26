import type { LapData, SessionInfo } from '../../lib/data-types';
import { ELEVATION_SCALE, formatLapTime } from '../../lib/track';

interface Props {
  session: SessionInfo;
  lap: LapData;
}

export function LapInfo({ session, lap }: Props) {
  const { driver } = lap;
  return (
    <section className="panel info">
      <p className="eyebrow">Pit Wall · Phase 0 test scene</p>
      <h1>
        {session.meeting} {session.year}
      </h1>
      <p className="muted">
        {session.name} · {session.circuit}
      </p>

      <div className="driver">
        <span className="team-chip" style={{ background: `#${driver.teamColour}` }} />
        <span className="pos">P{lap.position}</span>
        <span className="code">{driver.code}</span>
        <span className="muted">{driver.team}</span>
        <span className="lap-time">{formatLapTime(lap.lapTime)}</span>
      </div>

      <ul className="legend" aria-label="Line colour">
        <li>
          <span className="swatch" style={{ background: '#ff3b3b' }} />
          Braking
        </li>
        <li>
          <span className="swatch gradient" />
          Slow to fast
        </li>
        <li>
          <span className="swatch post" />
          Start / finish
        </li>
      </ul>

      <p className="hint">
        Height ×{ELEVATION_SCALE} · drag to orbit · scroll to zoom
      </p>
    </section>
  );
}
