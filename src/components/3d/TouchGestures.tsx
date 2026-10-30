import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { TOUCH, Vector3 } from 'three';
import { fingerAngle, turnBetween, type ScreenPoint } from '../../lib/gestures';
import { UP } from '../../lib/track';

/** How far two fingers must twist (radians) before the track turns, so pinching or moving doesn't wobble it. */
const TWIST_START = 0.2;

/** The parts of OrbitControls this component uses. */
interface TouchControls {
  touches: { ONE?: TOUCH; TWO?: TOUCH };
  target: Vector3;
  domElement?: HTMLElement;
}

/**
 * Touch gestures on the 3D view, as on a map. One finger scrolls the page, not
 * the track: the controls ignore one-finger gestures (the page shows a hint).
 * Two fingers move across the track and pinch to zoom (OrbitControls'
 * DOLLY_PAN), and twisting them turns the track. The matching
 * `touch-action: pan-y` lives in CSS on `.scene`, because OrbitControls resets
 * the inline style whenever it (re)attaches.
 */
export function TouchGestures() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as TouchControls | null;

  useEffect(() => {
    const element = controls?.domElement;
    if (!controls || !element) return;
    controls.touches = { ONE: undefined, TWO: TOUCH.DOLLY_PAN };

    const fingers = new Map<number, ScreenPoint>();
    const offset = new Vector3();
    let lastAngle = 0;
    let twisted = 0;
    let turning = false;

    const twoFingerAngle = () => {
      const [a, b] = [...fingers.values()];
      return fingerAngle(a, b);
    };
    // A finger landing or lifting starts the twist afresh.
    const startTwist = () => {
      turning = false;
      twisted = 0;
      if (fingers.size === 2) lastAngle = twoFingerAngle();
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      startTwist();
    };
    const onMove = (e: PointerEvent) => {
      if (!fingers.has(e.pointerId)) return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size !== 2) return;
      const angle = twoFingerAngle();
      const turn = turnBetween(lastAngle, angle);
      lastAngle = angle;
      twisted += turn;
      if (!turning && Math.abs(twisted) < TWIST_START) return;
      turning = true;
      // Fingers twisting clockwise turn the track clockwise with them. The
      // controls pick up the new camera position in their own update.
      offset.copy(camera.position).sub(controls.target).applyAxisAngle(UP, turn);
      camera.position.copy(controls.target).add(offset);
    };
    const onUp = (e: PointerEvent) => {
      if (fingers.delete(e.pointerId)) startTwist();
    };

    const doc = element.ownerDocument;
    element.addEventListener('pointerdown', onDown);
    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', onUp);
    doc.addEventListener('pointercancel', onUp);
    return () => {
      element.removeEventListener('pointerdown', onDown);
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerup', onUp);
      doc.removeEventListener('pointercancel', onUp);
    };
  }, [camera, controls]);

  return null;
}
