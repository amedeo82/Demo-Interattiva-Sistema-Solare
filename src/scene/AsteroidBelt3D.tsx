/**
 * AsteroidBelt3D — fascia principale degli asteroidi resa come Points (THREE.Points)
 * dentro il Canvas. ~350 asteroidi con distribuzione radiale tra Marte e Giove,
 * inclinazione orbitale casuale, e velocità angolare secondo la 3ª legge di
 * Keplero (periodo ∝ a^1.5).
 *
 * Perché Points e non InstancedMesh: gli asteroidi sono <2px sullo schermo,
 * un Points + ShaderMaterial `size + sizeAttenuation` costa una sola draw call
 * e migliaia di particelle. La rotazione individuale è simulata modulando
 * l'opacità con sin(spin·t) (effetto "lato visibile" / "di taglio").
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
  Color,
} from 'three';
import { mulberry32 } from '../utils/random';
import { useOrbitEngineContext } from './OrbitEngineBridge';

export interface Asteroid {
  angle: number; // longitudine iniziale (gradi)
  radius: number; // distanza dal Sole (unità di scena 3D)
  aAU: number; // semi-asse in "UA di simulazione"
  inclination: number; // inclinazione orbitale (radianti, ±5°)
  size: number; // dimensione particella
  speed: number; // velocità angolare (relativa alla Terra)
  opacity: number;
  spin: number; // spin proprio (gradi/s di sim)
}

export function generateAsteroids(count = 350, seed = 42): Asteroid[] {
  const rand = mulberry32(seed);
  const list: Asteroid[] = [];
  for (let i = 0; i < count; i++) {
    const u = (rand() + rand()) / 2;
    const radius = 26 + u * 6; // 26..32 (Marte 22, Giove 34 in unità 3D)
    const aAU = radius / 5; // 5 unità 3D = 1 UA (Terra = 5)
    const periodYears = Math.pow(aAU, 1.5);
    list.push({
      angle: rand() * 360,
      radius,
      aAU,
      inclination: (rand() - 0.5) * 0.18, // ±0.09 rad ≈ ±5°
      size: 0.03 + rand() * 0.06,
      speed: 1 / periodYears,
      opacity: 0.25 + rand() * 0.5,
      spin: (rand() - 0.5) * 200,
    });
  }
  return list;
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aOpacity;
  varying float vOpacity;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // size attenuato dalla distanza: lontano = più piccolo (come stelle)
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    vOpacity = aOpacity;
  }
`;
const FRAG = /* glsl */ `
  varying float vOpacity;
  uniform vec3 uColor;
  void main() {
    // disco morbido con bordo sfumato
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.1, d) * vOpacity;
    gl_FragColor = vec4(uColor, a);
  }
`;

export function AsteroidBelt3D({ count = 350 }: { count?: number }) {
  const { simRateRef } = useOrbitEngineContext();
  const asteroids = useMemo(() => generateAsteroids(count), [count]);

  const geomRef = useRef<BufferGeometry | null>(null);
  const matRef = useRef<ShaderMaterial | null>(null);
  const pointsRef = useRef<Points | null>(null);

  // Geometria iniziale: tutti i buffer sono pre-allocati e poi mutati
  // imperativamente a ogni frame.
  const { geometry, material } = useMemo(() => {
    const g = new BufferGeometry();
    const count = asteroids.length;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const op = new Float32Array(count);
    const initAngle = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = asteroids[i];
      const rad = (a.angle * Math.PI) / 180;
      pos[i * 3] = a.radius * Math.sin(rad);
      pos[i * 3 + 1] = a.radius * Math.sin(a.inclination);
      pos[i * 3 + 2] = a.radius * Math.cos(rad);
      sz[i] = a.size;
      op[i] = a.opacity;
      initAngle[i] = a.angle;
    }
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSize', new BufferAttribute(sz, 1));
    g.setAttribute('aOpacity', new BufferAttribute(op, 1));
    const m = new ShaderMaterial({
      uniforms: { uColor: { value: new Color('#b9a58c') } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return { geometry: g, material: m, positions: pos, sizes: sz, opacities: op };
  }, [asteroids]);

  // Salva angoli iniziali sui asteroids per il calcolo runtime.
  useEffect(() => {
    geomRef.current = geometry;
    matRef.current = material;
  }, [geometry, material]);

  // Accumulo locale: tiene traccia del "tempo di simulazione" di questa
  // cintura in secondi, indipendente dal tempo reale (rallenta/accelera
  // con la velocità della sim e con lo slow-mo cinematografico).
  const localTimeRef = useRef(0);

  useFrame((_, dt) => {
    const points = pointsRef.current;
    if (!points) return;
    const simRate = simRateRef.current;
    localTimeRef.current += dt * simRate;
    const t = localTimeRef.current;
    const earthDegPerSec = 36; // 360° / 10s (cfr. CONFIG.earthYearSimSeconds)
    const attr = points.geometry.getAttribute('position') as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i];
      const cur = a.angle + earthDegPerSec * t * a.speed;
      const rad = (cur * Math.PI) / 180;
      arr[i * 3] = a.radius * Math.sin(rad);
      arr[i * 3 + 1] = a.radius * Math.sin(a.inclination);
      arr[i * 3 + 2] = a.radius * Math.cos(rad);
    }
    attr.needsUpdate = true;
  });

  return (
    <points
      ref={(p) => {
        pointsRef.current = p;
      }}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
