import type { ClassificationRow } from '../../lib/data-types';
import { formatLapTime } from '../../lib/track';
import type { Racer } from '../../scenes/GhostLapScene';

/** Qualifying runs as Q1, Q2, Q3; other sessions have a single time. */
const SEGMENT_NAMES = ['Q1', 'Q2', 'Q3'];

/** What goes in the Gap column: gap to pole in the final segment reached, or where they dropped out. */
function gapText(row: ClassificationRow, pole: number | null, isQualifying: boolean): string {
  if (row.status) return row.status;
  const [q1, q2, q3] = row.times;
  if (!isQualifying) {
    return q1 === null || pole === null ? 'No time' : q1 - pole < 0.0005 ? 'Fastest' : `+${(q1 - pole).toFixed(3)}`;
  }
  if (q3 !== null && pole !== null) return q3 - pole < 0.0005 ? 'Pole' : `+${(q3 - pole).toFixed(3)}`;
  if (row.position !== null && row.position <= 10) return 'No Q3 time';
  if (q2 !== null) return 'Out in Q2';
  if (q1 !== null) return 'Out in Q1';
  return 'No time';
}

/** The full session classification; the two drivers in the replay are marked in their colours. */
export function Leaderboard({ rows, racers, sessionName }: { rows: ClassificationRow[]; racers: Racer[]; sessionName: string }) {
  const columns = Math.max(...rows.map((r) => r.times.length));
  const isQualifying = columns === 3;
  const fastest = Array.from({ length: columns }, (_, i) => {
    const times = rows.map((r) => r.times[i]).filter((t): t is number => t !== null);
    return times.length ? Math.min(...times) : null;
  });
  const pole = isQualifying ? fastest[2] : fastest[0];
  const racerByNumber = new Map(racers.map((r) => [r.lap.driver.number, r]));

  return (
    <section className="card leaderboard" aria-labelledby="leaderboard-title">
      <div className="card-head">
        <h2 id="leaderboard-title">{sessionName} classification</h2>
        <p className="muted">
          <span className="purple-key" /> Fastest in each segment
        </p>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col" className="num">
                Pos
              </th>
              <th scope="col">Driver</th>
              {Array.from({ length: columns }, (_, i) => (
                <th key={i} scope="col" className="num">
                  {isQualifying ? SEGMENT_NAMES[i] : 'Time'}
                </th>
              ))}
              <th scope="col" className="num">
                Gap
              </th>
              <th scope="col" className="num">
                Laps
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const racer = racerByNumber.get(row.driver.number);
              return (
                <tr key={row.driver.number} className={racer ? 'in-replay' : undefined}>
                  <td className="num mono">{row.position ?? '–'}</td>
                  <td>
                    <span className="lb-driver">
                      <span className="team-bar" style={{ background: `#${row.driver.teamColour}` }} aria-hidden="true" />
                      <strong>{row.driver.code}</strong>
                      <span className="muted lb-name">{row.driver.team}</span>
                      {racer && (
                        <span className="replay-tag">
                          <span className="dot" style={{ background: racer.colour }} aria-hidden="true" />
                          In replay
                        </span>
                      )}
                    </span>
                  </td>
                  {Array.from({ length: columns }, (_, i) => {
                    const t = row.times[i] ?? null;
                    const isFastest = t !== null && fastest[i] !== null && Math.abs(t - fastest[i]!) < 0.0005;
                    return (
                      <td key={i} className="num mono">
                        {t === null ? (
                          <span className="muted">—</span>
                        ) : isFastest ? (
                          <span className="fastest" title={`Fastest ${isQualifying ? SEGMENT_NAMES[i] : ''} time`}>
                            {formatLapTime(t)}
                          </span>
                        ) : (
                          formatLapTime(t)
                        )}
                      </td>
                    );
                  })}
                  <td className="num mono gap">{gapText(row, pole, isQualifying)}</td>
                  <td className="num mono muted">{row.laps}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
