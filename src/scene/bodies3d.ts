/**
 * Manifest 3D dei corpi celesti: texture, dati NASA reali, funzioni di scala.
 *
 * Sorgenti: NASA Science (Solar System Sizes & Distances), J2000.
 *
 * Scala scelta (utente ha scelto "Logaritmica"):
 *  - Distanze: `log10(1 + d_au) * SCALE_DISTANCE`. Mercurio (0.39 AU) → ~7.1
 *    unità, Nettuno (30 AU) → ~75 unità. Tutti visibili senza zoom estremo.
 *  - Diametri: PROPORZIONALI ai km reali. Giove resta 11.2× Terra, Mercurio
 *    0.38× Terra. SCALE_DIAMETER dà Mercurio ~0.20 unità.
 *  - Il Sole usa un raggio VISIVO ridotto (SUN_RADIUS_UNITS): con la scala
 *    proporzionale reale (~24 unità) ingloberebbe le orbite di Mercurio,
 *    Venere, Terra e Marte, nascondendole del tutto.
 */
import * as THREE from 'three';

const AU = {
  Mercury: 0.387,
  Venus: 0.723,
  Earth: 1.0,
  Mars: 1.524,
  Jupiter: 5.203,
  Uranus: 19.218,
  Neptune: 30.11,
  Saturn: 9.555,
} as const;

const DIAMETER_KM = {
  Sun: 1_391_400,
  Mercury: 4_879,
  Venus: 12_104,
  Earth: 12_756,
  Mars: 6_792,
  Jupiter: 142_984,
  Saturn: 120_536,
  Uranus: 51_118,
  Neptune: 49_528,
} as const;

export const SCALE_DISTANCE = 50;
export const SCALE_DIAMETER = 0.00004;

/**
 * Raggio visivo del Sole: NON proporzionale. Con la scala proporzionale
 * (1_391_400 km × SCALE_DIAMETER ≈ 55.7 unità) il Sole coprirebbe tutte le
 * orbite fino a Marte (~20 unità). Si usa un raggio ridotto, compromesso
 * standard delle visualizzazioni del sistema solare.
 */
export const SUN_RADIUS_UNITS = 4;

export function distanceUnits(distanceAu: number): number {
  return Math.log10(1 + distanceAu) * SCALE_DISTANCE;
}

export function radiusUnits(diameterKm: number): number {
  return diameterKm * SCALE_DIAMETER;
}

const TEX = '/textures/planets';

export interface Body3D {
  name: string;
  diameterKm: number;
  distanceAu: number;
  radius: number;
  orbitDistance: number;
  axialTilt: number;
  rotationHours: number;
  eccentricity: number;
  degPerDay: number;
  map?: string;
  rings?: string;
  /** Tinta dell'atmosfera per il Fresnel shader (BackSide sphere). */
  atmosphereColor?: string;
  /** Opacità massima dell'atmosfera (0..1). */
  atmosphereIntensity?: number;
}

