import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import { CarMarker, type HudRefs } from '../components/3d/CarMarker';
import { FitCamera } from '../components/3d/FitCamera';
import { TrackLine } from '../components/3d/TrackLine';
import type { LapData } from '../lib/data-types';
import { lapPoints, trackFrame, type Vec3 } from '../lib/track';

const BACKGROUND = '#07090d';

interface Props {
  lap: LapData;
  hud: HudRefs;
}

/** Phase 0 test scene: one real lap as a 3D line with a dot driving it. */
export function TrackScene({ lap, hud }: Props) {
  const frame = useMemo(() => trackFrame(lap.samples), [lap]);

  // A sphere around the whole lap in scene units, for fitting the camera.
  const bounds = useMemo(() => {
    const points = lapPoints(lap.samples, frame);
    const axis = (i: number) => {
      const values = points.map((p) => p[i]);
      return (Math.min(...values) + Math.max(...values)) / 2;
    };
    const center: Vec3 = [axis(0), axis(1), axis(2)];
    const radius = Math.max(...points.map(([x, y, z]) => Math.hypot(x - center[0], y - center[1], z - center[2])));
    return { center, radius };
  }, [lap, frame]);

  const gridSize = Math.ceil((frame.radius * 2.6) / 500) * 500;

  return (
    <Canvas camera={{ fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={[BACKGROUND]} />
      {/* near/far are set by FitCamera once it knows the camera distance */}
      <fog attach="fog" args={[BACKGROUND, 1e6, 2e6]} />
      <gridHelper args={[gridSize, gridSize / 100, '#1c2531', '#11171f']} />
      <TrackLine samples={lap.samples} frame={frame} />
      <CarMarker lap={lap} frame={frame} hud={hud} />
      <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2.1} />
      <FitCamera center={bounds.center} radius={bounds.radius} />
    </Canvas>
  );
}
