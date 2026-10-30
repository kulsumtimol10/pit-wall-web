import { create } from 'zustand';

/** Pause this long after the slower car finishes before the replay loops. */
const END_HOLD_S = 1.5;

export const RATES = [0.25, 0.5, 1, 2] as const;

interface PlaybackState {
  /** Seconds since both cars crossed the start line */
  time: number;
  duration: number;
  playing: boolean;
  rate: number;
  /** Sets the replay length from the slower lap */
  load: (slowestLap: number) => void;
  seek: (time: number) => void;
  advance: (seconds: number) => void;
  toggle: () => void;
  /** Back to the start line, playing */
  restart: () => void;
  setRate: (rate: number) => void;
}

/** One clock drives both cars, the HUD and the scrubber. */
export const usePlayback = create<PlaybackState>((set, get) => ({
  time: 0,
  duration: 0,
  playing: true,
  rate: 1,
  load: (slowestLap) => set({ duration: slowestLap + END_HOLD_S, time: 0 }),
  seek: (time) => set({ time: Math.min(get().duration, Math.max(0, time)) }),
  advance: (seconds) => {
    const { time, duration, rate } = get();
    const next = time + seconds * rate;
    set({ time: next > duration ? 0 : next });
  },
  toggle: () => set({ playing: !get().playing }),
  restart: () => set({ time: 0, playing: true }),
  setRate: (rate) => set({ rate }),
}));

/** The replay's length without the hold at the end, for display. */
export const replayEnd = (duration: number) => Math.max(0, duration - END_HOLD_S);

/** The speed after this one, wrapping round to the slowest (the one-button speed control). */
export function nextRate(rate: number): number {
  const i = RATES.indexOf(rate as (typeof RATES)[number]);
  return RATES[(i + 1) % RATES.length];
}
