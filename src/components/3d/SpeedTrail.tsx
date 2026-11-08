import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Color, CustomBlending, MaxEquation, Vector3, type CatmullRomCurve3, type InterleavedBuffer, type InterleavedBufferAttribute } from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { carScale, sideShift } from '../../lib/carSize';
import type { LapSamples } from '../../lib/data-types';
import { stateAtTime } from '../../lib/telemetry';
import { speedColourAt, UP } from '../../lib/track';
import { trailBrightness, trailWindow } from '../../lib/trail';
import { usePlayback } from '../../store/playback';
import { useView } from '../../store/view';

/** How much of the lap a trail covers behind its car. */
const TRAIL_METRES = 900;
const POINTS = 160;
/**
 * Metres above the track surface, so the line never sinks into it: more from
 * far away, where depth is coarse, and down to a few centimetres' worth up close.
 */
const LIFT = { min: 0.3, max: 2, perMetre: 0.002 };
const WIDTH_PX = 3.5;

interface Props {
  samples: LapSamples;
  curve: CatmullRomCurve3;
  /** The car's offset from the racing line (see Car) */
  offset: number;
  /** Slowest and fastest speed of the colour scale, shared by both trails */
  range: [number, number];
  /** The driver's colour, used when the visitor colours trails by driver */
  colour: string;
}

/**
 * A glowing line behind a car over the last 900 m of its lap, coloured by its
 * speed there (purple slow, cyan fast, red braking) or by the driver's colour,
 * as the visitor chooses, and fading out towards the tail. Its buffers are
 * rewritten in place every frame: giving the line new ones would leave the
 * old ones behind in GPU memory.
 */
export function SpeedTrail({ samples, curve, offset, range, colour }: Props) {
  const size = useThree((s) => s.size);
  const lapMetres = samples.d[samples.d.length - 1];
  const driverColour = useMemo(() => new Color(colour), [colour]);

  const trail = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions(new Float32Array(POINTS * 3));
    geometry.setColors(new Float32Array(POINTS * 3));
    // Max blending keeps the brighter of trail and background: the dark tail
    // fades out cleanly, and the overlapping round joins between segments (or
    // the two trails crossing) don't add up into bright beads.
    const material = new LineMaterial({ vertexColors: true, linewidth: WIDTH_PX, transparent: true, depthWrite: false, blending: CustomBlending, blendEquation: MaxEquation });
    material.toneMapped = false;
    const line = new Line2(geometry, material);
    line.frustumCulled = false;
    const buffer = (name: string) => (geometry.getAttribute(name) as InterleavedBufferAttribute).data as InterleavedBuffer;
    return { line, geometry, material, segments: buffer('instanceStart'), colours: buffer('instanceColorStart') };
  }, []);

  useEffect(
    () => () => {
      trail.geometry.dispose();
      trail.material.dispose();
    },
    [trail],
  );
  useEffect(() => {
    trail.material.resolution.set(size.width, size.height);
  }, [trail, size]);

  const v = useMemo(() => ({ p: new Vector3(), tangent: new Vector3(), side: new Vector3(), colour: new Color() }), []);
  const points = useMemo(() => new Float32Array(POINTS * 3), []);
  const colours = useMemo(() => new Float32Array(POINTS * 3), []);

  useFrame(({ camera }) => {
    const { fraction } = stateAtTime(samples, usePlayback.getState().time);
    const [tail, head] = trailWindow(fraction, lapMetres, TRAIL_METRES);
    const byDriver = useView.getState().trailColours === 'driver';
    curve.getPointAt(head, v.p);
    const distance = camera.position.distanceTo(v.p);
    // Same sideways split as the car, so the trail stays attached to it at every zoom.
    const shift = sideShift(offset, carScale(distance));
    const lift = Math.min(LIFT.max, Math.max(LIFT.min, distance * LIFT.perMetre));

    for (let i = 0; i < POINTS; i++) {
      const u = tail + ((head - tail) * i) / (POINTS - 1);
      curve.getPointAt(u, v.p);
      curve.getTangentAt(u, v.tangent);
      v.side.crossVectors(v.tangent, UP).normalize();
      v.p.addScaledVector(v.side, shift);
      points[i * 3] = v.p.x;
      points[i * 3 + 1] = v.p.y + lift;
      points[i * 3 + 2] = v.p.z;
      if (byDriver) v.colour.copy(driverColour);
      else speedColourAt(samples, u, v.colour, range);
      v.colour.multiplyScalar(trailBrightness(i, POINTS));
      colours[i * 3] = v.colour.r;
      colours[i * 3 + 1] = v.colour.g;
      colours[i * 3 + 2] = v.colour.b;
    }

    // Segment j runs from point j to point j + 1: six floats each, start then end.
    const seg = trail.segments.array as Float32Array;
    const col = trail.colours.array as Float32Array;
    for (let j = 0; j < POINTS - 1; j++) {
      for (let c = 0; c < 3; c++) {
        seg[j * 6 + c] = points[j * 3 + c];
        seg[j * 6 + 3 + c] = points[(j + 1) * 3 + c];
        col[j * 6 + c] = colours[j * 3 + c];
        col[j * 6 + 3 + c] = colours[(j + 1) * 3 + c];
      }
    }
    trail.segments.needsUpdate = true;
    trail.colours.needsUpdate = true;
  });

  return <primitive object={trail.line} />;
}
