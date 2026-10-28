# pit-wall-web

The 3D website (frontend) for Pit Wall: real Formula 1 laps rendered in 3D with
React Three Fiber. Race data comes from [pit-wall-data](../pit-wall-data), which
publishes JSON files to GitHub Pages.

Ghost Lap (Phase 1) replays two real qualifying laps on a 3D track with real
elevation: Norris and Piastri, 2025 Belgian GP. One clock drives both cars,
the live gap, each driver's speed, gear, throttle and brake, and the
play/pause/scrub/speed controls (Space plays or pauses, ← → jump 2 s).

## Commands

```bash
npm install
npm run dev         # http://localhost:5173
npm run build       # type check + production build into dist/
npm run typecheck
npm test            # telemetry interpolation and gap maths
```

## Where the data comes from

The site reads `VITE_DATA_URL`:

| Setting | Value |
| --- | --- |
| Development (default, `.env.development`) | `http://localhost:4000/v1`, run `npm run serve` in pit-wall-data |
| Offline (create `.env.development.local`) | `VITE_DATA_URL=/sample-data/v1` |
| Production (Vercel environment variable) | `https://<your-username>.github.io/pit-wall-data/v1` |

`src/lib/data-types.ts` is a copy of pit-wall-data's `src/types.ts`; keep them identical.

## Structure

```text
src/
├─ App.tsx                   loads the data
├─ pages/GhostLap.tsx        page layout, keyboard shortcuts
├─ scenes/GhostLapScene.tsx  the 3D scene
├─ components/3d/            TrackRibbon, Car, PlaybackClock, FitCamera
├─ components/ui/            TopNav, GapCard, DriverCard, PlaybackControls
├─ store/playback.ts         the shared replay clock (Zustand)
└─ lib/                      data loading and types, telemetry, gap, track maths
```

## Credits

Data: [OpenF1](https://openf1.org), CC BY-NC-SA 4.0. Unofficial fan project,
not associated with Formula 1.
