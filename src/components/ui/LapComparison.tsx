import { useId, useMemo, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import type { Sectors } from '../../lib/data-types';
import { gapAtFraction } from '../../lib/gap';
import { stateAtTime, timeAtFraction, valueAtFraction } from '../../lib/telemetry';
import { brakeZones, channelByDistance, niceTicks, sectorEnds } from '../../lib/traces';
import type { Racer } from '../../scenes/GhostLapScene';
import { usePlayback } from '../../store/playback';
import { useWidth } from './useWidth';

/** The four charts top to bottom, in pixels, sharing one distance axis. */
const ROW = (() => {
  const speed = { top: 30, h: 170 };
  const throttle = { top: speed.top + speed.h + 18, h: 50 };
  const brake = { top: throttle.top + throttle.h + 16, h: 24 };
  const gap = { top: brake.top + brake.h + 20, h: 96 };
  return { speed, throttle, brake, gap, bottom: gap.top + gap.h, height: gap.top + gap.h + 30 };
})();
/** One series, so a neutral ink; the area under it takes the colour of whoever is ahead. */
const GAP_LINE = '#e6edf3';
/** Arrow keys move the reading point by this much of the lap (Shift: ten times as far). */
const KEY_STEP = 0.005;

type Row = { top: number; h: number };
const scale = (row: Row, lo: number, hi: number) => (v: number) => row.top + (1 - (v - lo) / (hi - lo)) * row.h;
const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const signed = (s: number) => `${s > 0 ? '+' : s < 0 ? '−' : ''}${Math.abs(s).toFixed(3)}`;
/** Axis ticks are round numbers, so no trailing zeros: "+0.2", not "+0.200". */
const tickLabel = (t: number) => (t === 0 ? '0' : `${t > 0 ? '+' : '−'}${Math.abs(t)}`);

interface Props {
  racers: [Racer, Racer];
  /** How far the second car is behind the first round the lap (buildGapProfile) */
  profile: Float64Array;
}

/**
 * Speed, throttle, brake and the gap between the two laps, by distance round
 * the lap. A dot on each speed line shows where that car is in the replay;
 * hovering (or the arrow keys) reads any point, and a click jumps the replay
 * there.
 */
export function LapComparison({ racers, profile }: Props) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const clipId = useId().replace(/[^\w-]/g, '');
  const [a, b] = racers;

  const data = useMemo(() => {
    const speeds = [...a.lap.samples.speed, ...b.lap.samples.speed];
    let low = 0;
    let high = 0;
    for (const g of profile) {
      low = Math.min(low, g);
      high = Math.max(high, g);
    }
    const pad = (high - low) * 0.12 || 0.05;
    return {
      laps: racers.map((r) => ({
        speed: channelByDistance(r.lap.samples, 'speed'),
        throttle: channelByDistance(r.lap.samples, 'throttle'),
        brakes: brakeZones(r.lap.samples),
      })),
      speedLo: Math.floor((Math.min(...speeds) - 10) / 50) * 50,
      speedHi: Math.ceil((Math.max(...speeds) + 10) / 50) * 50,
      gapLo: low - (low < 0 ? pad : pad * 0.4),
      gapHi: high + pad,
      /** The second car really gets ahead somewhere, not just smoothing noise around zero */
      secondAhead: low < -0.02,
      sectors: sectorEnds(a.lap.samples, a.lap.sectors),
      km: a.lap.samples.d[a.lap.samples.d.length - 1] / 1000,
    };
  }, [racers, a, b, profile]);

  const narrow = width < 520;
  const M = narrow ? { left: 50, right: 34 } : { left: 66, right: 44 };
  const plotW = Math.max(0, width - M.left - M.right);
  const sx = (f: number) => M.left + f * plotW;
  const speedY = scale(ROW.speed, data.speedLo, data.speedHi);
  const throttleY = scale(ROW.throttle, 0, 100);
  const gapY = scale(ROW.gap, data.gapLo, data.gapHi);
  const zeroY = gapY(0);
  const line = (points: [number, number][], y: (v: number) => number) =>
    points.map(([f, v], i) => `${i ? 'L' : 'M'}${sx(f).toFixed(1)} ${y(v).toFixed(1)}`).join('');

  const gapPoints: [number, number][] = [];
  for (let i = 0; i < profile.length; i += 2) gapPoints.push([i / (profile.length - 1), profile[i]]);
  const gapPath = line(gapPoints, gapY);

  // Driver labels at the end of the speed lines, pushed apart if they would touch.
  const ends = racers.map((r, i) => ({ code: r.lap.driver.code, y: speedY(data.laps[i].speed[data.laps[i].speed.length - 1][1]) }));
  if (Math.abs(ends[0].y - ends[1].y) < 13) {
    const mid = (ends[0].y + ends[1].y) / 2;
    const [upper, lower] = ends[0].y <= ends[1].y ? [ends[0], ends[1]] : [ends[1], ends[0]];
    upper.y = mid - 7;
    lower.y = mid + 7;
  }

  const kmTicks = Array.from({ length: Math.floor(data.km) + 1 }, (_, k) => k);
  const sectorOf = (f: number) => (!data.sectors ? null : f < data.sectors[0] ? 1 : f < data.sectors[1] ? 2 : 3);

  const seek = (f: number) => usePlayback.getState().seek(timeAtFraction(a.lap.samples, f));
  const fractionAt = (clientX: number, box: DOMRect) => Math.min(1, Math.max(0, (clientX - box.left - M.left) / (plotW || 1)));
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => setActive(fractionAt(e.clientX, e.currentTarget.getBoundingClientRect()));
  const onClick = (e: MouseEvent<SVGSVGElement>) => seek(fractionAt(e.clientX, e.currentTarget.getBoundingClientRect()));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? KEY_STEP * 10 : KEY_STEP;
    const move: Record<string, (f: number) => number> = {
      ArrowLeft: (f) => Math.max(0, f - step),
      ArrowRight: (f) => Math.min(1, f + step),
      Home: () => 0,
      End: () => 1,
    };
    if (move[e.key]) {
      e.preventDefault();
      setActive((f) => move[e.key](f ?? 0));
    } else if ((e.key === 'Enter' || e.key === ' ') && active !== null) {
      e.preventDefault();
      seek(active);
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  };

  // The reading sits beside the crosshair, or across the top on a phone, where it can't fit beside it.
  const tipX = active !== null ? sx(active) : 0;
  const tipStyle = narrow
    ? { left: 8, right: 8 }
    : { left: tipX, transform: tipX > width - 280 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' };
  const gapNow = active !== null ? gapAtFraction(profile, active) : 0;
  const sector = active !== null ? sectorOf(active) : null;

  return (
    <section className="card lap-compare" aria-labelledby="lap-compare-title">
      <div className="card-head">
        <h2 id="lap-compare-title">Lap comparison</h2>
        <p className="muted">By distance round the lap · hover or use the arrow keys to read a point · click to jump the replay there</p>
      </div>

      <div className="lap-legend">
        {racers.map((r) => (
          <span key={r.lap.driver.number}>
            <span className="key" style={{ background: r.colour }} />
            <strong>{r.lap.driver.code}</strong>
          </span>
        ))}
        <SectorChips racers={racers} />
      </div>

      <div
        ref={ref}
        className="chart"
        tabIndex={0}
        role="group"
        data-own-keys
        aria-label="Lap comparison chart. Use the arrow keys to read the lap point by point, Enter to jump the replay there."
        onKeyDown={onKeyDown}
        onFocus={() => setActive((f) => f ?? stateAtTime(a.lap.samples, usePlayback.getState().time).fraction)}
        onBlur={() => setActive(null)}
      >
        {width > 0 && (
          <svg width={width} height={ROW.height} onPointerMove={onPointerMove} onPointerLeave={() => setActive(null)} onClick={onClick} style={{ cursor: 'pointer' }}>
            <defs>
              <clipPath id={`${clipId}-ahead`}>
                <rect x={M.left} y={ROW.gap.top} width={plotW} height={Math.max(0, zeroY - ROW.gap.top)} />
              </clipPath>
              <clipPath id={`${clipId}-behind`}>
                <rect x={M.left} y={zeroY} width={plotW} height={Math.max(0, ROW.bottom - zeroY)} />
              </clipPath>
            </defs>
            <g aria-hidden="true">
              <text x={0} y={ROW.speed.top + 10} className="row-title">Speed</text>
              <text x={0} y={ROW.speed.top + 24} className="tick">km/h</text>
              {niceTicks(data.speedLo, data.speedHi, 3)
                .filter((t) => t > data.speedLo)
                .map((t) => (
                  <g key={t}>
                    <line x1={M.left} x2={sx(1)} y1={speedY(t)} y2={speedY(t)} className="grid" />
                    <text x={M.left - 8} y={speedY(t) + 4} className="tick" textAnchor="end">
                      {t}
                    </text>
                  </g>
                ))}

              <text x={0} y={ROW.throttle.top + ROW.throttle.h / 2 + 4} className="row-title">Throttle</text>
              <line x1={M.left} x2={sx(1)} y1={ROW.throttle.top} y2={ROW.throttle.top} className="grid" />
              <line x1={M.left} x2={sx(1)} y1={ROW.throttle.top + ROW.throttle.h} y2={ROW.throttle.top + ROW.throttle.h} className="grid" />
              <text x={M.left - 8} y={ROW.throttle.top + 4} className="tick" textAnchor="end">
                100%
              </text>

              <text x={0} y={ROW.brake.top + 10} className="row-title">Brake</text>

              <text x={0} y={ROW.gap.top + 10} className="row-title">Gap</text>
              <text x={0} y={ROW.gap.top + 24} className="tick">s</text>
              {niceTicks(data.gapLo, data.gapHi, 3).map((t) => (
                <g key={t}>
                  <line x1={M.left} x2={sx(1)} y1={gapY(t)} y2={gapY(t)} className={t === 0 ? 'zero' : 'grid'} />
                  <text x={M.left - 8} y={gapY(t) + 4} className="tick" textAnchor="end">
                    {tickLabel(t)}
                  </text>
                </g>
              ))}

              {data.sectors && (
                <g>
                  {data.sectors.map((f) => (
                    <line key={f} x1={sx(f)} x2={sx(f)} y1={ROW.speed.top - 12} y2={ROW.bottom} className="divider" />
                  ))}
                  {[
                    [0, data.sectors[0]],
                    [data.sectors[0], data.sectors[1]],
                    [data.sectors[1], 1],
                  ].map(([f0, f1], i) => (
                    <text key={i} x={sx((f0 + f1) / 2)} y={14} className="sector-label" textAnchor="middle">
                      {narrow ? `S${i + 1}` : `SECTOR ${i + 1}`}
                    </text>
                  ))}
                </g>
              )}

              {racers.map((r, i) => (
                <g key={r.lap.driver.number} fill="none" stroke={r.colour} strokeWidth={2} strokeLinejoin="round">
                  <path d={line(data.laps[i].speed, speedY)} />
                  <path d={line(data.laps[i].throttle, throttleY)} />
                </g>
              ))}
              {racers.map((r, i) =>
                data.laps[i].brakes.map(([f0, f1]) => (
                  <rect
                    key={`${r.lap.driver.number}-${f0}`}
                    x={sx(f0)}
                    y={ROW.brake.top + i * 14}
                    width={Math.max(2, sx(f1) - sx(f0))}
                    height={10}
                    rx={2}
                    fill={r.colour}
                  />
                )),
              )}
              {ends.map((end, i) => (
                <text key={end.code} x={sx(1) + 6} y={end.y + 4} className="end-label" fill={racers[i].colour}>
                  {end.code}
                </text>
              ))}

              <path d={`${gapPath}L${sx(1)} ${zeroY}L${sx(0)} ${zeroY}Z`} fill={a.colour} fillOpacity={0.16} clipPath={`url(#${clipId}-ahead)`} />
              <path d={`${gapPath}L${sx(1)} ${zeroY}L${sx(0)} ${zeroY}Z`} fill={b.colour} fillOpacity={0.16} clipPath={`url(#${clipId}-behind)`} />
              <path d={gapPath} fill="none" stroke={GAP_LINE} strokeWidth={2} strokeLinejoin="round" />
              <text x={M.left + 6} y={ROW.gap.top + 12} className="area-label">
                {a.lap.driver.code} ahead
              </text>
              {data.secondAhead && (
                <text x={M.left + 6} y={ROW.bottom - 6} className="area-label">
                  {b.lap.driver.code} ahead
                </text>
              )}

              <line x1={M.left} x2={sx(1)} y1={ROW.bottom + 8} y2={ROW.bottom + 8} className="axis" />
              {kmTicks.map((k) => (
                <text key={k} x={sx(k / data.km)} y={ROW.bottom + 24} className="tick" textAnchor="middle">
                  {k}
                </text>
              ))}
              <text x={sx(1) + 6} y={ROW.bottom + 24} className="tick">
                km
              </text>

              <ReplayDots racers={racers} sx={sx} speedY={speedY} gapY={gapY} profile={profile} />

              {active !== null && (
                <g>
                  <line x1={sx(active)} x2={sx(active)} y1={ROW.speed.top - 12} y2={ROW.bottom} className="crosshair" />
                  {racers.map((r) => (
                    <circle
                      key={r.lap.driver.number}
                      cx={sx(active)}
                      cy={speedY(valueAtFraction(r.lap.samples, 'speed', active))}
                      r={4}
                      fill={r.colour}
                      stroke="#0a0e14"
                      strokeWidth={2}
                    />
                  ))}
                  <circle cx={sx(active)} cy={gapY(gapNow)} r={4} fill={GAP_LINE} stroke="#0a0e14" strokeWidth={2} />
                </g>
              )}
            </g>
          </svg>
        )}
        {active !== null && (
          <div className="chart-tip lap-tip" style={tipStyle} aria-live="polite">
            <p className="tip-time">
              {(active * data.km).toFixed(2)} km{sector ? ` · sector ${sector}` : ''}
            </p>
            {racers.map((r) => {
              const s = r.lap.samples;
              return (
                <p key={r.lap.driver.number}>
                  <span className="line-key" style={{ background: r.colour }} />
                  <strong>{r.lap.driver.code}</strong> {Math.round(valueAtFraction(s, 'speed', active))} km/h ·{' '}
                  {ordinal(Math.round(valueAtFraction(s, 'gear', active)))} · {Math.round(valueAtFraction(s, 'throttle', active))}% throttle
                  {valueAtFraction(s, 'brake', active) >= 50 ? ' · braking' : ''}
                </p>
              );
            })}
            <p>
              <strong>{b.lap.driver.code} {signed(gapNow)} s</strong> {gapNow >= 0 ? 'behind' : 'ahead'}
            </p>
            <p className="muted">Click to jump the replay here</p>
          </div>
        )}
      </div>

      <SectorTable racers={racers} />
    </section>
  );
}

/** Where each car is in the replay: a dot on its speed line and a faint line down the charts. */
function ReplayDots({ racers, sx, speedY, gapY, profile }: { racers: [Racer, Racer]; sx: (f: number) => number; speedY: (v: number) => number; gapY: (v: number) => number; profile: Float64Array }) {
  const time = usePlayback((s) => s.time);
  const states = racers.map((r) => stateAtTime(r.lap.samples, time));
  return (
    <g>
      {racers.map((r, i) => (
        <g key={r.lap.driver.number}>
          <line x1={sx(states[i].fraction)} x2={sx(states[i].fraction)} y1={ROW.speed.top} y2={ROW.bottom} stroke={r.colour} strokeOpacity={0.4} strokeWidth={1.5} />
          <circle cx={sx(states[i].fraction)} cy={speedY(states[i].speed)} r={5} fill={r.colour} stroke="#0a0e14" strokeWidth={2} />
        </g>
      ))}
      <circle cx={sx(states[0].fraction)} cy={gapY(gapAtFraction(profile, states[0].fraction))} r={4} fill={GAP_LINE} stroke="#0a0e14" strokeWidth={2} />
    </g>
  );
}

const sectorDeltas = (a: Sectors | undefined, b: Sectors | undefined) =>
  [0, 1, 2].map((i) => (a?.[i] != null && b?.[i] != null ? (b[i] as number) - (a[i] as number) : null));

/** Who was faster in each sector and over the lap, and by how much. */
function SectorChips({ racers }: { racers: [Racer, Racer] }) {
  const [a, b] = racers;
  const deltas = sectorDeltas(a.lap.sectors, b.lap.sectors);
  const chip = (label: string, delta: number, lap = false) => {
    const faster = delta >= 0 ? a : b;
    return (
      <li key={label} className={lap ? 'lap' : undefined}>
        <span className="muted">{label}</span>
        <span className="dot" style={{ background: faster.colour }} />
        <strong>{faster.lap.driver.code}</strong>
        <span className="mono">−{Math.abs(delta).toFixed(3)} s</span>
      </li>
    );
  };
  return (
    <ul className="sector-chips" aria-label="Faster driver in each sector">
      {deltas.map((d, i) => (d === null ? null : chip(`Sector ${i + 1}`, d)))}
      {chip('Lap', b.lap.lapTime - a.lap.lapTime, true)}
    </ul>
  );
}

/** The same comparison as a table, for reading without the chart. */
function SectorTable({ racers }: { racers: [Racer, Racer] }) {
  const [a, b] = racers;
  const deltas = sectorDeltas(a.lap.sectors, b.lap.sectors);
  const time = (t: number | null | undefined) => (t == null ? '–' : t.toFixed(3));
  const faster = (delta: number | null) => (delta === null ? '–' : `${(delta >= 0 ? a : b).lap.driver.code} by ${Math.abs(delta).toFixed(3)} s`);
  const top = (r: Racer) => Math.round(Math.max(...r.lap.samples.speed));
  return (
    <details className="readings">
      <summary>Sector times and top speeds as a table</summary>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col"> </th>
              <th scope="col" className="num">
                {a.lap.driver.code}
              </th>
              <th scope="col" className="num">
                {b.lap.driver.code}
              </th>
              <th scope="col">Faster</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((i) => (
              <tr key={i}>
                <th scope="row">Sector {i + 1}</th>
                <td className="num mono">{time(a.lap.sectors?.[i])}</td>
                <td className="num mono">{time(b.lap.sectors?.[i])}</td>
                <td>{faster(deltas[i])}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Lap</th>
              <td className="num mono">{a.lap.lapTime.toFixed(3)}</td>
              <td className="num mono">{b.lap.lapTime.toFixed(3)}</td>
              <td>{faster(b.lap.lapTime - a.lap.lapTime)}</td>
            </tr>
            <tr>
              <th scope="row">Top speed</th>
              <td className="num mono">{top(a)} km/h</td>
              <td className="num mono">{top(b)} km/h</td>
              <td>{top(a) === top(b) ? 'Level' : `${(top(a) > top(b) ? a : b).lap.driver.code} by ${Math.abs(top(a) - top(b))} km/h`}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  );
}
