/**
 * Texture procedurali per i pianeti.
 *
 * Ogni pianeta riceve una texture generata su un <canvas> 2D offscreen:
 * - Mercurio/Luna: crateri (cerchi con luce/ombra)
 * - Venere/Terra: nuvole e continui (noise sfumato)
 * - Marte: macchie di polvere e calotta polare
 * - Giove/Saturno: fasce orizzontali turbolente + Grande Macchia Rossa
 * - Urano/Nettuno: velature di metano lisce
 *
 * Le texture sono memoizzate per nome del pianeta e ruotano via CSS per
 * simulare la rotazione assiale (con inclinazione dell'asse reale).
 */
import { useMemo } from 'react';

export type TextureKind = 'cratered' | 'cloudy' | 'earthlike' | 'dusty' | 'banded' | 'icy';

const TEX_W = 128; // doppio della dimensione massima dei pianeti in scena
const TEX_H = 64;

/** PRNG deterministico (mulberry32). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fillBase(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
}

function drawCraters(
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  count: number,
  tone: number
) {
  for (let i = 0; i < count; i++) {
    const x = rand() * TEX_W;
    const y = rand() * TEX_H;
    const r = 1.5 + rand() * 5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${0.18 * tone})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.75, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.12 * tone})`;
    ctx.fill();
  }
}

function drawBands(
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  palette: string[],
  turbulence = 2
) {
  let y = 0;
  while (y < TEX_H) {
    const h = 3 + rand() * 8;
    ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
    ctx.globalAlpha = 0.55 + rand() * 0.4;
    // banda ondulata
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= TEX_W; x += 8) {
      ctx.lineTo(x, y + Math.sin((x / TEX_W) * Math.PI * (2 + rand() * 3)) * turbulence);
    }
    ctx.lineTo(TEX_W, y + h);
    for (let x = TEX_W; x >= 0; x -= 8) {
      ctx.lineTo(x, y + h + Math.sin((x / TEX_W) * Math.PI * (2 + rand() * 3)) * turbulence);
    }
    ctx.closePath();
    ctx.fill();
    y += h;
  }
  ctx.globalAlpha = 1;
}

function drawSpots(
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  count: number,
  color: string,
  maxR = 4
) {
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.ellipse(
      rand() * TEX_W,
      rand() * TEX_H,
      1 + rand() * maxR,
      1 + rand() * maxR * 0.6,
      rand() * Math.PI,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25 + rand() * 0.35;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Disegna la texture di un pianeta sul canvas e restituisce l'URL data-uri. */
export function paintPlanetTexture(kind: TextureKind, baseColor: string): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const rand = mulberry32(kind.length * 1000 + baseColor.charCodeAt(1));

  switch (kind) {
    case 'cratered':
      fillBase(ctx, baseColor);
      drawCraters(ctx, rand, 90, 1);
      break;
    case 'cloudy':
      fillBase(ctx, baseColor);
      drawSpots(ctx, rand, 40, 'rgba(255,255,255,0.9)', 10);
      drawBands(ctx, rand, ['rgba(255,255,255,0.35)', 'rgba(255,240,210,0.3)'], 1);
      break;
    case 'earthlike':
      fillBase(ctx, '#1c5f9e');
      drawSpots(ctx, rand, 26, '#3f7d3a', 12);
      drawSpots(ctx, rand, 18, '#5d9b52', 8);
      drawSpots(ctx, rand, 30, 'rgba(255,255,255,0.85)', 6);
      break;
    case 'dusty':
      fillBase(ctx, baseColor);
      drawSpots(ctx, rand, 45, 'rgba(90,35,10,0.5)', 7);
      // calotta polare
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(0, 0, TEX_W, 5);
      ctx.fillRect(0, TEX_H - 5, TEX_W, 5);
      break;
    case 'banded':
      fillBase(ctx, baseColor);
      drawBands(ctx, rand, ['#e8d3ac', '#b98d55', '#8a5f33', '#f2e3c2', '#caa06a'], 2.5);
      if (baseColor === '#c8a060') {
        // Grande Macchia Rossa di Giove
        ctx.beginPath();
        ctx.ellipse(TEX_W * 0.62, TEX_H * 0.62, 12, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#b5432c';
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    case 'icy':
      fillBase(ctx, baseColor);
      drawBands(ctx, rand, ['rgba(255,255,255,0.18)', 'rgba(0,40,60,0.15)'], 1);
      break;
  }
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/** Mappa nome pianeta → tipo di texture. */
const KIND_BY_PLANET: Record<string, TextureKind> = {
  Mercury: 'cratered',
  Venus: 'cloudy',
  Earth: 'earthlike',
  Mars: 'dusty',
  Jupiter: 'banded',
  Saturn: 'banded',
  Uranus: 'icy',
  Neptune: 'icy',
  Luna: 'cratered',
};

/** Hook: URL data-uri della texture procedurale del pianeta (memoizzata). */
export function usePlanetTexture(name: string, color: string): string | null {
  return useMemo(() => {
    const kind = KIND_BY_PLANET[name];
    if (!kind) return null;
    return paintPlanetTexture(kind, color);
  }, [name, color]);
}

export const TEXTURE_KINDS = KIND_BY_PLANET;
