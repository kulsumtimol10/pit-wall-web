# pit-wall-web

The 3D website (frontend) for Pit Wall: real Formula 1 laps rendered in 3D with
React Three Fiber. Race data comes from [pit-wall-data](../pit-wall-data), which
publishes JSON files to GitHub Pages.

Phase 0 shows one real lap (Lando Norris's pole lap, 2025 Belgian GP) as a 3D
line coloured by speed, with a dot driving it in real time.

## Commands

```bash
npm install
npm run dev         # http://localhost:5173
npm run build       # type check + production build into dist/
npm run typecheck
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
├─ App.tsx                 loads the data, lays out the page
├─ scenes/TrackScene.tsx   the 3D scene
├─ components/3d/          TrackLine, CarMarker, FitCamera
├─ components/ui/          LapInfo panel
└─ lib/                    data loading, data types, track maths
```

## Credits

Data: [OpenF1](https://openf1.org), CC BY-NC-SA 4.0. Unofficial fan project,
not associated with Formula 1.
