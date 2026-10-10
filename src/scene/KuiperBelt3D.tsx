/**
 * KuiperBelt3D — fascia di Kuiper come Points dentro il Canvas. TNO (oggetti
 * trans-nettuniani) ghiacciati oltre Nettuno, con addensamento verso il
 * bordo interno (risonanze con Nettuno) e diradamento verso l'esterno.
 * Pattern identico ad AsteroidBelt3D.
 */
import { useMemo, useRef } from 'react';
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

export interface KuiperObject {
  angle: number;
  radius: number;
  aAU: number;
  inclination: number;
  size: number;
  speed: number;
  opacity: number;
  color: Color;
}

const ICE_COLORS = ['#cfe6ff', '#b6d4ee', '#a3c0d8', '#dbe8f2', '#9bb7cc'];

export function generateKuiperObjects(count = 120, seed = 101): KuiperObject[] {
  const rand = mulberry32(seed);
  const list: KuiperObject[] = [];
  for (let i = 0; i < count; i++) {
    const u = Math.pow(rand(), 0.7);
    const radius = 66 + u * 22; // 66..88 unità 3D (Nettuno ≈ 56, ipotizzando 5/UA)
    const aAU = radius / 5;
    const periodYears = Math.pow(aAU, 1.5);
    list.push({
      angle: rand() * 360,
      radius,
      aAU,
      inclination: (rand() - 0.5) * 0.4, // ±0.2 rad ≈ ±11° (molto più inclinata del main belt)
      size: 0.025 + rand() * 0.05,
      speed: 1 / periodYears,
      opacity: 0.18 + rand() * 0.32,
      color: new Color(ICE_COLORS[Math.floor(rand() * ICE_COLORS.length)]),
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
    float a = smoothstep(0.5, 0.15, d) * vOpacity;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function KuiperBelt3D({ count = 120 }: { count?: number }) {
  const { simRateRef } = useOrbitEngineContext();
  const objects = useMemo(() => generateKuiperObjects(count), [count]);
  const pointsRef = useRef<Points | null>(null);
  const localTimeRef = useRef(0);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const count = objects.length;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const op = new Float32Array(count);
    const cols = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = objects[i];
      const rad = (a.angle * Math.PI) / 180;
      pos[i * 3] = a.radius * Math.sin(rad);
      pos[i * 3 + 1] = a.radius * Math.sin(a.inclination);
      pos[i * 3 + 2] = a.radius * Math.cos(rad);
      sz[i] = a.size;
      op[i] = a.opacity;
      cols[i * 3] = a.color.r;
      cols[i * 3 + 1] = a.color.g;
      cols[i * 3 + 2] = a.color.b;
    }
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSize', new BufferAttribute(sz, 1));
    g.setAttribute('aOpacity', new BufferAttribute(op, 1));
    g.setAttribute('aColor', new BufferAttribute(cols, 3));
    return g;
  }, [objects]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    []
  );

  useFrame((_, dt) => {
    const points = pointsRef.current;
    if (!points) return;
    localTimeRef.current += dt * simRateRef.current;
    const t = localTimeRef.current;
    const earthDegPerSec = 36;
    const attr = points.geometry.getAttribute('position') as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < objects.length; i++) {
      const a = objects[i];
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
