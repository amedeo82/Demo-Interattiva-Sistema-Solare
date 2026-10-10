/**
 * <Orbits /> — linee ellittiche 3D per le orbite dei pianeti.
 */
import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import { BODIES_3D, BODIES_ORDER, REAL_SCALE_FACTOR, angleToOrbitPosition } from './bodies3d';
import { Color } from 'three';

const SEGMENTS = 128;

export function Orbits({ realScale = false }: { realScale?: boolean } = {}) {
  const orbitPoints = useMemo(
    () =>
      BODIES_ORDER.filter((n) => n !== 'Sun').map((name) => {
        const body = BODIES_3D[name];
        // 4.8 — coerente con Bodies: in `realScale` le orbite sono in AU
        // moltiplicati per REAL_SCALE_FACTOR.
        const dist = realScale ? body.distanceAu * REAL_SCALE_FACTOR : body.orbitDistance;
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= SEGMENTS; i++) {
          const angle = (i / SEGMENTS) * 360;
          // 4.9 — Ω: orienta l'orbita nel piano dell'eclittica
          const p = angleToOrbitPosition(angle, dist, undefined, body.longitudeOfAscendingNode);
          pts.push([p.x, p.y, p.z]);
        }
        return { name, points: pts };
      }),
    [realScale]
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