export const BODIES_3D: Record<string, Body3D> = {
  Sun: {
    name: 'Sun',
    diameterKm: DIAMETER_KM.Sun,
    distanceAu: 0,
    radius: SUN_RADIUS_UNITS,
    orbitDistance: 0,
    axialTilt: 7.25,
    rotationHours: 609.6,
    eccentricity: 0,
    degPerDay: 360 / 25.38,
    map: `${TEX}/sun.jpg`,
  },
  Mercury: {
    name: 'Mercury',
    diameterKm: DIAMETER_KM.Mercury,
    distanceAu: AU.Mercury,
    radius: radiusUnits(DIAMETER_KM.Mercury),
    orbitDistance: distanceUnits(AU.Mercury),
    axialTilt: 0.034,
    rotationHours: 1407.6,
    eccentricity: 0.2056,
    degPerDay: 360 / 87.97,
    map: `${TEX}/mercury.jpg`,
  },
  Venus: {
    name: 'Venus',
    diameterKm: DIAMETER_KM.Venus,
    distanceAu: AU.Venus,
    radius: radiusUnits(DIAMETER_KM.Venus),
    orbitDistance: distanceUnits(AU.Venus),
    axialTilt: 177.36,
    rotationHours: -5832.5,
    eccentricity: 0.0068,
    degPerDay: 360 / 224.7,
    map: `${TEX}/venus.jpg`,
    atmosphereColor: '#f7d59a',
    atmosphereIntensity: 0.9,
  },
  Earth: {
    name: 'Earth',
    diameterKm: DIAMETER_KM.Earth,
    distanceAu: AU.Earth,
    radius: radiusUnits(DIAMETER_KM.Earth),
    orbitDistance: distanceUnits(AU.Earth),
    axialTilt: 23.44,
    rotationHours: 23.93,
    eccentricity: 0.0167,
    degPerDay: 360 / 365.25,
    map: `${TEX}/earth.jpg`,
    atmosphereColor: '#7eb6ff',
    atmosphereIntensity: 0.7,
  },
  Mars: {
    name: 'Mars',
    diameterKm: DIAMETER_KM.Mars,
    distanceAu: AU.Mars,
    radius: radiusUnits(DIAMETER_KM.Mars),
    orbitDistance: distanceUnits(AU.Mars),
    axialTilt: 25.19,
    rotationHours: 24.62,
    eccentricity: 0.0934,
    degPerDay: 360 / 686.97,
    map: `${TEX}/mars.jpg`,
  },
  Jupiter: {
    name: 'Jupiter',
    diameterKm: DIAMETER_KM.Jupiter,
    distanceAu: AU.Jupiter,
    radius: radiusUnits(DIAMETER_KM.Jupiter),
    orbitDistance: distanceUnits(AU.Jupiter),
    axialTilt: 3.13,
    rotationHours: 9.93,
    eccentricity: 0.0489,
    degPerDay: 360 / 4332.59,
    map: `${TEX}/jupiter.jpg`,
    atmosphereColor: '#e8c896',
    atmosphereIntensity: 0.45,
  },
  Saturn: {
    name: 'Saturn',
    diameterKm: DIAMETER_KM.Saturn,
    distanceAu: AU.Saturn,
    radius: radiusUnits(DIAMETER_KM.Saturn),
    orbitDistance: distanceUnits(AU.Saturn),
    axialTilt: 26.73,
    rotationHours: 10.66,
    eccentricity: 0.0565,
    degPerDay: 360 / 10759,
    map: `${TEX}/saturn.jpg`,
    rings: `${TEX}/saturn_rings.png`,
    atmosphereColor: '#f0d8a0',
    atmosphereIntensity: 0.4,
  },
  Uranus: {
    name: 'Uranus',
    diameterKm: DIAMETER_KM.Uranus,
    distanceAu: AU.Uranus,
    radius: radiusUnits(DIAMETER_KM.Uranus),
    orbitDistance: distanceUnits(AU.Uranus),
    axialTilt: 97.77,
    rotationHours: -17.24,
    eccentricity: 0.0457,
    degPerDay: 360 / 30688.5,
    map: `${TEX}/uranus.jpg`,
    atmosphereColor: '#9be8e8',
    atmosphereIntensity: 0.55,
  },
  Neptune: {
    name: 'Neptune',
    diameterKm: DIAMETER_KM.Neptune,
    distanceAu: AU.Neptune,
    radius: radiusUnits(DIAMETER_KM.Neptune),
    orbitDistance: distanceUnits(AU.Neptune),
    axialTilt: 28.32,
    rotationHours: 16.11,
    eccentricity: 0.0113,
    degPerDay: 360 / 60195,
    map: `${TEX}/neptune.jpg`,
    atmosphereColor: '#6a8aff',
    atmosphereIntensity: 0.55,
  },
};

export const BODIES_ORDER: string[] = [
  'Sun',
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
];

export function angleToOrbitPosition(
  angleDeg: number,
  orbitDistance: number,
  target?: THREE.Vector3
): THREE.Vector3 {
  const rad = (angleDeg * Math.PI) / 180;
  const v = target ?? new THREE.Vector3();
  return v.set(Math.sin(rad) * orbitDistance, 0, -Math.cos(rad) * orbitDistance);
}
