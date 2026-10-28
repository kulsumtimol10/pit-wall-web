import type { Sectors, Tyre, WeatherReading } from '../../lib/data-types';
import { idealLap, sectorsAt, type SectorColour } from '../../lib/sectors';
import { stateAtTime } from '../../lib/telemetry';
import { formatLapTime } from '../../lib/track';
import { localClock } from '../../lib/weather';
import type { Racer } from '../../scenes/GhostLapScene';
import { usePlayback } from '../../store/playback';

interface Props {
  racer: Racer;
  sessionBest?: Sectors;
  /** Weather when this lap started */
  conditions: WeatherReading | null;
  utcOffset?: string;
}

/** Pirelli compound colours, as used on F1 timing screens. */
const COMPOUNDS: Record<string, { letter: string; colour: string; name: string }> = {
  SOFT: { letter: 'S', colour: '#ff3b3b', name: 'softs' },
  MEDIUM: { letter: 'M', colour: '#ffd12e', name: 'mediums' },
  HARD: { letter: 'H', colour: '#f0f0ec', name: 'hards' },
  INTERMEDIATE: { letter: 'I', colour: '#43b02a', name: 'inters' },
  WET: { letter: 'W', colour: '#2b7de9', name: 'wets' },
};

const SECTOR_MEANING: Record<SectorColour, string> = {
  purple: 'fastest of the session',
  green: 'personal best',
  yellow: 'slower than personal best',
};

/** One driver's live speed, gear, throttle, brake and sector times, plus the lap's tyre and conditions. */
export function DriverCard({ racer, sessionBest, conditions, utcOffset }: Props) {
  const time = usePlayback((s) => s.time);
  const { lap, colour } = racer;
  const s = stateAtTime(lap.samples, time);
  const sectors = sectorsAt(lap, sessionBest, time);
  const ideal = idealLap(lap.personalBestSectors);
  const throttle = s.finished ? 0 : Math.round(s.throttle);
  const brake = !s.finished && s.brake > 0 ? 100 : 0;

  return (
    <section className="card driver-card" aria-label={`${lap.driver.name} telemetry`}>
      <div className="driver-head">
        <span className="driver-bar" style={{ background: colour }} />
        <span className="driver-code">{lap.driver.code}</span>
        <span className="muted">
          {titleCase(lap.driver.name)} · {lap.driver.team}
        </span>
        <span className="mono muted right">P{lap.position}</span>
      </div>

      <div className="lap-meta">
        {lap.tyre && <TyreLabel tyre={lap.tyre} />}
        {(lap.segment || lap.startedAt) && (
          <span>
            {lap.segment ? `${lap.segment} lap` : 'Lap'}
            {lap.startedAt ? ` at ${localClock(lap.startedAt, utcOffset)}` : ''}
          </span>
        )}
        {conditions && <span>Track {conditions.trackTemp.toFixed(1)} °C</span>}
      </div>

      {s.finished ? (
        <p className="finished">
          FINISHED <span className="mono">{formatLapTime(lap.lapTime)}</span>
        </p>
      ) : (
        <div className="readouts">
          <div>
            <p className="label">SPEED</p>
            <p className="readout">
              {Math.round(s.speed)}
              <span className="unit"> km/h</span>
            </p>
          </div>
          <div>
            <p className="label">GEAR</p>
            <p className="readout">{s.gear}</p>
          </div>
          {lap.speedTrap ? (
            <div title="Speed trap reading on this lap">
              <p className="label">TRAP</p>
              <p className="readout small">
                {lap.speedTrap}
                <span className="unit"> km/h</span>
              </p>
            </div>
          ) : null}
        </div>
      )}

      <div className="bars">
        <span>Throttle</span>
        <span className="bar">
          <span className="fill throttle" style={{ width: `${throttle}%` }} />
        </span>
        <span className="mono">{throttle}%</span>
        <span>Brake</span>
        <span className="bar">
          <span className="fill brake" style={{ width: `${brake}%` }} />
        </span>
        <span className="mono">{brake}%</span>
      </div>

      {sectors && (
        <ol className="sectors" aria-label="Sector times">
          {sectors.map((sector) => (
            <li
              key={sector.label}
              className={`sector ${sector.colour ?? 'pending'}`}
              title={sector.colour ? SECTOR_MEANING[sector.colour] : 'Not reached yet'}
            >
              <span className="sector-label">{sector.label}</span>
              <span className="mono">{sector.done && sector.time !== null ? sector.time.toFixed(3) : '—'}</span>
              {sector.colour && <span className="visually-hidden">, {SECTOR_MEANING[sector.colour]}</span>}
            </li>
          ))}
        </ol>
      )}

      {ideal !== null && (
        <p className="ideal">
          Best sectors combined <span className="mono">{formatLapTime(ideal)}</span>
          <span className="muted"> ({formatGap(ideal - lap.lapTime)} vs this lap)</span>
        </p>
      )}
    </section>
  );
}

function TyreLabel({ tyre }: { tyre: Tyre }) {
  const c = COMPOUNDS[tyre.compound] ?? { letter: '?', colour: '#8b98a8', name: tyre.compound.toLowerCase() };
  const age = `${tyre.age} lap${tyre.age === 1 ? '' : 's'} old`;
  return (
    <span className="tyre">
      <span className="tyre-badge" style={{ borderColor: c.colour }} aria-hidden="true">
        {c.letter}
      </span>
      {tyre.newSet ? 'New' : 'Used'} {c.name}, {age}
    </span>
  );
}

const formatGap = (s: number) => `${s < 0 ? '−' : '+'}${Math.abs(s).toFixed(3)} s`;

/** "Lando NORRIS" → "Lando Norris" */
function titleCase(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}
