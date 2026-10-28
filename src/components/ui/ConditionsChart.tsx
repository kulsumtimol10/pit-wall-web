import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { WeatherReading } from '../../lib/data-types';
import { compass, localClock, localMinutes } from '../../lib/weather';

export interface LapMarker {
  code: string;
  /** The driver's colour, matching the cars and chips */
  colour: string;
  startedAt: string;
  segment?: string | null;
}

interface Props {
  readings: WeatherReading[];
  utcOffset?: string;
  laps: LapMarker[];
}

/** Line colour validated against the panel surface and both driver colours (dataviz validator, dark mode). */
const LINE = '#199e70';
const HEIGHT = 236;
/** Top margin holds up to two rows of lap labels. */
const M = { top: 48, right: 16, bottom: 28, left: 40 };
const LABEL_ROWS = [16, 34];
/** Rough label width per character at 11px, for collision checks. */
const CHAR_PX = 6.8;

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(Math.round(minutes % 60)).padStart(2, '0')}`;

/** Track temperature through the session, with the two replayed laps marked. */
export function ConditionsChart({ readings, utcOffset, laps }: Props) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);

  const xs = readings.map((r) => localMinutes(r.date, utcOffset));
  const temps = readings.map((r) => r.trackTemp);
  const x0 = xs[0];
  const x1 = xs[xs.length - 1];
  let y0 = Math.floor(Math.min(...temps));
  let y1 = Math.ceil(Math.max(...temps));
  if (y1 === y0) [y0, y1] = [y0 - 1, y1 + 1];
  const yStep = y1 - y0 > 6 ? 2 : 1;

  const plotW = Math.max(0, width - M.left - M.right);
  const plotH = HEIGHT - M.top - M.bottom;
  const sx = (m: number) => M.left + ((m - x0) / (x1 - x0 || 1)) * plotW;
  const sy = (t: number) => M.top + (1 - (t - y0) / (y1 - y0)) * plotH;

  const line = xs.map((m, i) => `${i ? 'L' : 'M'}${sx(m).toFixed(1)} ${sy(temps[i]).toFixed(1)}`).join('');
  const yTicks = Array.from({ length: Math.floor((y1 - y0) / yStep) + 1 }, (_, i) => y0 + i * yStep);
  const xTicks: number[] = [];
  for (let m = Math.ceil(x0 / 10) * 10; m <= x1; m += 10) xTicks.push(m);

  // Lap labels sit beside their marker; a label that would overlap one already
  // placed drops to the second row instead.
  const placed: { x0: number; x1: number; row: number }[] = [];
  const markers = laps
    .map((lap) => ({ ...lap, x: sx(localMinutes(lap.startedAt, utcOffset)), text: `${lap.code}${lap.segment ? ` · ${lap.segment} lap` : ''}` }))
    .sort((p, q) => p.x - q.x)
    .map((m) => {
      const w = m.text.length * CHAR_PX + 22;
      const right = m.x + w < width - M.right;
      const x0 = right ? m.x : m.x - w;
      const row = placed.some((p) => p.row === 0 && p.x0 < x0 + w && x0 < p.x1) ? 1 : 0;
      placed.push({ x0, x1: x0 + w, row });
      return { ...m, right, y: LABEL_ROWS[row] };
    });

  const nearest = (minutes: number) => {
    let best = 0;
    xs.forEach((m, i) => {
      if (Math.abs(m - minutes) < Math.abs(xs[best] - minutes)) best = i;
    });
    return best;
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left;
    setActive(nearest(x0 + ((px - M.left) / (plotW || 1)) * (x1 - x0)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = readings.length - 1;
    const step: Record<string, (i: number) => number> = {
      ArrowLeft: (i) => Math.max(0, i - 1),
      ArrowRight: (i) => Math.min(last, i + 1),
      Home: () => 0,
      End: () => last,
    };
    if (step[e.key]) {
      e.preventDefault();
      setActive((i) => step[e.key](i ?? 0));
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  };

  const reading = active !== null ? readings[active] : null;
  const tipLeft = active !== null ? sx(xs[active]) : 0;
  const tipOnLeft = tipLeft > width - 200;

  return (
    <section className="card conditions" aria-labelledby="conditions-title">
      <div className="card-head">
        <h2 id="conditions-title">Track temperature through the session</h2>
        <p className="muted">°C · local time at the circuit · hover or use arrow keys for air, humidity and wind</p>
      </div>

      <div
        ref={ref}
        className="chart"
        tabIndex={0}
        role="group"
        aria-label="Track temperature chart. Use the arrow keys to read each minute."
        onKeyDown={onKeyDown}
        onFocus={() => setActive((i) => i ?? 0)}
        onBlur={() => setActive(null)}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} onPointerMove={onPointerMove} onPointerLeave={() => setActive(null)}>
            <g aria-hidden="true">
              {yTicks.map((t) => (
                <g key={t}>
                  <line x1={M.left} x2={width - M.right} y1={sy(t)} y2={sy(t)} className="grid" />
                  <text x={M.left - 8} y={sy(t) + 4} className="tick" textAnchor="end">
                    {t}°
                  </text>
                </g>
              ))}
              {xTicks.map((m) => (
                <text key={m} x={sx(m)} y={HEIGHT - 8} className="tick" textAnchor="middle">
                  {hhmm(m)}
                </text>
              ))}
              {markers.map((m) => (
                <g key={m.code}>
                  <line x1={m.x} x2={m.x} y1={m.y - 4} y2={HEIGHT - M.bottom} stroke={m.colour} strokeWidth={1.5} />
                  <circle cx={m.right ? m.x + 10 : m.x - 10} cy={m.y - 4} r={4} fill={m.colour} />
                  <text x={m.right ? m.x + 18 : m.x - 18} y={m.y} className="marker-label" textAnchor={m.right ? 'start' : 'end'}>
                    {m.text}
                  </text>
                </g>
              ))}
              <path d={line} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {active !== null && (
                <g>
                  <line x1={sx(xs[active])} x2={sx(xs[active])} y1={M.top} y2={HEIGHT - M.bottom} className="crosshair" />
                  <circle cx={sx(xs[active])} cy={sy(temps[active])} r={4} fill={LINE} stroke="#0a0e14" strokeWidth={2} />
                </g>
              )}
            </g>
          </svg>
        )}
        {reading && (
          <div className="chart-tip" style={{ left: tipLeft, transform: tipOnLeft ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }} aria-live="polite">
            <p className="tip-time">{localClock(reading.date, utcOffset)}</p>
            <p>
              <span className="line-key" style={{ background: LINE }} />
              <strong>{reading.trackTemp.toFixed(1)} °C</strong> track
            </p>
            <p>
              <strong>{reading.airTemp.toFixed(1)} °C</strong> air
            </p>
            <p>
              <strong>{reading.humidity}%</strong> humidity
            </p>
            <p>
              <strong>
                {compass(reading.windDirection)} {reading.windSpeed.toFixed(1)} m/s
              </strong>{' '}
              wind
            </p>
            <p className="muted">{reading.rainfall ? 'Rain' : 'Dry'}</p>
          </div>
        )}
      </div>

      <details className="readings">
        <summary>All {readings.length} readings as a table</summary>
        <div className="table-scroll short">
          <table>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col" className="num">
                  Track °C
                </th>
                <th scope="col" className="num">
                  Air °C
                </th>
                <th scope="col" className="num">
                  Humidity
                </th>
                <th scope="col">Wind</th>
                <th scope="col">Rain</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr key={r.date}>
                  <td className="mono">{localClock(r.date, utcOffset)}</td>
                  <td className="num mono">{r.trackTemp.toFixed(1)}</td>
                  <td className="num mono">{r.airTemp.toFixed(1)}</td>
                  <td className="num mono">{r.humidity}%</td>
                  <td className="mono">
                    {compass(r.windDirection)} {r.windSpeed.toFixed(1)} m/s
                  </td>
                  <td>{r.rainfall ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
