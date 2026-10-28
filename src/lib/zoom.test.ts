import { describe, expect, it } from 'vitest';
import { useView, ZOOM_STEP } from '../store/view';
import { easeDistance, wheelZooms, zoomGoal, zoomModifier } from './zoom';

describe('zoomGoal', () => {
  it('scales the distance and stays inside the limits', () => {
    expect(zoomGoal(1000, 0.7, 20, 5000)).toBe(700);
    expect(zoomGoal(25, 0.5, 20, 5000)).toBe(20);
    expect(zoomGoal(4000, 2, 20, 5000)).toBe(5000);
  });
});

describe('easeDistance', () => {
  it('moves part of the way each frame and snaps at the end', () => {
    const next = easeDistance(1000, 700, 1 / 60);
    expect(next).toBeLessThan(1000);
    expect(next).toBeGreaterThan(700);
    expect(easeDistance(700.3, 700, 1 / 60)).toBe(700);
  });
  it('never overshoots on a slow frame', () => {
    expect(easeDistance(1000, 700, 1)).toBe(700);
  });
});

describe('wheelZooms', () => {
  it('zooms only with Ctrl or ⌘ held (trackpad pinch sends Ctrl)', () => {
    expect(wheelZooms({ ctrlKey: false, metaKey: false })).toBe(false);
    expect(wheelZooms({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(wheelZooms({ ctrlKey: false, metaKey: true })).toBe(true);
  });
});

describe('zoomModifier', () => {
  it('names ⌘ on Apple devices and Ctrl elsewhere', () => {
    expect(zoomModifier('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe('⌘');
    expect(zoomModifier('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Ctrl');
  });
});

describe('view store', () => {
  it('collects zoom presses until the scene takes them', () => {
    const { zoomIn, zoomOut, takeZoom } = useView.getState();
    zoomIn();
    zoomIn();
    expect(takeZoom()).toBeCloseTo(ZOOM_STEP * ZOOM_STEP);
    expect(takeZoom()).toBe(1);
    zoomIn();
    zoomOut();
    expect(takeZoom()).toBeCloseTo(1);
  });
  it('clears pending zoom when the view is reset', () => {
    const before = useView.getState().resetToken;
    useView.getState().zoomIn();
    useView.getState().resetView();
    expect(useView.getState().resetToken).toBe(before + 1);
    expect(useView.getState().takeZoom()).toBe(1);
  });
});
