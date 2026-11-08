/**
 * A real car is ~5.6 m long on a ~2.5 km wide track, so at true size it is a
 * pixel or two from the overview camera. Cars are scaled with camera distance
 * instead: roughly constant on screen when zoomed out, and back to life size
 * (scale 1) when the camera comes close.
 */
const METRES_PER_SCALE = 160;
const MAX_SCALE = 30;

/** How many times life size a car is drawn when the camera is this far from it. */
export const carScale = (cameraDistance: number) => Math.min(MAX_SCALE, Math.max(1, cameraDistance / METRES_PER_SCALE));

/** How far a car, and its trail, sits off the racing line at that size: the split grows with the car, up to four times. */
export const sideShift = (offset: number, scale: number) => offset * Math.min(scale, 4);
