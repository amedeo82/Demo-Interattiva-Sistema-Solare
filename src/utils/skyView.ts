/**
 * S13 · F3 — Calcolo alt/az di un corpo celeste visto da un osservatore.
 *
 * Trasformazione semplificata (precisione ~±2°):
 *  1. vettore eliocentrico del pianeta (3D, con i e Ω) tramite
 *     `heliocentricVector3D`
 *  2. vettore geocentrico = pianeta − Terra
 *  3. eclittica → equatoriale: rotazione ε=23.4393° (obliquità J2000)
 *  4. equatoriale → orizzonte: dipende da latitudine e tempo siderale locale
 *  5. → altitudine e azimut
 *
 * L'accuratezza è limitata dal modello kepleriano semplificato (~0.5°-1°
 * di errore su posizioni planetarie) e dalla mancanza di nutazione/precessione.
 * Documentato in docs/ROADMAP.md §3.2 e §6.1.
 */
import { Vector3 } from 'three';
import { planets, type PlanetData } from '../data/planets';
import { BODIES_3D, heliocentricVector3D } from '../scene/bodies3d';
import { keplerPosition } from '../hooks/useOrbitEngine';
import { simTimeForDate } from './simDate';
import { meanLongitudeAt } from './kepler';

const DEG = Math.PI / 180;
const OBLIQUITY_J2000 = 23.4393 * DEG;

export interface Observer {
  /** Latitudine in gradi (positiva = Nord). */
  latDeg: number;
  /** Longitudine in gradi (positiva = Est). */
  lonDeg: number;
}

export interface SkyPosition {
  altDeg: number;
  azDeg: number;
  /** Distanza dal corpo in UA (geocentrica). */
  distanceAU: number;
}

export interface SkyViewResult {
  body: string;
  altDeg: number;
  azDeg: number;
  distanceAU: number;
}

/** GMST in gradi (non normalizzato), per debug e calcolo di differenze. */
export function gmstDegreesRaw(date: Date): number {
  const jd = date.getTime() / 86_400_000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  return (
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000
  );
}

/** GMST (Greenwich Mean Sidereal Time) approssimato in ore, normalizzato in [0, 24).
 *  Formula Meeus semplificata: precisione ~1 minuto, sufficiente per ±2° in alt/az. */
export function gmstHours(date: Date): number {
  let gmst = gmstDegreesRaw(date);
  gmst = ((gmst % 360) + 360) % 360;
  return gmst / 15;
}

/** Calcola alt/az di un corpo geocentrico all'istante indicato. */
export function altitudeAzimuth(
  geo: Vector3, // vettore geocentrico in frame eclittico (AU)
  date: Date,
  observer: Observer
): { altDeg: number; azDeg: number } {
  // 1) Eclittica → equatoriale: rotazione di -ε attorno a X
  // Frame: x verso vernal equinox, z verso polo nord eclittico.
  // Dopo rotazione: x_eq = x_ec, y_eq = y_ec·cos(ε) - z_ec·sin(ε), z_eq = y_ec·sin(ε) + z_ec·cos(ε)
  const cosE = Math.cos(OBLIQUITY_J2000);
  const sinE = Math.sin(OBLIQUITY_J2000);
  const xEq = geo.x;
  const yEq = geo.y * cosE - geo.z * sinE;
  const zEq = geo.y * sinE + geo.z * cosE;
  // 2) LST (Local Sidereal Time) in radianti
  const lstHours = gmstHours(date) + observer.lonDeg / 15;
  const lst = (lstHours * 15) * DEG;
  // 3) Equatoriale → orizzonte: rotazione attorno a Y di -lst
  //    Poi rotazione attorno a X di -(90° - lat) = lat - 90°
  const cosLst = Math.cos(lst);
  const sinLst = Math.sin(lst);
  const xH = xEq * cosLst + zEq * sinLst;
  const yH = -xEq * sinLst + zEq * cosLst;
  const zH = yEq;
  const latRad = observer.latDeg * DEG;
  // Rotazione attorno a X di (lat - 90°): porta il polo nord in zenith.
  // y' = y·cos(90-lat) - z·sin(90-lat) = y·sin(lat) - z·cos(lat)
  // z' = y·sin(90-lat) + z·cos(90-lat) = y·cos(lat) + z·sin(lat)
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const yAlt = yH * sinLat - zH * cosLat;
  const zAlt = yH * cosLat + zH * sinLat;
  // alt = atan2(yAlt, hypot(xH, zAlt))
  // az = atan2(xH, zAlt) (azimut misurato da Sud, in aumento verso Ovest)
  const altRad = Math.atan2(yAlt, Math.sqrt(xH * xH + zAlt * zAlt));
  let azRad = Math.atan2(xH, zAlt);
  if (azRad < 0) azRad += 2 * Math.PI;
  return { altDeg: altRad / DEG, azDeg: azRad / DEG };
}

