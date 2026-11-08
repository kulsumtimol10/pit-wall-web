import { useCallback, useEffect, useRef, useState } from 'react';
import { DATA_URL, fetchIndex, fetchLap, fetchSession } from './lib/data';
import type { DataIndex, LapData, SessionFile } from './lib/data-types';
import { findSession, latestSession, pickDrivers, readSelection, selectionSearch, type Selection } from './lib/selection';
import { GhostLapPage } from './pages/GhostLap';

interface Replay {
  index: DataIndex;
  session: SessionFile;
  laps: [LapData, LapData];
}

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; replay: Replay };

/** Loads the replay a URL asks for, falling back to the latest session and its front row. */
async function loadReplay(search: string): Promise<Replay> {
  const index = await fetchIndex();
  const wanted = readSelection(search);
  const summary = (wanted.session !== null && findSession(index, wanted.session)?.session) || latestSession(index);
  if (!summary) throw new Error('The data index has no sessions yet');
  const session = await fetchSession(summary.file);
  const codes = pickDrivers(
    session.laps.map((l) => l.driver.code),
    wanted.drivers,
  );
  if (!codes) throw new Error(`${session.session.meeting} ${session.session.name} has fewer than two laps`);
  const [a, b] = await Promise.all(codes.map((code) => fetchLap(session.laps.find((l) => l.driver.code === code)!.file)));
  return { index, session, laps: [a, b] };
}

const selectionOf = ({ session, laps }: Replay): Selection => ({
  session: session.session.key,
  drivers: [laps[0].driver.code, laps[1].driver.code],
});

export function App() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const latestRequest = useRef(0);

  /** Loads a replay and shows it, unless a newer one was asked for meanwhile (then returns null). */
  const show = useCallback(async (search: string) => {
    const request = ++latestRequest.current;
    const replay = await loadReplay(search);
    if (request !== latestRequest.current) return null;
    setLoad({ status: 'ready', replay });
    return replay;
  }, []);

  // The first visit, and the browser's back and forward buttons. The URL is
  // rewritten to what is shown, so copying it gives a link to this replay.
  useEffect(() => {
    const fromUrl = () => {
      show(window.location.search)
        .then((replay) => replay && history.replaceState(null, '', selectionSearch(selectionOf(replay))))
        .catch((err: unknown) => setLoad({ status: 'error', message: String(err) }));
    };
    fromUrl();
    window.addEventListener('popstate', fromUrl);
    return () => window.removeEventListener('popstate', fromUrl);
  }, [show]);

  /** Switches to another replay from the picker, which shows any error. */
  const choose = useCallback(
    async (selection: Selection) => {
      const replay = await show(selectionSearch(selection));
      if (replay) history.pushState(null, '', selectionSearch(selectionOf(replay)));
    },
    [show],
  );

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
            <code>VITE_DATA_URL=/sample-data</code> in <code>.env.development.local</code> to use the bundled sample.
          </p>
        </section>
      </div>
    );
  }

  const { index, session, laps } = load.replay;
  return (
    // A new replay starts fresh: playback, camera and charts.
    <GhostLapPage
      key={`${session.session.key} ${laps[0].driver.code} ${laps[1].driver.code}`}
      index={index}
      data={session}
      laps={laps}
      onChoose={choose}
    />
  );
}
