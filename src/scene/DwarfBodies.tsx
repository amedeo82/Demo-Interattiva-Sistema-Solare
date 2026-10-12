/**
 * S12 · F4 — Render dei pianeti nani (Plutone, Cerere).
 *
 * Sfere 3D che seguono le orbite kepleriane semplificate (le stesse
 * formule di Bodies, ma con angolo iniziale derivato da
 * `meanLongitudeJ2000`). Non entrano nel motore orbitale: la
 * posizione è ricalcolata ad ogni frame da un orologio locale
 * proporzionale a `simRate`.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { dwarfPlanets } from '../data/planets';
import { useOrbitEngineContext } from './OrbitEngineBridge';
import { heliocentricVector3D, REAL_SCALE_FACTOR } from './bodies3d';

interface DwarfBodiesProps {
  realScale?: boolean;
}

export function DwarfBodies({ realScale = false }: DwarfBodiesProps) {
  const { simRateRef } = useOrbitEngineContext();
  // Per ogni pianeta nano, prepariamo la mesh e i parametri orbitali.
  const items = useMemo(() => {
    return dwarfPlanets.map((d) => ({
      name: d.name,
      color: d.color,
      size: d.size,
      dist: realScale ? d.distanceFromSun * REAL_SCALE_FACTOR : d.orbitRadius,
      // Longitudine iniziale = meanLongitudeJ2000 (modulo 360)
      startAngle: d.meanLongitudeJ2000,
      // Velocità angolare: 360°/periodo (in anni di sim time).
      // La velocità del motore è espressa in gradi/sec di sim time.
      // 1 anno di sim time = CONFIG.earthYearSimSeconds (default 10s di sim time)
      // Velocità in gradi/sec di sim time = 360 / (P_anim * earthYearSimSeconds)
      // ma per semplicità usiamo gradi/sec "reali" del modello:
      // simTime avanza a CONFIG.earthYearSimSeconds/anno-reale.
      // Per i pianeti nani usiamo un "sim year" come unità: il rate è
      // calcolato in modo che la Terra (P=365d) completi un'orbita in
      // CONFIG.earthYearSimSeconds secondi di sim.
      // Velocità angolare (gradi/sec di sim) = 360 / (P_giorni * earthYearSimSeconds)
      // Qui usiamo direttamente l'angolo che avanza linearmente col sim time
      // (sincronizzato con il motore: il motore fa avanzare l'angolo della
      //  Terra a 360 / earthYearSimSeconds gradi/sec).
      // Per Plutone (P=90560d): 360 / (90560 * 10) = 0.000397 gradi/sec.
      // In realtà il motore usa un taro per cui la Terra fa 360/10=36 gradi/sec.
      // Per uniformità con gli altri pianeti, usiamo lo stesso taro.
      degPerSec: 36 / d.orbitalPeriod, // Taro basato sul periodo della Terra
      omega: d.longitudeOfAscendingNode,
      inclination: d.orbitalInclination,
    }));
  }, [realScale]);

  const meshRefs = useRef<(Mesh | null)[]>([]);

  useEffect(() => {
    meshRefs.current = meshRefs.current.slice(0, items.length);
  }, [items.length]);

  const localTimeRef = useRef(0);

  useFrame((_, dt) => {
    localTimeRef.current += dt * simRateRef.current;
    const t = localTimeRef.current;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const ang = (it.startAngle + it.degPerSec * t) % 360;
      const v = new Vector3();
      heliocentricVector3D(ang, it.dist, it.omega, it.inclination, v);
      mesh.position.copy(v);
      // Rotazione assiale lenta per dare "vita" (non realistica ma piacevole)
      mesh.rotation.y += dt * 0.5;
    }
  });

  return (
    <group>
      {items.map((it, i) => (
        <mesh
          key={it.name}
          ref={(m) => {
            meshRefs.current[i] = m;
          }}
          userData={{ dwarfPlanet: it.name }}
        >
          <sphereGeometry args={[it.size, 16, 16]} />
          <meshStandardMaterial color={it.color} roughness={0.95} metalness={0.0} />
        </mesh>
      ))}
    </group>
  );
}
