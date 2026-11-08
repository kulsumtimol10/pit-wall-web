import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Vector3, type CatmullRomCurve3, type Fog, type PerspectiveCamera } from 'three';
import { activeSpot, tvSpots } from '../../lib/cameras';
import { newCarPlace, placeCar } from '../../lib/carPlace';
import type { LapSamples } from '../../lib/data-types';
import { UP } from '../../lib/track';
import { usePlayback } from '../../store/playback';
import { useView } from '../../store/view';

/** The field of view the overview camera (and FitCamera) works with. */
const OVERVIEW_FOV = 45;
/** Chase: metres behind and above the car, how far ahead it looks, and a wider lens. */
const CHASE = { back: 14, up: 4.5, ahead: 22, lookUp: 1.2, fov: 60 };
/** Top: metres above the two cars, north up. */
const TOP_HEIGHT = 420;
const NORTH = new Vector3(0, 0, -1);
/** TV: how many trackside cameras, how far back from the track and how high, and how long a shot holds after the cars pass (lap fraction). */
const TV = { count: 16, setBack: 70, height: 30, holdPast: 0.006 };
/** The + / − buttons scale the follow distance, height or lens within this range. */
const ZOOM_RANGE: [number, number] = [0.35, 3];

interface Props {
  /** The two cars as the scene draws them: their lap and their offset from the racing line */
  cars: { samples: LapSamples; offset: number }[];
  curve: CatmullRomCurve3;
  /** Which car the chase camera follows */
  follow: number;
}

/**
 * Films the replay in the chase, TV and top modes; overview belongs to the
 * orbit controls. Takes the camera off the controls while one of these modes
 * is on, and hands it back on the way out (FitCamera, after this in the tree,
 * then fits the whole track again).
 */
export function CameraRig({ cars, curve, follow }: Props) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null;
  const scene = useThree((s) => s.scene);
  const mode = useView((s) => s.camera);
  const resetToken = useView((s) => s.resetToken);

  const rig = useRef({ zoom: 1, spot: -1, cut: true, look: new Vector3() });
  const places = useMemo(() => [newCarPlace(), newCarPlace()], []);
  const v = useMemo(() => ({ want: new Vector3(), look: new Vector3(), mid: new Vector3() }), []);
  const spots = useMemo(() => tvSpots(curve, TV.count, TV.setBack, TV.height), [curve]);
  const spotFractions = useMemo(() => spots.map((s) => s.fraction), [spots]);

  useLayoutEffect(() => {
    if (controls) controls.enabled = mode === 'overview';
    camera.up.copy(mode === 'top' ? NORTH : UP);
    camera.fov = mode === 'chase' ? CHASE.fov : OVERVIEW_FOV;
    if (mode !== 'overview') camera.near = 0.5;
    camera.updateProjectionMatrix();
    rig.current.cut = true;
    rig.current.spot = -1;
  }, [mode, camera, controls]);

  // The fit button (and changing mode) puts the follow distance back to normal.
  useEffect(() => {
    rig.current.zoom = 1;
  }, [mode, resetToken]);

  useFrame((_, delta) => {
    if (mode === 'overview') return;
    const r = rig.current;
    const factor = useView.getState().takeZoom();
    if (factor !== 1) r.zoom = Math.min(ZOOM_RANGE[1], Math.max(ZOOM_RANGE[0], r.zoom * factor));

    const time = usePlayback.getState().time;
    cars.forEach((car, i) => placeCar(car.samples, curve, car.offset, time, camera.position, places[i]));
    v.mid.copy(places[0].position).add(places[1].position).multiplyScalar(0.5);
    // Ease towards the shot (a smooth follow); a cut jumps straight to it.
    let ease = r.cut ? 1 : 1 - Math.exp(-delta * 8);

    if (mode === 'chase') {
      const car = places[follow];
      v.want.copy(car.position).addScaledVector(car.tangent, -CHASE.back * r.zoom).addScaledVector(UP, CHASE.up * r.zoom);
      v.look.copy(car.position).addScaledVector(car.tangent, CHASE.ahead).addScaledVector(UP, CHASE.lookUp);
    } else if (mode === 'top') {
      v.want.copy(v.mid).addScaledVector(UP, TOP_HEIGHT * r.zoom);
      v.look.copy(v.mid);
    } else {
      const spot = activeSpot(spotFractions, (places[0].fraction + places[1].fraction) / 2, TV.holdPast);
      if (spot !== r.spot) {
        r.spot = spot;
        ease = 1;
      }
      v.want.copy(spots[spot].position);
      v.look.copy(v.mid);
      // A long lens that keeps both cars in shot, with some room round them.
      const spread = places[0].position.distanceTo(places[1].position) + 60;
      const fit = ((2 * Math.atan(spread / 2 / v.want.distanceTo(v.mid))) * 180) / Math.PI;
      const fov = Math.min(50, Math.max(4, fit * 1.4 * r.zoom));
      camera.fov += (fov - camera.fov) * ease;
      camera.updateProjectionMatrix();
    }

    camera.position.lerp(v.want, ease);
    r.look.lerp(v.look, ease);
    camera.lookAt(r.look);
    r.cut = false;

    // Haze the far side of the track, never the cars.
    const fog = scene.fog as Fog | null;
    if (fog) {
      const d = camera.position.distanceTo(r.look);
      fog.near = d + 400;
      fog.far = d + 3000;
    }
  });

  return null;
}
