/**
 * Genera la texture degli anelli di Saturno come PNG 2048×64.
 * Modello: 4 bande (D/C/B/A) + Cassini Division, alpha modulato.
 * Eseguire con: `node scripts/make-saturn-rings.cjs`.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 2048;
const H = 64;
const pixels = Buffer.alloc(W * H * 4);

function setPixel(x, y, r, g, b, a) {
  const i = (y * W + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

for (let y = 0; y < H; y++) {
  const yNorm = (y - H / 2) / (H / 2);
  for (let x = 0; x < W; x++) {
    const t = x / W;
    let density = 0;
    let r = 200, g = 170, b = 110;
      g = 170;

    if (t > 0.3 && t < 0.37) density = 0.15 + 0.05 * Math.sin(t * 60);
    else if (t > 0.4 && t < 0.55) density = 0.35 + 0.1 * Math.sin(t * 40);
    else if (t > 0.55 && t < 0.74) density = 0.85 + 0.08 * Math.sin(t * 80);
    else if (t > 0.74 && t < 0.85) density = 0.04 + 0.02 * Math.sin(t * 120);
    else if (t > 0.85 && t < 1.0) density = 0.7 + 0.1 * Math.sin(t * 60);

    const vertGlow = Math.cos(yNorm * Math.PI / 2);
    density *= vertGlow;

    if (t < 0.55) {
      r = 175; g = 150; b = 100;
    } else if (t > 0.85) {
      r = 215; g = 195; b = 130;
    } else {
      r = 220; g = 200; b = 140;
    }

    const a = Math.max(0, Math.min(255, density * 255));
    setPixel(x, y, r, g, b, a);
  }
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 6;

const raw = Buffer.alloc(H * (W * 4 + 1));
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  pixels.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}
const idatData = zlib.deflateSync(raw);
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idatData), chunk('IEND', Buffer.alloc(0))]);

const outPath = path.join(__dirname, '..', 'public', 'textures', 'planets', 'saturn_rings.png');
fs.writeFileSync(outPath, png);
console.log('saturn_rings.png written:', png.length, 'bytes');