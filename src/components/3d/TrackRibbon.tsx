import { Line } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { DoubleSide, Vector3, type CatmullRomCurve3 } from 'three';
import type { LapSamples } from '../../lib/data-types';
import { buildRibbon } from '../../lib/track';

/** Track surface width in metres: about twice Spa's real 10-15 m, so the speed colours read from the overview. */
const TRACK_WIDTH = 28;
const SEGMENTS = 1600;
/** Elevation posts drawn from the ground to the track. */
const POSTS = 160;
const START_POST_HEIGHT = 120;

interface Props {
  curve: CatmullRomCurve3;
  /** The lap whose speed colours the surface */
  samples: LapSamples;
}

/** The track surface coloured by speed, its edges, its shadow on the ground and posts showing elevation. */
export function TrackRibbon({ curve, samples }: Props) {
  const ribbon = useMemo(() => buildRibbon(curve, samples, TRACK_WIDTH, SEGMENTS), [curve, samples]);
  useEffect(() => () => ribbon.geometry.dispose(), [ribbon]);

  const { shadow, posts, start } = useMemo(() => {
    const pts = curve.getSpacedPoints(POSTS);
    const coords: number[] = [];
    pts.forEach((p) => coords.push(p.x, 0, p.z, p.x, p.y, p.z));
    return {
      shadow: curve.getSpacedPoints(600).map((p) => new Vector3(p.x, 0, p.z)),
      posts: new Float32Array(coords),
      start: curve.getPointAt(0),
    };
  }, [curve]);

  return (
    <group>
      <mesh geometry={ribbon.geometry}>
        <meshBasicMaterial vertexColors side={DoubleSide} />
      </mesh>
      <Line points={ribbon.left} color="#e6edf3" lineWidth={1} transparent opacity={0.22} />
      <Line points={ribbon.right} color="#e6edf3" lineWidth={1} transparent opacity={0.22} />
      <Line points={shadow} color="#2a3442" lineWidth={1} transparent opacity={0.8} />
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posts, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#1d2733" transparent opacity={0.7} />
      </lineSegments>
      <mesh position={[start.x, (start.y + START_POST_HEIGHT) / 2, start.z]}>
        <cylinderGeometry args={[3, 3, start.y + START_POST_HEIGHT, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
