import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import type { CatmullRomCurve3 } from 'three';
import { CameraZoom } from '../components/3d/CameraZoom';
import { Car } from '../components/3d/Car';
import { FitCamera } from '../components/3d/FitCamera';
import { PlaybackClock } from '../components/3d/PlaybackClock';
import { TouchScroll } from '../components/3d/TouchScroll';
import { TrackRibbon } from '../components/3d/TrackRibbon';
import type { LapData } from '../lib/data-types';
import type { TrackFrame, Vec3 } from '../lib/track';

const BACKGROUND = '#07090d';
/** Metres either side of the racing line for the two cars (see Car's offset). */
const CAR_SPLIT = 7;

export interface Racer {
  lap: LapData;
  colour: string;
}

interface Props {
  racers: [Racer, Racer];
  frame: TrackFrame;
  curve: CatmullRomCurve3;
}

/** Two real laps racing on a 3D track. */
export function GhostLapScene({ racers, frame, curve }: Props) {
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

  return (
    <Canvas className="scene" camera={{ fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={[BACKGROUND]} />
      {/* near/far follow the camera's distance (CameraZoom) */}
      <fog attach="fog" args={[BACKGROUND, 1e6, 2e6]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[800, 1600, 600]} intensity={1.6} />
      <gridHelper args={[gridSize, gridSize / 100, '#1c2531', '#11171f']} />
      <TrackRibbon curve={curve} samples={a.lap.samples} />
      <Car samples={b.lap.samples} curve={curve} colour={b.colour} offset={-CAR_SPLIT} />
      <Car samples={a.lap.samples} curve={curve} colour={a.colour} offset={CAR_SPLIT} />
      <PlaybackClock />
      {/* Wheel zoom only reaches the controls with Ctrl or ⌘ held (the page filters plain scrolling). */}
      <OrbitControls makeDefault enableDamping zoomToCursor maxPolarAngle={Math.PI / 2.1} />
      <TouchScroll />
      <CameraZoom radius={bounds.radius} />
      <FitCamera center={bounds.center} radius={bounds.radius} />
    </Canvas>
  );
}
