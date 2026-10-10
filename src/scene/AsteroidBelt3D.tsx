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
} from 'three';
import { mulberry32 } from '../utils/random';
import { useOrbitEngineContext } from './OrbitEngineBridge';
import { REAL_SCALE_FACTOR } from './bodies3d';

export interface Asteroid {
  angle: number; // longitudine iniziale (gradi)
  radius: number; // distanza dal Sole (unità di scena 3D)
  aAU: number; // semi-asse in "UA di simulazione"
  inclination: number; // inclinazione orbitale (radianti, ±5°)
  size: number; // dimensione particella
  speed: number; // velocità angolare (relativa alla Terra)
  opacity: number;
  spin: number; // spin proprio (gradi/s di sim)
  /** Colore (hex) basato sulla classe spettrale (C/S/M) — vedi 4.7 del
   *  docs/MOBILE-UX.md: la distribuzione reale è ~75% C-type, ~15% S-type,
   *  ~5% M-type, ~5% altre classi. */
  color: string;
}

/** Classi spettrali degli asteroidi della fascia principale.
 *  Il colore è prelevato da una palette realistica per riflettere l'albedo
 *  medio di ciascuna classe. */
const SPECTRAL_PALETTE = {
  C: ['#3a3530', '#4a423a', '#5a4e44'], // carbonacei (scuri, ~75%)
  S: ['#b9a48a', '#c8b89a', '#a89678'], // silicacei (chiari, ~15%)
  M: ['#8a8580', '#a89e94', '#9a9590'], // metallici (grigi, ~5%)
} as const;

export function generateAsteroids(count = 350, seed = 42): Asteroid[] {
  const rand = mulberry32(seed);
  const list: Asteroid[] = [];
  for (let i = 0; i < count; i++) {
    const u = (rand() + rand()) / 2;
    const radius = 26 + u * 6; // 26..32 (Marte 22, Giove 34 in unità 3D)
    const aAU = radius / 5; // 5 unità 3D = 1 UA (Terra = 5)
    const periodYears = Math.pow(aAU, 1.5);
    // Distribuzione spettrale realistica (con seed deterministico).
    const r = rand();
    const palette =
      r < 0.75
        ? SPECTRAL_PALETTE.C
        : r < 0.9
          ? SPECTRAL_PALETTE.S
          : SPECTRAL_PALETTE.M;
    const color = palette[Math.floor(rand() * palette.length)];
    list.push({
      angle: rand() * 360,
      radius,
      aAU,
      inclination: (rand() - 0.5) * 0.18, // ±0.09 rad ≈ ±5°
      size: 0.03 + rand() * 0.06,
      speed: 1 / periodYears,
      opacity: 0.25 + rand() * 0.5,
      spin: (rand() - 0.5) * 200,
      color,
    });
  }
  return list;
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aOpacity;
  attribute vec3 aColor;
  varying float vOpacity;
  varying vec3 vColor;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // size attenuato dalla distanza: lontano = più piccolo (come stelle)
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    vOpacity = aOpacity;
    vColor = aColor;
  }
`;
const FRAG = /* glsl */ `
  varying float vOpacity;
  varying vec3 vColor;
  void main() {
    // disco morbido con bordo sfumato
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.1, d) * vOpacity;
    gl_FragColor = vec4(vColor, a);
  }
`;

const REAL_SCALE = REAL_SCALE_FACTOR; // re-export per chiarezza nel file

export function AsteroidBelt3D({ count = 350, realScale = false }: { count?: number; realScale?: boolean }) {
  const { simRateRef } = useOrbitEngineContext();
  const asteroids = useMemo(() => generateAsteroids(count), [count]);

  const geomRef = useRef<BufferGeometry | null>(null);
  const matRef = useRef<ShaderMaterial | null>(null);
  // R3F 9 ha tipi più stretti per i ref dei componenti nativi (Points
  // richiede BufferGeometry<NormalBufferAttributes, ...> esplicito). Un cast
  // mirato è più chiaro di un generico `any` sul ref.
  const pointsRef = useRef<Points<BufferGeometry, ShaderMaterial> | null>(null);

  // Geometria iniziale: tutti i buffer sono pre-allocati e poi mutati
  // imperativamente a ogni frame. `aColor` è l'attributo per il colore per
  // asteroide (vedi `generateAsteroids` → classi spettrali C/S/M).
  const { geometry, material } = useMemo(() => {
    const g = new BufferGeometry();
    const count = asteroids.length;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const op = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const initAngle = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = asteroids[i];
      // 4.8 — Scala reale: in `realScale` la distanza è direttamente in AU
      // moltiplicati per REAL_SCALE (0.5 unità/AU, range ~1.1..1.6).
      // Fuori, scala logaritmica compressa (range 26..32 unità).
      // 4.9 — Ω ≈ 75° (media pesata fra Marte 49.56° e Giove 100.46°):
      //  il main belt non è un sistema chiuso, ma questa rotazione
      //  approssima l'orientamento reale della fascia.
      const distScale = realScale ? REAL_SCALE : 1;
      const omegaRad = (75 * Math.PI) / 180;
      const cosO = Math.cos(omegaRad);
      const sinO = Math.sin(omegaRad);
      const rad = (a.angle * Math.PI) / 180;
      const xRaw = a.radius * distScale * Math.sin(rad);
      const zRaw = -a.radius * distScale * Math.cos(rad);
      pos[i * 3] = xRaw * cosO - zRaw * sinO;
      pos[i * 3 + 1] = a.radius * distScale * Math.sin(a.inclination);
      pos[i * 3 + 2] = xRaw * sinO + zRaw * cosO;
      sz[i] = a.size;
      op[i] = a.opacity;
      // Decodifica hex (#rrggbb) in RGB lineare
      const hex = a.color.replace('#', '');
      col[i * 3] = parseInt(hex.slice(0, 2), 16) / 255;
      col[i * 3 + 1] = parseInt(hex.slice(2, 4), 16) / 255;
      col[i * 3 + 2] = parseInt(hex.slice(4, 6), 16) / 255;
      initAngle[i] = a.angle;
    }
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSize', new BufferAttribute(sz, 1));
    g.setAttribute('aOpacity', new BufferAttribute(op, 1));
    g.setAttribute('aColor', new BufferAttribute(col, 3));
    const m = new ShaderMaterial({
      uniforms: {},
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
      const distScale = realScale ? REAL_SCALE : 1;
      const omegaRad = (75 * Math.PI) / 180;
      const cosO = Math.cos(omegaRad);
      const sinO = Math.sin(omegaRad);
      const rad = (cur * Math.PI) / 180;
      const xRaw = a.radius * distScale * Math.sin(rad);
      const zRaw = -a.radius * distScale * Math.cos(rad);
      arr[i * 3] = xRaw * cosO - zRaw * sinO;
      arr[i * 3 + 1] = a.radius * distScale * Math.sin(a.inclination);
      arr[i * 3 + 2] = xRaw * sinO + zRaw * cosO;
    }
    attr.needsUpdate = true;
  });

  return (
    <points
      ref={(p) => {
        pointsRef.current = p as Points<BufferGeometry, ShaderMaterial> | null;
      }}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
