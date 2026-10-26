import { useFrame } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import type { Group } from 'three';
import type { LapData } from '../../lib/data-types';
import { lapStateAt, type TrackFrame } from '../../lib/track';

export interface HudRefs {
  clock: RefObject<HTMLSpanElement | null>;
  speed: RefObject<HTMLSpanElement | null>;
  gear: RefObject<HTMLSpanElement | null>;
}

interface Props {
  lap: LapData;
  frame: TrackFrame;
  hud: HudRefs;
}

/**
 * A glowing dot that drives the lap in real time, on a loop.
 * It writes the HUD text directly each frame to avoid re-rendering React 60 times a second.
 */
export function CarMarker({ lap, frame, hud }: Props) {
  const ref = useRef<Group>(null);
  const colour = `#${lap.driver.teamColour}`;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime % lap.lapTime;
    const state = lapStateAt(lap.samples, frame, t);
    ref.current?.position.set(...state.position);
    if (hud.clock.current) hud.clock.current.textContent = t.toFixed(1).padStart(5, '0');
    if (hud.speed.current) hud.speed.current.textContent = String(state.speed);
    if (hud.gear.current) hud.gear.current.textContent = String(state.gear);
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[14, 24, 24]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh>
        <sphereGeometry args={[36, 24, 24]} />
        <meshBasicMaterial color={colour} transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}
