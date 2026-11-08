import { useFrame, useThree } from '@react-three/fiber';
import type { Vector3 } from 'three';
import { pullInside } from '../../lib/gestures';
import type { Vec3 } from '../../lib/track';
import { useView } from '../../store/view';

/**
 * Stops dragging from carrying the view off the track: the point the camera
 * orbits stays within `radius` of the track's centre, measured along the
 * ground. Runs after the controls' own update each frame and shifts the
 * camera with the point, so the view slides back without turning.
 */
export function PanLimit({ center, radius }: { center: Vec3; radius: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: Vector3 } | null;

  useFrame(() => {
    // Only the free overview camera can be dragged away; the others follow the cars.
    if (!controls || useView.getState().camera !== 'overview') return;
    const { target } = controls;
    const [sx, sz] = pullInside(target.x - center[0], target.z - center[2], radius);
    if (sx === 0 && sz === 0) return;
    target.x += sx;
    target.z += sz;
    camera.position.x += sx;
    camera.position.z += sz;
  });

  return null;
}
