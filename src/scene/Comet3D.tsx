/**
 * Comet3D — cometa decorativa con orbita ellittica molto eccentrica e coda
 * sempre orientata in direzione opposta al Sole (radiazione solare = vento
 * solare che "spinge" la coda lontano dalla stella).
 *
 * Parametri visivi: nucleo ~0.08 unità, coda che si estende fino a ~1.5 unità
 * con effetto "gradiente" tramite un Line con colori interpolati. La coda è
 * un THREE.Line con vertex colors (testa opaca → coda trasparente).
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Vector3,
} from 'three';

const TAIL_SEGMENTS = 24;
const TAIL_LENGTH = 2.2; // unità 3D

interface CometOrbit {
  /** Semi-asse maggiore (unità 3D). */
  a: number;
  /** Eccentricità (0..1). */
  e: number;
  /** Anomalia media all'epoca (gradi). */
  M0: number;
  /** Periodo (anni di simulazione). */
  periodYears: number;
  /** Inclinazione orbita (radianti). */
  inclination: number;
  /** Longitudine del nodo ascendente (gradi). */
  longitudeNode: number;
  /** Argomento del perielio (gradi). */
  argPerihelion: number;
}

const ORBIT: CometOrbit = {
  a: 14,
  e: 0.92,
  M0: 30,
  periodYears: 6,
  inclination: 0.18, // ~10°
  longitudeNode: 75,
  argPerihelion: 200,
};

function solveKepler(M: number, e: number, tol = 1e-4): number {
  let E = M;
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tol) break;
  }
  return E;
}

export function Comet3D() {
  const headRef = useRef<import('three').Mesh | null>(null);
  const localTimeRef = useRef(0);

  const { tailGeom, tailLine } = useMemo(() => {
    const tailGeom = new BufferGeometry();
    const positions = new Float32Array((TAIL_SEGMENTS + 1) * 3);
    const colors = new Float32Array((TAIL_SEGMENTS + 1) * 3);
    for (let i = 0; i <= TAIL_SEGMENTS; i++) {
      const t = i / TAIL_SEGMENTS;
      // coda: ciano chiaro che sfuma verso il bianco in testa
      colors[i * 3] = 0.7 + 0.3 * t;
      colors[i * 3 + 1] = 0.85;
      colors[i * 3 + 2] = 1.0;
    }
    tailGeom.setAttribute('position', new BufferAttribute(positions, 3));
    tailGeom.setAttribute('color', new BufferAttribute(colors, 3));
    const tailMat = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const tailLine = new Line(tailGeom, tailMat);
    tailLine.frustumCulled = false;
    return { tailGeom, tailMat, tailLine };
  }, []);

  useFrame((_, dt) => {
    const head = headRef.current;
    if (!head) return;
    localTimeRef.current += dt;
    const t = localTimeRef.current;

    // Anomalia media (gradi → radianti)
    const M = ((ORBIT.M0 + (t / ORBIT.periodYears) * 360) * Math.PI) / 180;
    const E = solveKepler(M, ORBIT.e);
    // anomalia vera
    const nu =
      2 *
      Math.atan2(
        Math.sqrt(1 + ORBIT.e) * Math.sin(E / 2),
        Math.sqrt(1 - ORBIT.e) * Math.cos(E / 2)
      );
    // distanza
    const r = ORBIT.a * (1 - ORBIT.e * Math.cos(E));

    // Coordinate orbitali nel piano (x verso perielio, y nel piano orbitale)
    const xOrb = r * Math.cos(nu);
    const yOrb = r * Math.sin(nu);
    // Trasformazione nel sistema 3D: ruota per argomento del perielio, poi
    // intorno all'asse Y per longitudine nodo, poi intorno all'asse X per
    // inclinazione.
    const argP = (ORBIT.argPerihelion * Math.PI) / 180;
    const longN = (ORBIT.longitudeNode * Math.PI) / 180;
    const inc = ORBIT.inclination;

    const x1 = xOrb * Math.cos(argP) - yOrb * Math.sin(argP);
    const y1 = xOrb * Math.sin(argP) + yOrb * Math.cos(argP);
    // inclinazione: ruota di inc attorno alla linea dei nodi
    const x2 = x1;
    const y2 = y1 * Math.cos(inc);
    const z2 = y1 * Math.sin(inc);
    // longitudine del nodo: ruota di longN attorno a Y
    const x3 = x2 * Math.cos(longN) - z2 * Math.sin(longN);
    const y3 = y2;
    const z3 = x2 * Math.sin(longN) + z2 * Math.cos(longN);

    const pos = head.position;
    pos.set(x3, y3, z3);

    // Direzione Sole→Cometa (coda). Sole è nell'origine, quindi:
    const sunToComet = new Vector3(x3, y3, z3).normalize();
    // Aggiorna la geometria della coda: primo vertice = nucleo, ultimo = lontano
    const attr = tailGeom.getAttribute('position') as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i <= TAIL_SEGMENTS; i++) {
      const k = i / TAIL_SEGMENTS;
      // Coda = nucleo + k * TAIL_LENGTH * (-sunToComet) → si estende opposta al Sole
      arr[i * 3] = x3 - sunToComet.x * TAIL_LENGTH * k;
      arr[i * 3 + 1] = y3 - sunToComet.y * TAIL_LENGTH * k;
      arr[i * 3 + 2] = z3 - sunToComet.z * TAIL_LENGTH * k;
    }
    attr.needsUpdate = true;
  });

  return (
    <group>
      <mesh
        ref={(m) => {
          headRef.current = m;
        }}
      >
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial
          color="#fff8d0"
          emissive="#ffd180"
          emissiveIntensity={1.5}
          roughness={0.4}
        />
      </mesh>
      <primitive object={tailLine} />
    </group>
  );
}
