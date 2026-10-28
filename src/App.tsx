import { useEffect, useState } from 'react';
import { DATA_URL, fetchIndex, fetchSession } from './lib/data';
import type { SessionFile } from './lib/data-types';
import { GhostLapPage } from './pages/GhostLap';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: SessionFile };

export function App() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });

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

  if (load.data.laps.length < 2) {
    return <p className="center muted">This session has only one lap so far; Ghost Lap needs two drivers.</p>;
  }

  return <GhostLapPage data={load.data} />;
}
