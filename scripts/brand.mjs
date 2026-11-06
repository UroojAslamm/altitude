// Brand jobs (PRD 0.3): palette sampling, logo vectorizing, photo optimizing.
import sharp from 'sharp';
import potrace from 'potrace';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const trace = promisify(potrace.trace);
const REF = 'docs/brand-reference';
const OUT = 'public/brand';
const PHOTOS = {
  counter: 'photo-a-counter.webp',
  lounge: 'photo-c-lounge.webp',
  cup: 'photo-d-cup.webp',
  wall: 'photo-b-wall.webp',
};

async function exists(p) {
  return fs.access(p).then(() => true, () => false);
}

function kmeans(px, k = 6, iters = 12) {
  let c = Array.from({ length: k }, (_, i) => px[Math.floor(((i + 0.5) * px.length) / k)]);
  let counts = [];
  for (let it = 0; it < iters; it++) {
    const sum = c.map(() => [0, 0, 0]);
    counts = c.map(() => 0);
    for (const p of px) {
      let best = 0;
      let bd = Infinity;
      c.forEach((q, i) => {
        const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      counts[best]++;
      for (let j = 0; j < 3; j++) sum[best][j] += p[j];
    }
    c = c.map((q, i) => (counts[i] ? sum[i].map((v) => v / counts[i]) : q));
  }
  return c
    .map((q, i) => ({
      hex: '#' + q.map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''),
      share: counts[i] / px.length,
    }))
    .sort((a, b) => b.share - a.share);
}

async function palette() {
  const result = {};
  for (const [name, file] of Object.entries(PHOTOS)) {
    const p = path.join(REF, file);
    if (!(await exists(p))) continue;
    const { data } = await sharp(p)
      .resize(80, 80, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px = [];
    for (let i = 0; i < data.length; i += 3) px.push([data[i], data[i + 1], data[i + 2]]);
    result[name] = kmeans(px);
  }
  await fs.writeFile('docs/palette-samples.json', JSON.stringify(result, null, 2));
  return result;
}

function logoSvg(buf, color) {
  return trace(buf, { color, background: 'transparent', threshold: 150, turdSize: 20, optTolerance: 0.3 });
}

async function logos() {
  const src = path.join(REF, 'logo-source.png');
  // Upscale the 150px source before tracing so curves come out smooth.
  const SCALE = 1200;
  const trimmed = await sharp(src)
    .flatten({ background: '#ffffff' })
    .grayscale()
    .trim({ threshold: 30 })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = trimmed.info;
  const big = await sharp(trimmed.data)
    .resize(SCALE, Math.round((SCALE * height) / width), { kernel: 'lanczos3' })
    .blur(5)
    .png()
    .toBuffer();
  const meta = await sharp(big).metadata();

  await fs.writeFile(`${OUT}/logo.svg`, await logoSvg(big, '#2E3C93'));
  await fs.writeFile(`${OUT}/logo-cream.svg`, await logoSvg(big, '#FBF7EF'));

  // Mark only: find the blank rows between wordmark and symbol.
  const { data, info } = await sharp(big).raw().toBuffer({ resolveWithObject: true });
  const rowInk = (y) => {
    let n = 0;
    for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * info.channels] < 128) n++;
    return n;
  };
  let y = Math.floor(info.height * 0.1);
  while (y < info.height && rowInk(y) > 0) y++;
  while (y < info.height && rowInk(y) === 0) y++;
  const markBuf = await sharp(big)
    .extract({ left: 0, top: y, width: meta.width, height: meta.height - y })
    .trim({ threshold: 30 })
    .png()
    .toBuffer();
  await fs.writeFile(`${OUT}/logo-mark.svg`, await logoSvg(markBuf, '#2E3C93'));
  await fs.writeFile(`${OUT}/logo-mark-cream.svg`, await logoSvg(markBuf, '#FBF7EF'));

  // PWA icons: cream mark on ink.
  const markSvg = await fs.readFile(`${OUT}/logo-mark-cream.svg`);
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.62);
    const mark = await sharp(markSvg, { density: 300 })
      .resize(inner, inner, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: '#14110F' } })
      .composite([{ input: mark, gravity: 'center' }])
      .png()
      .toFile(`${OUT}/icon-${size}.png`);
  }
}

async function photos() {
  const manifest = {};
  for (const [name, file] of Object.entries(PHOTOS)) {
    const p = path.join(REF, file);
    if (!(await exists(p))) continue;
    const meta = await sharp(p).metadata();
    for (const w of [480, 960, 1600]) {
      const width = Math.min(w, meta.width);
      await sharp(p).resize({ width }).avif({ quality: 55 }).toFile(`${OUT}/photos/${name}-${w}.avif`);
      await sharp(p).resize({ width }).webp({ quality: 74 }).toFile(`${OUT}/photos/${name}-${w}.webp`);
    }
    const blur = await sharp(p).resize(24).blur(1).webp({ quality: 40 }).toBuffer();
    manifest[name] = { blur: `data:image/webp;base64,${blur.toString('base64')}`, ratio: meta.width / meta.height };
  }
  await fs.writeFile('src/lib/photos.json', JSON.stringify(manifest, null, 2));
}

await fs.mkdir(`${OUT}/photos`, { recursive: true });
await fs.mkdir('src/lib', { recursive: true });
const pal = await palette();
await logos();
await photos();
for (const [k, v] of Object.entries(pal)) console.log(k, v.map((c) => c.hex).join(' '));
