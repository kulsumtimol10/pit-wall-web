import { useFrame } from '@react-three/fiber';
import { usePlayback } from '../../store/playback';

/** Longest step per frame, so a backgrounded tab doesn't jump the replay forward. */
const MAX_STEP_S = 0.1;

/** Advances the shared playback clock once per rendered frame while playing. */
export function PlaybackClock() {
  useFrame((_, delta) => {
    const { playing, advance } = usePlayback.getState();
    if (playing) advance(Math.min(delta, MAX_STEP_S));
  });
  return null;
}
