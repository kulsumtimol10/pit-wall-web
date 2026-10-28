import { create } from 'zustand';

/** Each zoom-in press multiplies the camera's distance by this; zoom-out divides by it. */
export const ZOOM_STEP = 0.7;

interface ViewState {
  /** Product of zoom presses the scene hasn't applied yet (1 = none) */
  pendingZoom: number;
  /** Bumped to ask the camera to fit the whole track again */
  resetToken: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  /** Returns the pending zoom and clears it. Called by the scene once per frame. */
  takeZoom: () => number;
}

/** Camera requests from the page's buttons and keys, picked up inside the 3D scene. */
export const useView = create<ViewState>((set, get) => ({
  pendingZoom: 1,
  resetToken: 0,
  zoomIn: () => set({ pendingZoom: get().pendingZoom * ZOOM_STEP }),
  zoomOut: () => set({ pendingZoom: get().pendingZoom / ZOOM_STEP }),
  resetView: () => set({ resetToken: get().resetToken + 1, pendingZoom: 1 }),
  takeZoom: () => {
    const factor = get().pendingZoom;
    if (factor !== 1) set({ pendingZoom: 1 });
    return factor;
  },
}));
