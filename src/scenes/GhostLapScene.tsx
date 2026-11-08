import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useMemo } from 'react';
import { MOUSE, type CatmullRomCurve3 } from 'three';
import { CameraRig } from '../components/3d/CameraRig';
import { CameraZoom } from '../components/3d/CameraZoom';
import { Car } from '../components/3d/Car';
import { FitCamera } from '../components/3d/FitCamera';
import { PanLimit } from '../components/3d/PanLimit';
import { PlaybackClock } from '../components/3d/PlaybackClock';
import { SpeedTrail } from '../components/3d/SpeedTrail';
import { TouchGestures } from '../components/3d/TouchGestures';
import { TrackRibbon } from '../components/3d/TrackRibbon';
import type { LapData } from '../lib/data-types';
import type { TrackFrame, Vec3 } from '../lib/track';
import { speedRange } from '../lib/trail';

const BACKGROUND = '#07090d';
/** Metres either side of the racing line for the two cars (see Car's offset). */
const CAR_SPLIT = 7;
/** Bloom is a full-screen pass, so it is kept to devices with a mouse, which usually have the GPU to spare. */
const BLOOM = window.matchMedia('(pointer: fine)').matches;
/**
 * Map-style mouse: drag moves across the track, right-drag rotates. (The
 * controls also rotate on Ctrl, ⌘ or Shift + drag.)
 */
const MOUSE_BUTTONS = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };

export interface Racer {
  lap: LapData;
  colour: string;
}

interface Props {
  racers: [Racer, Racer];
  frame: TrackFrame;
  curve: CatmullRomCurve3;
  /** Which racer the chase camera follows */
  follow: number;
}

/** Two real laps racing on a 3D track. */
export function GhostLapScene({ racers, frame, curve, follow }: Props) {
  // A sphere around the track for fitting the camera.
  const bounds = useMemo(() => {
    const points = curve.getSpacedPoints(400);
    const mid = (axis: 'x' | 'y' | 'z') => {
      const values = points.map((p) => p[axis]);
      return (Math.min(...values) + Math.max(...values)) / 2;
    };
    const center: Vec3 = [mid('x'), mid('y'), mid('z')];
    const radius = Math.max(...points.map((p) => Math.hypot(p.x - center[0], p.y - center[1], p.z - center[2])));
    return { center, radius: radius + 40 };
  }, [curve]);

  const gridSize = Math.ceil((frame.radius * 2.6) / 500) * 500;
  const [a, b] = racers;
  const range = useMemo(() => speedRange([a.lap.samples, b.lap.samples]), [a, b]);

  return (
    <Canvas className="scene" camera={{ fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={[BACKGROUND]} />
      {/* near/far follow the camera's distance (CameraZoom) */}
      <fog attach="fog" args={[BACKGROUND, 1e6, 2e6]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[800, 1600, 600]} intensity={1.6} />
      <gridHelper args={[gridSize, gridSize / 100, '#1c2531', '#11171f']} />
      <TrackRibbon curve={curve} />
      <SpeedTrail samples={b.lap.samples} curve={curve} offset={-CAR_SPLIT} range={range} colour={b.colour} />
      <SpeedTrail samples={a.lap.samples} curve={curve} offset={CAR_SPLIT} range={range} colour={a.colour} />
      <Car samples={b.lap.samples} curve={curve} colour={b.colour} offset={-CAR_SPLIT} />
      <Car samples={a.lap.samples} curve={curve} colour={a.colour} offset={CAR_SPLIT} />
      <PlaybackClock />
      {/* Wheel zoom only reaches the controls with Ctrl or ⌘ held (the page filters plain scrolling).
          screenSpacePanning off: dragging slides along the ground instead of up and down the screen. */}
      <OrbitControls
        makeDefault
        enableDamping
        zoomToCursor
        screenSpacePanning={false}
        mouseButtons={MOUSE_BUTTONS}
        maxPolarAngle={Math.PI / 2.1}
      />
      <TouchGestures />
      <PanLimit center={bounds.center} radius={bounds.radius} />
      <CameraZoom radius={bounds.radius} />
      {/* Before FitCamera: on the way back to overview it restores the lens and controls first. */}
      <CameraRig
        cars={[
          { samples: a.lap.samples, offset: CAR_SPLIT },
          { samples: b.lap.samples, offset: -CAR_SPLIT },
        ]}
        curve={curve}
        follow={follow}
      />
      <FitCamera center={bounds.center} radius={bounds.radius} />
      {BLOOM && (
        <EffectComposer multisampling={4}>
          {/* Only colours brighter than white cross the threshold: the trails and the rings under the cars. */}
          <Bloom mipmapBlur luminanceThreshold={1} intensity={0.9} radius={0.7} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
