import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { TOUCH } from 'three';

/** The part of OrbitControls this component changes. */
interface TouchControls {
  touches: { ONE?: TOUCH; TWO?: TOUCH };
}

/**
 * On touch screens one finger should scroll the page, not spin the track:
 * one-finger gestures are ignored by the controls and two fingers rotate and
 * zoom instead (the page shows a hint saying so). The matching
 * `touch-action: pan-y` lives in CSS on `.scene`, because OrbitControls
 * resets the inline style whenever it (re)attaches.
 */
export function TouchScroll() {
  const controls = useThree((s) => s.controls) as unknown as TouchControls | null;

  useEffect(() => {
    if (controls) controls.touches = { ONE: undefined, TWO: TOUCH.DOLLY_ROTATE };
  }, [controls]);

  return null;
}