/**
 * Costruisce un vettore eliocentrico in AU lineari (non compressi) per
 * un corpo data la longitudine eliocentrica media alla data. Usato dal
 * "Cielo da Terra" per evitare la scala logaritmica compressa della scena
 * 3D, che renderebbe il calcolo alt/az privo di senso astronomico.
 *
 * L'inclinazione `i` è applicata per accuratezza. La magnitudine è la
 * distanza in AU (1 per il Sole).
 */
function heliocentricAU(
  longitudeDeg: number,
  distanceAU: number,
  omegaDeg: number | undefined,
  iDeg: number | undefined,
  target: Vector3
): Vector3 {
  const rad = (longitudeDeg * Math.PI) / 180;
  let x = Math.sin(rad) * distanceAU;
  let z = -Math.cos(rad) * distanceAU;
  let y = 0;
  if (iDeg && Math.abs(iDeg) > 0.01) {
    const iRad = (iDeg * Math.PI) / 180;
    y = -z * Math.sin(iRad);
    z = z * Math.cos(iRad);
  }
  if (omegaDeg && Math.abs(omegaDeg) > 0.01) {
    const oRad = (omegaDeg * Math.PI) / 180;
    const cosO = Math.cos(oRad);
    const sinO = Math.sin(oRad);
    const xR = x * cosO - z * sinO;
    const zR = x * sinO + z * cosO;
    x = xR;
    z = zR;
  }
  return target.set(x, y, z);
}

/** Calcola il cielo (alt/az) per tutti i pianeti alla data/osservatore.
 *
 * Usa longitudini MEDIE reali (meanLongitudeAt) in frame AU lineari, NON
 * la posizione 3D del modello (che è decorativa e usa scala compressa).
 */
export function computeSkyView(date: Date, observer: Observer): SkyViewResult[] {
  const earth = planets.find((p) => p.name === 'Earth')!;
  // Longitudine eliocentrica della Terra alla data (modello semplificato
  // J2000 + moto medio).
  const lamEarth = meanLongitudeAt(earth.meanLongitudeJ2000, earth.orbitalPeriod, date);
  const earthBody = BODIES_3D['Earth']!;
  const vE = heliocentricAU(lamEarth, 1, earthBody.longitudeOfAscendingNode, earthBody.orbitalInclination, new Vector3());
  // Sole: opposto a vE, distanza 1 AU
  const vSun = vE.clone().negate();
  const { altDeg: sunAlt, azDeg: sunAz } = altitudeAzimuth(vSun, date, observer);
  const out: SkyViewResult[] = [
    { body: 'Sun', altDeg: sunAlt, azDeg: sunAz, distanceAU: 1 },
  ];
  for (const p of planets) {
    if (p.name === 'Earth') continue;
    const lamP = meanLongitudeAt(p.meanLongitudeJ2000, p.orbitalPeriod, date);
    const pBody = BODIES_3D[p.name];
    if (!pBody) continue;
    // distanceFromSun è in mln km → dividi per 149.6 (1 UA) per ottenere UA.
    const distAU_elio = p.distanceFromSun / 149.6;
    const vP = heliocentricAU(
      lamP,
      distAU_elio,
      pBody.longitudeOfAscendingNode,
      pBody.orbitalInclination,
      new Vector3()
    );
    const geo = vP.clone().sub(vE);
    const { altDeg, azDeg } = altitudeAzimuth(geo, date, observer);
    out.push({ body: p.name, altDeg, azDeg, distanceAU: geo.length() });
  }
  return out;
}

/** Sole: alt/az direttamente dalla longitudine media. */
export function sunAltitude(date: Date, observer: Observer): number {
  const earth = planets.find((p) => p.name === 'Earth')!;
  const lamEarth = meanLongitudeAt(earth.meanLongitudeJ2000, earth.orbitalPeriod, date);
  const earthBody = BODIES_3D['Earth']!;
  const vE = heliocentricAU(
    lamEarth,
    1,
    earthBody.longitudeOfAscendingNode,
    earthBody.orbitalInclination,
    new Vector3()
  );
  const { altDeg } = altitudeAzimuth(vE.clone().negate(), date, observer);
  return altDeg;
}
