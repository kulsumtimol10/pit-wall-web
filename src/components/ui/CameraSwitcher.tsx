import type { JSX } from 'react';
import type { Racer } from '../../scenes/GhostLapScene';
import { useView, type CameraMode } from '../../store/view';

const icon = (paths: JSX.Element) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
);

const MODES: { mode: CameraMode; label: string; title: string; icon: JSX.Element }[] = [
  {
    mode: 'overview',
    label: 'Overview',
    title: 'Overview: the whole track, free to move',
    icon: icon(
      <>
        <path d="M12 3l9 5v8l-9 5-9-5V8z" />
        <path d="M3 8l9 5 9-5" />
        <path d="M12 13v8" />
      </>,
    ),
  },
  {
    mode: 'chase',
    label: 'Chase',
    title: 'Chase: behind one car',
    icon: icon(
      <>
        <path d="M5 17h14" />
        <path d="M7 17l1.5-6h7l1.5 6" />
        <path d="M4 11h16" />
        <circle cx="7" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </>,
    ),
  },
  {
    mode: 'tv',
    label: 'TV',
    title: 'TV: trackside cameras that cut as the cars pass',
    icon: icon(
      <>
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="M16 10l5-3v10l-5-3" />
      </>,
    ),
  },
  {
    mode: 'top',
    label: 'Top',
    title: 'Top: straight down on both cars',
    icon: icon(
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 15c2-6 6 0 8-6" />
      </>,
    ),
  },
];

/** Camera buttons over the 3D view, and in chase, which car the camera follows. */
export function CameraSwitcher({ racers, follow }: { racers: [Racer, Racer]; follow: number }) {
  const camera = useView((s) => s.camera);
  const setCamera = useView((s) => s.setCamera);
  const setFollow = useView((s) => s.setFollow);
  const followed = racers[follow].lap.driver.code;
  const other = racers[1 - follow].lap.driver.code;

  return (
    <div className="camera-switcher">
      <div className="camera-modes" role="group" aria-label="Camera">
        {MODES.map((m) => (
          <button key={m.mode} type="button" aria-pressed={camera === m.mode} aria-label={m.label} title={m.title} onClick={() => setCamera(m.mode)}>
            {m.icon}
            <span className="label">{m.label}</span>
          </button>
        ))}
      </div>
      {camera === 'chase' && (
        <button
          type="button"
          className="follow"
          onClick={() => setFollow(1 - follow)}
          aria-label={`Following ${followed}. Follow ${other} instead`}
          title={`Follow ${other} instead`}
        >
          <span className="dot" style={{ background: racers[follow].colour }} />
          Following {followed}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 4L3 8l4 4" />
            <path d="M3 8h13" />
            <path d="M17 20l4-4-4-4" />
            <path d="M21 16H8" />
          </svg>
        </button>
      )}
    </div>
  );
}
