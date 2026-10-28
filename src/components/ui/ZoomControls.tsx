import { useView } from '../../store/view';

/** Zoom in, zoom out and fit-the-track buttons over the 3D view. */
export function ZoomControls() {
  const zoomIn = useView((s) => s.zoomIn);
  const zoomOut = useView((s) => s.zoomOut);
  const resetView = useView((s) => s.resetView);

  return (
    <div className="zoom-controls" role="group" aria-label="Zoom">
      <button type="button" onClick={zoomIn} aria-label="Zoom in" title="Zoom in (+)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button type="button" onClick={zoomOut} aria-label="Zoom out" title="Zoom out (−)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
      <button type="button" onClick={resetView} aria-label="Fit the whole track" title="Fit the whole track (0)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
    </div>
  );
}
