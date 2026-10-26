import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import type { LapSamples } from '../../lib/data-types';
import { lapPoints, speedColours, type TrackFrame, type Vec3 } from '../../lib/track';

/** Draw a post from the ground to the track every this many samples. */
const POST_EVERY = 6;
/** Height in metres of the white start/finish post above the track. */
const START_POST_HEIGHT = 120;

interface Props {
  samples: LapSamples;
  frame: TrackFrame;
}

/** The driven line coloured by speed, its shadow on the ground, posts showing elevation, and a start/finish post. */
export function TrackLine({ samples, frame }: Props) {
  const points = useMemo(() => lapPoints(samples, frame), [samples, frame]);
  const colours = useMemo(() => speedColours(samples), [samples]);
  const shadow = useMemo(() => points.map(([x, , z]): Vec3 => [x, 0, z]), [points]);
  const posts = useMemo(() => {
    const coords: number[] = [];
    points.forEach(([x, y, z], i) => {
      if (i % POST_EVERY === 0) coords.push(x, 0, z, x, y, z);
    });
    return new Float32Array(coords);
  }, [points]);
  const [sx, sy, sz] = points[0];

  return (
    <group>
      <Line points={points} vertexColors={colours} lineWidth={3} />
      <Line points={shadow} color="#3b4656" lineWidth={1} transparent opacity={0.7} />
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posts, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#2a3442" transparent opacity={0.6} />
      </lineSegments>
      <mesh position={[sx, (sy + START_POST_HEIGHT) / 2, sz]}>
        <cylinderGeometry args={[3, 3, sy + START_POST_HEIGHT, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
