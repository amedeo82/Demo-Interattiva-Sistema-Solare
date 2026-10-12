/**
 * S12 · F5 — Asteroidi Troiani di Giove (L4 e L5).
 *
 * I Troiani sono asteroidi co-orbitali con Giove, situati nei punti
 * lagrangiani L4 (60° davanti) e L5 (60° dietro) rispetto al pianeta.
 * Co-ruotano con Giove: la loro longitudine è `jupiterAngle ± 60° + libration`.
 *
 * Rendering: due cluster di `THREE.Points`, palette simile alla fascia
 * principale (C/S/M type). Tier mobile: 40 punti per cluster vs 80 desktop.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from 'three';
import { mulberry32 } from '../utils/random';
import { useOrbitEngineContext } from './OrbitEngineBridge';
import { BODIES_3D, REAL_SCALE_FACTOR } from './bodies3d';

export interface Trojan {
  /** Offset dal centro L4/L5 (gradi, range ~±15°). */
  libration: number;
  /** Spread radiale (unità di scena 3D). */
  radialOffset: number;
  /** Inclinazione orbitale (radianti). */
  inclination: number;
  size: number;
  opacity: number;
  color: string;
}

const SPECTRAL_PALETTE = {
  C: ['#3a3530', '#4a423a', '#5a4e44'],
  S: ['#b9a48a', '#c8b89a', '#a89678'],
  M: ['#8a8580', '#a89e94', '#9a9590'],
} as const;

/** Genera un cluster di Troiani. `sign = +1` per L4, `-1` per L5. */
export function generateTrojans(count: number, sign: 1 | -1, seed: number): Trojan[] {
  const rand = mulberry32(seed);
  const out: Trojan[] = [];
  for (let i = 0; i < count; i++) {
    const libration = sign * (60 + (rand() - 0.5) * 30); // centro ±60°, ±15° di librazione
    const radialOffset = (rand() - 0.5) * 1.2; // ±0.6 unità
    const inclination = (rand() - 0.5) * 0.18;
    const size = 0.03 + rand() * 0.05;
    const opacity = 0.3 + rand() * 0.5;
    const r = rand();
    const palette =
      r < 0.75 ? SPECTRAL_PALETTE.C : r < 0.9 ? SPECTRAL_PALETTE.S : SPECTRAL_PALETTE.M;
    const color = palette[Math.floor(rand() * palette.length)];
    out.push({ libration, radialOffset, inclination, size, opacity, color });
  }
  return out;
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
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    vOpacity = aOpacity;
    vColor = aColor;
  }
`;
const FRAG = /* glsl */ `
  varying float vOpacity;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.1, d) * vOpacity;
    gl_FragColor = vec4(vColor, a);
  }
`;

interface TrojanSwarmProps {
  count: number;
  sign: 1 | -1;
  realScale?: boolean;
}

function TrojanSwarm({ count, sign, realScale = false }: TrojanSwarmProps) {
  const { positionsRef } = useOrbitEngineContext();
  const trojans = useMemo(() => generateTrojans(count, sign, 1000 + sign), [count, sign]);
  const pointsRef = useRef<Points<BufferGeometry, ShaderMaterial> | null>(null);

  // Geometria + materiale iniziali
  const { geometry, material } = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const op = new Float32Array(count);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      sz[i] = trojans[i].size;
      op[i] = trojans[i].opacity;
      const hex = trojans[i].color.replace('#', '');
      col[i * 3] = parseInt(hex.slice(0, 2), 16) / 255;
      col[i * 3 + 1] = parseInt(hex.slice(2, 4), 16) / 255;
      col[i * 3 + 2] = parseInt(hex.slice(4, 6), 16) / 255;
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
    return { geometry: g, material: m };
  }, [trojans, count]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(() => {
    const points = pointsRef.current;
    if (!points) return;
    const jupiterState = positionsRef.current['Jupiter'];
    if (!jupiterState) return;
    const jup = BODIES_3D['Jupiter'];
    if (!jup) return;
    // Distanza di Giove (stessa logica di AsteroidBelt3D)
    const dist = realScale ? jup.distanceAu * REAL_SCALE_FACTOR : jup.orbitDistance;
    // Longitudine del cluster: jupiterAngle + sign * 60°
    const L_angle = jupiterState.angle + sign * 60;
    // Ω di Giove
    const omega = jup.longitudeOfAscendingNode ?? 100.46;
    const omegaRad = (omega * Math.PI) / 180;
    const cosO = Math.cos(omegaRad);
    const sinO = Math.sin(omegaRad);
    const attr = points.geometry.getAttribute('position') as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < trojans.length; i++) {
      const t = trojans[i];
      const ang = L_angle + t.libration;
      const r = dist + t.radialOffset;
      const rad = (ang * Math.PI) / 180;
      const xRaw = r * Math.sin(rad);
      const zRaw = -r * Math.cos(rad);
      // Ω rotation + inclinazione
      const xRot = xRaw * cosO - zRaw * sinO;
      const zRot = xRaw * sinO + zRaw * cosO;
      arr[i * 3] = xRot;
      arr[i * 3 + 1] = r * Math.sin(t.inclination);
      arr[i * 3 + 2] = zRot;
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

export function TrojanSwarmL4({ count, realScale }: { count: number; realScale?: boolean }) {
  return <TrojanSwarm count={count} sign={1} realScale={realScale} />;
}
export function TrojanSwarmL5({ count, realScale }: { count: number; realScale?: boolean }) {
  return <TrojanSwarm count={count} sign={-1} realScale={realScale} />;
}
