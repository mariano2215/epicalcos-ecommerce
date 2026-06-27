#!/usr/bin/env node
/**
 * topup-catalogo.mjs  (correr UNA vez, después de import-catalogo.mjs)
 * Completa dos huecos del primer pase:
 *   A) JPGs en SUBCARPETAS anidadas → van a la categoría de la carpeta de nivel 1
 *      (p.ej. "TV - Disney/Mickey Mouse/*.jpg" → categoría "tv-disney").
 *   B) Los 13 JPG CMYK que cwebp no pudo leer en el primer pase → se convierten con
 *      fallback sips (CMYK→RGB png) y después cwebp.
 * Append-only: agrega a continuación del último índice de cada categoría (no renumera).
 */
import { readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const SRC = '/Users/marianocalandra/Library/Mobile Documents/com~apple~CloudDocs/Documents/Mariano/EPICALCOS/Stickers/Stickers CATALOGO/Stickers';
const DEST = '/Users/marianocalandra/Documents/Mariano/epicalcos-ecommerce/frontend/public/stickers';
const QUALITY = 82, WIDTH = 600;

const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// 13 fallas CMYK del primer pase (relativas a SRC)
const CMYK_FAILS = [
  'Diseños - Falopa/13.jpg', 'Diseños - Videojuegos/tv.jpg',
  'Escritura - Frases/83.jpg', 'Escritura - Frases/84.jpg',
  'Feminismo/55.jpg', 'Feminismo/89.jpg',
  'Futbol - NOB/1.jpg', 'Futbol - NOB/15.jpg',
  'Naturaleza - Corazones/12.jpg', 'Naturaleza - Corazones/14.jpg', 'Naturaleza - Corazones/15.jpg',
  'TV - Cartoon Network/58.jpg', 'Travel - Van Life/9.jpg',
];

// walk recursivo: todos los .jpg/.jpeg bajo dir, a CUALQUIER profundidad
function walkJpg(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkJpg(p));
    else if (/\.(jpe?g)$/i.test(e.name)) out.push(p);
  }
  return out;
}

// convierte src→target webp; si cwebp falla (CMYK), fallback con sips→png
function convert(src, target) {
  try { if (statSync(target).size > 0) return true; } catch {}
  let r = spawnSync('cwebp', ['-quiet', '-q', String(QUALITY), '-resize', String(WIDTH), '0', src, '-o', target]);
  try { if (r.status === 0 && statSync(target).size > 0) return true; } catch {}
  // fallback CMYK→RGB
  const png = join(tmpdir(), `topup-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  const s = spawnSync('sips', ['-s', 'format', 'png', src, '--out', png]);
  if (s.status !== 0) return false;
  r = spawnSync('cwebp', ['-quiet', '-q', String(QUALITY), '-resize', String(WIDTH), '0', png, '-o', target]);
  try { spawnSync('rm', ['-f', png]); } catch {}
  try { return r.status === 0 && statSync(target).size > 0; } catch { return false; }
}

// arma pending por slug
const pending = new Map(); // slug -> { outDir, files: [] }
const add = (slug, file) => {
  const outDir = join(DEST, slug);
  if (!pending.has(slug)) pending.set(slug, { outDir, files: [] });
  pending.get(slug).files.push(file);
};

// Bucket A: anidados (mindepth 2)
const topDirs = readdirSync(SRC, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
for (const name of topDirs) {
  const dir = join(SRC, name);
  const slug = slugify(name);
  for (const f of walkJpg(dir)) {
    if (dirname(f) !== dir) add(slug, f); // solo los que están en subcarpetas
  }
}
// Bucket B: CMYK del nivel 1
for (const rel of CMYK_FAILS) add(slugify(rel.split('/')[0]), join(SRC, rel));

// ejecutar append por categoría
let okCount = 0, failCount = 0; const fails = [];
const created = [];
for (const [slug, { outDir, files }] of [...pending].sort()) {
  const isNew = !existsSync(outDir);
  mkdirSync(outDir, { recursive: true });
  if (isNew) created.push(slug);
  const ex = readdirSync(outDir).filter((f) => /\.webp$/i.test(f)).map((f) => parseInt(f, 10)).filter((n) => !Number.isNaN(n));
  let next = (ex.length ? Math.max(...ex) : 0) + 1;
  let added = 0;
  for (const src of files) {
    const target = join(outDir, `${next}.webp`);
    if (convert(src, target)) { okCount++; added++; next++; }
    else { failCount++; fails.push(src); }
  }
  console.log(`${isNew ? 'NUEVA ' : '      '} ${slug}  +${added}${isNew ? ' (categoría nueva)' : ''}`);
}

console.log(`\nTop-up: ${okCount} agregados, ${failCount} fallos.`);
if (created.length) console.log(`Categorías nuevas creadas: ${created.join(', ')}`);
if (fails.length) { console.log('FALLOS:'); fails.forEach((f) => console.log('  ', f)); process.exit(1); }
