import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import type { PerspectiveCamera } from 'three';
import type { Vec3 } from '../../lib/track';
import { useView } from '../../store/view';

/** Direction the camera looks from: a raised three-quarter view, about 45 degrees down. */
const VIEW_DIRECTION: Vec3 = [0.35, 0.72, 0.6];
/** Zoom limits: in to a few metres from the orbit point, out to this many times the fitted distance. */
const MIN_DISTANCE = 15;
const MAX_ZOOM_OUT = 2.5;

interface Props {
  /** Centre and radius of a sphere around everything that must stay in view */
  center: Vec3;
  radius: number;
}

/**
 * Places the camera so the whole sphere fits the canvas, for any window shape,
 * again whenever the canvas is resized, and when the reset button is pressed.
 * Also aims the orbit controls at the centre and sets their zoom limits.
 * (CameraZoom keeps the fog in step with the camera's distance.)
 */
export function FitCamera({ center, radius }: Props) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const controls = useThree((s) => s.controls) as {
    target: { set: (...v: Vec3) => void };
    minDistance: number;
    maxDistance: number;
    update: () => void;
  } | null;
  const { width, height } = useThree((s) => s.size);
  const resetToken = useView((s) => s.resetToken);

  useLayoutEffect(() => {
    const halfV = (camera.fov * Math.PI) / 360;
    const halfH = Math.atan(Math.tan(halfV) * (width / height));
    const distance = radius / Math.sin(Math.min(halfV, halfH));

    const [dx, dy, dz] = VIEW_DIRECTION;
    const len = Math.hypot(dx, dy, dz);
    camera.position.set(
      center[0] + (dx / len) * distance,
      center[1] + (dy / len) * distance,
      center[2] + (dz / len) * distance,
    );
    // Near plane small enough that zooming right in never slices through the track.
    camera.near = distance / 2000;
    camera.far = distance * 10;
    camera.lookAt(...center);
    camera.updateProjectionMatrix();

    if (controls) {
      controls.target.set(...center);
      controls.minDistance = MIN_DISTANCE;
      controls.maxDistance = distance * MAX_ZOOM_OUT;
      controls.update();
    }
  }, [camera, controls, width, height, center, radius, resetToken]);

  return null;
}
