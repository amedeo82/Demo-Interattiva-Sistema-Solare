/**
 * <Orbits /> — linee ellittiche 3D per le orbite dei pianeti.
 */
import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import { BODIES_3D, BODIES_ORDER, angleToOrbitPosition } from './bodies3d';
import { Color } from 'three';

const SEGMENTS = 128;

export function Orbits() {
  const orbitPoints = useMemo(
    () =>
      BODIES_ORDER.filter((n) => n !== 'Sun').map((name) => {
        const body = BODIES_3D[name];
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= SEGMENTS; i++) {
          const angle = (i / SEGMENTS) * 360;
          const p = angleToOrbitPosition(angle, body.orbitDistance);
          pts.push([p.x, p.y, p.z]);
        }
        return { name, points: pts };
      }),
    []
  );

  return (
    <group>
      {orbitPoints.map(({ name, points }) => (
        <Line
          key={name}
          points={points}
          color={new Color('#ffffff')}
          lineWidth={1}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      ))}
    </group>
  );
}