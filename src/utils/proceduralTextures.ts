/**
 * Texture procedurali per i pianeti che non hanno un asset NASA dedicato
 * (es. Venere, le cui nubi sono generate al volo) e per gli anelli di
 * Urano/Nettuno (non inclusi nella collezione Solar System Scope).
 *
 * Three.js <CanvasTexture> permette di disegnare su un canvas 2D e usarlo
 * come `THREE.Texture`: nessun download, nessun asset, determinismo
 * garantito.
 */
import * as THREE from 'three';

/** Genera una texture "nubi" per Venere: sfondo crema con swirl giallastri
 *  che simulano la copertura nuvolosa densa dell'atmosfera venusiana.
 *  Pattern sinusoidale modulato in latitudine + banda orizzontale. */
export function makeVenusCloudsTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2; // 2:1 (sfera equirettangolare)
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base: gradiente verticale giallo → crema
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#d4b88a');
  grad.addColorStop(0.4, '#e8d3a0');
  grad.addColorStop(0.5, '#f0dab2');
  grad.addColorStop(0.6, '#e8d3a0');
  grad.addColorStop(1, '#c4a878');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Swirl nuvolosi: seni+coseni a frequenze diverse per dare "turbolenza"
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#fff2d0';
  for (let y = 0; y < canvas.height; y += 4) {
    const lat = (y / canvas.height) * Math.PI; // 0..π
    const bands = 12;
    for (let x = 0; x < canvas.width; x += 6) {
      const lon = (x / canvas.width) * Math.PI * 2;
      const t = Math.sin(lon * bands + lat * 4) * Math.cos(lat * 3 + lon * 2);
      if (t > 0.4) {
        ctx.fillRect(x, y, 5, 4);
      }
    }
  }
  // Bande equatoriali più dense (regione di massima attività convettiva)
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#fff8dc';
  for (let x = 0; x < canvas.width; x += 3) {
    const lon = (x / canvas.width) * Math.PI * 2;
    if (Math.cos(lon * 8) > 0.5) {
      ctx.fillRect(x, canvas.height * 0.45, 3, canvas.height * 0.1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Genera una texture "anelli sottili" per Urano: stria quasi
 *  trasparente, prevalenza di polveri e ghiaccio — molto meno densa
 *  di Saturno. */
export function makeUranusRingsTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.clearRect(0, 0, size, 16);
  for (let x = 0; x < size; x++) {
    const u = x / size;
    const dist = Math.abs(u - 0.5);
    let alpha = 0;
    if (dist < 0.18) {
      alpha = Math.max(0, 0.35 - dist * 1.8) * (0.6 + 0.4 * Math.sin(u * 30));
    }
    ctx.fillStyle = `rgba(220, 240, 255, ${alpha})`;
    ctx.fillRect(x, 0, 1, 16);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Genera una texture "anelli sottili" per Nettuno: 5 archi molto
 *  sottili (Adams, Le Verrier, Galle, Arago, Lassell). */
export function makeNeptuneRingsTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.clearRect(0, 0, size, 16);
  const arcs = [0.32, 0.4, 0.5, 0.58, 0.66];
  for (const u of arcs) {
    const x = Math.round(u * size);
    const opacity = 0.15 + (1 - Math.abs(0.5 - u) * 2) * 0.1;
    ctx.fillStyle = `rgba(180, 200, 230, ${opacity})`;
    ctx.fillRect(x, 4, 2, 8);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
