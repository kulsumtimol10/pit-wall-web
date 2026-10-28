import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { DoubleSide, Vector3, type CatmullRomCurve3, type Group } from 'three';
import type { LapSamples } from '../../lib/data-types';
import { stateAtTime } from '../../lib/telemetry';
import { UP } from '../../lib/track';
import { usePlayback } from '../../store/playback';

/**
 * A real car is ~5.6 m long on a ~2.5 km wide track, so at true size it is a
 * pixel or two from the overview camera. Cars are scaled with camera distance
 * instead: roughly constant on screen when zoomed out, and back to life size
 * (scale 1) when the camera comes close.
 */
const METRES_PER_SCALE = 160;
const MAX_SCALE = 30;

interface Props {
  samples: LapSamples;
  curve: CatmullRomCurve3;
  colour: string;
  /**
   * Metres to the left (+) or right (-) of the racing line. OpenF1 gives
   * progress along the lap, not position across the track, so the two cars are
   * split either side of the line purely to keep both visible.
   */
  offset: number;
}

/** A low-poly car that drives its lap on the shared playback clock. */
export function Car({ samples, curve, colour, offset }: Props) {
  const ref = useRef<Group>(null);
  const v = useMemo(() => ({ p: new Vector3(), tangent: new Vector3(), side: new Vector3(), ahead: new Vector3() }), []);

  useFrame(({ camera }) => {
    const car = ref.current;
    if (!car) return;
    const { fraction } = stateAtTime(samples, usePlayback.getState().time);
    const u = Math.min(fraction, 0.99999);
    curve.getPointAt(u, v.p);
    curve.getTangentAt(u, v.tangent);
    const scale = Math.min(MAX_SCALE, Math.max(1, camera.position.distanceTo(v.p) / METRES_PER_SCALE));
    v.side.crossVectors(v.tangent, UP).normalize();
    v.p.addScaledVector(v.side, offset * Math.min(scale, 4));
    car.position.copy(v.p);
    car.scale.setScalar(scale);
    car.lookAt(v.ahead.copy(v.p).add(v.tangent));
  });

  return (
    <group ref={ref}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.05}>
        <ringGeometry args={[2.6, 3.4, 48]} />
        <meshBasicMaterial color={colour} transparent opacity={0.7} side={DoubleSide} depthWrite={false} />
      </mesh>
      <CarBody colour={colour} />
    </group>
  );
}

/** A simple 2026-style car in metres, facing +Z. */
function CarBody({ colour }: { colour: string }) {
  const body = <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.35} roughness={0.45} metalness={0.2} />;
  const carbon = <meshStandardMaterial color="#14181e" roughness={0.6} />;
  const wheels: [number, number][] = [
    [0.85, 1.75],
    [-0.85, 1.75],
    [0.85, -1.55],
    [-0.85, -1.55],
  ];
  return (
    <group>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[1.4, 0.06, 3.8]} />
        {carbon}
      </mesh>
      <mesh position={[0, 0.42, 0.3]}>
        <boxGeometry args={[0.8, 0.55, 3.2]} />
        {body}
      </mesh>
      <mesh position={[0, 0.32, 2.45]}>
        <boxGeometry args={[0.36, 0.26, 1.5]} />
        {body}
      </mesh>
      <mesh position={[0, 0.66, -1.2]}>
        <boxGeometry args={[0.66, 0.62, 1.7]} />
        {body}
      </mesh>
      <mesh position={[0, 0.36, -0.3]}>
        <boxGeometry args={[1.5, 0.4, 1.8]} />
        {body}
      </mesh>
      <mesh position={[0, 0.88, 0.25]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color="#f2f5f8" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.13, 3.1]}>
        <boxGeometry args={[1.9, 0.07, 0.45]} />
        {carbon}
      </mesh>
      <mesh position={[0, 0.98, -2.4]}>
        <boxGeometry args={[1.05, 0.08, 0.38]} />
        {body}
      </mesh>
      {[0.53, -0.53].map((x) => (
        <mesh key={x} position={[x, 0.76, -2.4]}>
          <boxGeometry args={[0.05, 0.52, 0.42]} />
          {carbon}
        </mesh>
      ))}
      {wheels.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, 0.36, z]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.36, 0.36, 0.38, 20]} />
          <meshStandardMaterial color="#0b0d10" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
