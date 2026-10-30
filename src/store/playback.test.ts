import { describe, expect, it } from 'vitest';
import { nextRate, RATES, usePlayback } from './playback';

describe('nextRate', () => {
  it('steps up through the speeds and wraps round to the slowest', () => {
    expect(nextRate(0.25)).toBe(0.5);
    expect(nextRate(1)).toBe(2);
    expect(nextRate(2)).toBe(RATES[0]);
  });
});

describe('restart', () => {
  it('goes back to the start line and plays, even when paused', () => {
    const { load, seek, toggle, restart } = usePlayback.getState();
    load(100);
    seek(42);
    toggle();
    expect(usePlayback.getState().playing).toBe(false);
    restart();
    expect(usePlayback.getState()).toMatchObject({ time: 0, playing: true });
  });
});
