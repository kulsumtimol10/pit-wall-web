import { useEffect, useRef, useState } from 'react';
import type { HudRefs } from './components/3d/CarMarker';
import { LapInfo } from './components/ui/LapInfo';
import { DATA_URL, fetchIndex, fetchSession } from './lib/data';
import type { SessionFile } from './lib/data-types';
import { TrackScene } from './scenes/TrackScene';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: SessionFile };

export function App() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const hud: HudRefs = {
    clock: useRef<HTMLSpanElement>(null),
    speed: useRef<HTMLSpanElement>(null),
    gear: useRef<HTMLSpanElement>(null),
  };

  useEffect(() => {
    let cancelled = false;
    fetchIndex()
      .then((index) => {
        const latest = index.sessions[0];
        if (!latest) throw new Error('The data index has no sessions yet');
        return fetchSession(latest.file);
      })
      .then((data) => !cancelled && setLoad({ status: 'ready', data }))
      .catch((err: unknown) => !cancelled && setLoad({ status: 'error', message: String(err) }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (load.status === 'loading') {
    return <p className="center muted">Loading lap data…</p>;
  }

  if (load.status === 'error') {
    return (
      <div className="center">
        <section className="panel error">
          <h1>Couldn't load race data</h1>
          <p className="muted">{load.message}</p>
          <p>
            The site reads data from <code>{DATA_URL || '(VITE_DATA_URL not set)'}</code>. Start the local data
            server in <code>pit-wall-data</code> with <code>npm run serve</code>, or set{' '}
            <code>VITE_DATA_URL=/sample-data/v1</code> in <code>.env.development.local</code> to use the bundled
            sample.
          </p>
        </section>
      </div>
    );
  }

  const { session, laps } = load.data;
  const lap = laps[0];

  return (
    <main className="app">
      <TrackScene lap={lap} hud={hud} />
      <LapInfo session={session} lap={lap} />
      <section className="panel hud" aria-label="Live telemetry">
        <div>
          <span className="label">Lap</span>
          <span className="value" ref={hud.clock}>
            000.0
          </span>
          <span className="unit">s</span>
        </div>
        <div>
          <span className="label">Speed</span>
          <span className="value" ref={hud.speed}>
            0
          </span>
          <span className="unit">km/h</span>
        </div>
        <div>
          <span className="label">Gear</span>
          <span className="value" ref={hud.gear}>
            –
          </span>
        </div>
      </section>
      <footer className="credit">
        Data: OpenF1 (CC BY-NC-SA 4.0) · Unofficial fan project, not associated with Formula 1
      </footer>
    </main>
  );
}
