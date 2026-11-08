import { create } from 'zustand';

/** Each zoom-in press multiplies the camera's distance by this; zoom-out divides by it. */
export const ZOOM_STEP = 0.7;

/** What the trails behind the cars are coloured by: their speed, or which driver they belong to. */
export type TrailColours = 'speed' | 'driver';

/** How the 3D view is filmed: free orbit (overview), behind a car (chase), from trackside (tv) or from above (top). */
export type CameraMode = 'overview' | 'chase' | 'tv' | 'top';

const TRAIL_COLOURS_KEY = 'pitwall.trailColours';

/** The visitor's last choice, if the browser kept it; speed otherwise. */
function savedTrailColours(): TrailColours {
  try {
    return localStorage.getItem(TRAIL_COLOURS_KEY) === 'driver' ? 'driver' : 'speed';
  } catch {
    return 'speed';
  }
}

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
  /** Zoom by any factor (Ctrl + scroll and pinches outside overview): below 1 moves in, above 1 out */
  zoomBy: (factor: number) => void;
  /** Remembered for the visitor's next visit */
  trailColours: TrailColours;
  setTrailColours: (mode: TrailColours) => void;
  camera: CameraMode;
  /** Going back to overview fits the whole track again */
  setCamera: (mode: CameraMode) => void;
  /** Which car (0 or 1) the chase camera follows; null until the visitor picks, meaning the slower lap */
  follow: number | null;
  setFollow: (index: number | null) => void;
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
  zoomBy: (factor) => set({ pendingZoom: get().pendingZoom * factor }),
  trailColours: savedTrailColours(),
  setTrailColours: (trailColours) => {
    set({ trailColours });
    try {
      localStorage.setItem(TRAIL_COLOURS_KEY, trailColours);
    } catch {
      // Storage blocked (private window): the choice just isn't remembered.
    }
  },
  camera: 'overview',
  setCamera: (camera) => {
    const { camera: current, resetToken } = get();
    if (camera === current) return;
    set({ camera, pendingZoom: 1, resetToken: camera === 'overview' ? resetToken + 1 : resetToken });
  },
  follow: null,
  setFollow: (follow) => set({ follow }),
}));
