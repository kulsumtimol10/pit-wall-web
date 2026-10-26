import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import type { Fog, PerspectiveCamera } from 'three';
import type { Vec3 } from '../../lib/track';

/** Direction the camera looks from: a raised three-quarter view, about 45 degrees down. */
const VIEW_DIRECTION: Vec3 = [0.35, 0.72, 0.6];

interface Props {
  /** Centre and radius of a sphere around everything that must stay in view */
  center: Vec3;
  radius: number;
}

/**
 * Places the camera so the whole sphere fits the canvas, for any window shape,
 * and again whenever the canvas is resized. Also aims the orbit controls at the
 * centre and pushes the fog past the far side so it only fades the grid.
 */
export function FitCamera({ center, radius }: Props) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const controls = useThree((s) => s.controls) as { target: { set: (...v: Vec3) => void }; update: () => void } | null;
  const scene = useThree((s) => s.scene);
  const { width, height } = useThree((s) => s.size);

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
    camera.near = distance / 100;
    camera.far = distance * 10;
    camera.lookAt(...center);
    camera.updateProjectionMatrix();

    controls?.target.set(...center);
    controls?.update();

    const fog = scene.fog as Fog | null;
    if (fog) {
      fog.near = distance + radius;
      fog.far = distance + radius * 4;
    }
  }, [camera, controls, scene, width, height, center, radius]);

  return null;
}
