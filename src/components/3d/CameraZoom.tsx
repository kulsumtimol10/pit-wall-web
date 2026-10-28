import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3, type Fog } from 'three';
import { easeDistance, zoomGoal } from '../../lib/zoom';
import { useView } from '../../store/view';

/** The parts of OrbitControls this component uses. */
interface ControlsLike {
  target: Vector3;
  minDistance: number;
  maxDistance: number;
  update: () => void;
  addEventListener: (type: 'start', listener: () => void) => void;
  removeEventListener: (type: 'start', listener: () => void) => void;
}

/**
 * Applies zoom presses from the page (+ / − buttons and keys) by easing the
 * camera toward or away from the point it orbits. Also keeps the fog just past
 * the far side of the track at every zoom level, so it only ever fades the grid.
 */
export function CameraZoom({ radius }: { radius: number }) {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const goal = useRef<number | null>(null);
  const offset = useMemo(() => new Vector3(), []);

  // A drag, pinch or Ctrl + scroll takes over from a zoom that is still easing in.
  useEffect(() => {
    if (!controls) return;
    const cancel = () => {
      goal.current = null;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controls]);

  useFrame((_, delta) => {
    if (!controls) return;
    offset.copy(camera.position).sub(controls.target);
    let distance = offset.length();

    const factor = useView.getState().takeZoom();
    if (factor !== 1) {
      goal.current = zoomGoal(goal.current ?? distance, factor, controls.minDistance, controls.maxDistance);
    }
    if (goal.current !== null) {
      distance = easeDistance(distance, goal.current, delta);
      if (distance === goal.current) goal.current = null;
      offset.setLength(distance);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    }

    const fog = scene.fog as Fog | null;
    if (fog) {
      fog.near = distance + radius;
      fog.far = distance + radius * 4;
    }
  });

  return null;
}
