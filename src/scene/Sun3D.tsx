/**
 * <Sun3D /> — il Sole come sfera emissiva con halo.
 * Il Bloom pass raccoglie i pixel emissivi → alone realistico.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, ShaderMaterial, AdditiveBlending, BackSide } from 'three';
import { useTexture } from '@react-three/drei';
import { BODIES_3D } from './bodies3d';

const SUN = BODIES_3D.Sun;

const VERT = /* glsl */ `
varying vec3 vNormal;
varying vec2 vUv;
void main(){
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;

const FRAG_SUN = /* glsl */ `
uniform sampler2D map;
uniform float time;
varying vec3 vNormal;
varying vec2 vUv;
void main(){
  vec3 t = texture2D(map, vUv).rgb;
  float pulse = 0.9 + 0.1 * sin(time * 0.6);
  float limb = pow(abs(dot(vNormal, vec3(0.0,0.0,1.0))), 0.55);
  gl_FragColor = vec4(t * pulse * (0.65 + 0.35 * limb), 1.0);
}`;

const FRAG_CORONA = /* glsl */ `
uniform float time;
varying vec2 vUv;
void main(){
  vec2 c = vUv - 0.5;
  float r = length(c);
  float halo = smoothstep(0.5, 0.15, r);
  halo *= 0.75 + 0.25 * sin(time * 0.4);
  vec3 col = mix(vec3(1.0,0.45,0.05), vec3(1.0,0.95,0.55), pow(halo, 3.0));
  gl_FragColor = vec4(col * halo * 1.4, halo * 0.6);
}`;

export function Sun3D({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  const meshRef = useRef<Mesh>(null);
  const coronaRef = useRef<Mesh>(null);
  const sunTex = useTexture(SUN.map!);

  const sunMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { map: { value: sunTex }, time: { value: 0 } },
        vertexShader: VERT,
        fragmentShader: FRAG_SUN,
      }),
    [sunTex]
  );
  const coronaMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: VERT,
        fragmentShader: FRAG_CORONA,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: BackSide,
      }),
    []
  );

  useFrame((_, dt) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += (dt * 360) / (SUN.rotationHours / 24);
      (sunMat.uniforms.time as { value: number }).value += dt;
    }
    if (coronaRef.current) {
      coronaRef.current.rotation.z += dt * 0.05;
      (coronaMat.uniforms.time as { value: number }).value += dt;
    }
  });

  return (
    <group rotation={[0, 0, (SUN.axialTilt * Math.PI) / 180]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          document.body.style.cursor = 'pointer';
          e.stopPropagation();
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
        scale={selected ? 1.08 : 1.0}
      >
        <sphereGeometry args={[SUN.radius, 64, 64]} />
        <primitive object={sunMat} attach="material" />
      </mesh>
      <mesh ref={coronaRef} scale={1.2}>
        <sphereGeometry args={[SUN.radius, 32, 32]} />
        <primitive object={coronaMat} attach="material" />
      </mesh>
    </group>
  );
}