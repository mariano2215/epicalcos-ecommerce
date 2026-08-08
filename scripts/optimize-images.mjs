#!/usr/bin/env node
/**
 * optimize-images.mjs
 * Convierte a WebP las imágenes decorativas y de testimonios, que se servían
 * como PNG enormes, y reescribe los manifests que las referencian.
 *
 * POR QUÉ: en el Home, `stickers-cutout/nuevas/*.png` (el campo de stickers del
 * hero) pesaba 649 KB de los 820 KB de imágenes de la página — el 79 % del peso
 * era DECORACIÓN, y encima en el camino del LCP. Son PNG de 500×500 (algunos de
 * 1080×1080) que se muestran a 66–132 px de ancho. Los testimonios eran peor:
 * tres PNG de hasta 1,1 MB para cards de ~350 px.
 *
 * Qué hace:
 *   - stickers-cutout/**.png  → .webp, ancho máx 320 px (2,5× el slot más grande)
 *   - testimonials/*.png      → .webp, ancho máx 800 px
 *   - reescribe data/nuevas-catalogo.json y data/cutouts.json a .webp
 *   - NO borra los PNG originales: son la fuente. Se excluyen del deploy por
 *     .gitignore si hiciera falta; hoy quedan como respaldo para regenerar.
 *
 * Idempotente: si el .webp ya existe y es más nuevo que el .png, no rehace nada.
 *
 * Uso:  node scripts/optimize-images.mjs
 * Requiere `cwebp` (brew install webp). Sin cwebp, avisa y no toca nada.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'frontend', 'public');

/** Carpetas a convertir, con el ancho máximo al que tiene sentido servirlas. */
const TARGETS = [
  { dir: join(PUBLIC, 'stickers-cutout'), maxWidth: 320, quality: 82, recursive: true },
  { dir: join(PUBLIC, 'testimonials'), maxWidth: 800, quality: 80, recursive: false }
];

/** Manifests que listan rutas .png y hay que reapuntar a .webp. */
const MANIFESTS = [join(PUBLIC, 'data', 'nuevas-catalogo.json'), join(PUBLIC, 'data', 'cutouts.json')];

function tieneCwebp() {
  try {
    execFileSync('cwebp', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Todos los .png de un directorio (recursivo opcional). */
function pngsDe(dir, recursive) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) out.push(...pngsDe(full, true));
    } else if (extname(entry.name).toLowerCase() === '.png') {
      out.push(full);
    }
  }
  return out;
}

function convertir({ dir, maxWidth, quality, recursive }) {
  const pngs = pngsDe(dir, recursive);
  let hechos = 0;
  let saltados = 0;
  let antes = 0;
  let despues = 0;

  for (const png of pngs) {
    const webp = png.replace(/\.png$/i, '.webp');
    const pesoPng = statSync(png).size;
    antes += pesoPng;

    // Idempotencia: si el webp ya está y es más nuevo, no rehacemos.
    if (existsSync(webp) && statSync(webp).mtimeMs >= statSync(png).mtimeMs) {
      despues += statSync(webp).size;
      saltados++;
      continue;
    }

    // `-resize W 0` mantiene proporción; solo achica si el original es más ancho.
    // `-alpha_q` cuida el canal alfa: estos stickers son troquelados y el borde
    // transparente es justamente lo que los hace verse recortados.
    execFileSync('cwebp', [
      '-quiet',
      '-q', String(quality),
      '-alpha_q', '90',
      '-resize', String(maxWidth), '0',
      png,
      '-o', webp
    ]);
    despues += statSync(webp).size;
    hechos++;
  }

  const kb = (n) => Math.round(n / 1024);
  console.log(
    `[img] ${basename(dir)}: ${hechos} convertidos, ${saltados} ya estaban · ` +
      `${kb(antes)} KB → ${kb(despues)} KB (−${Math.round((1 - despues / (antes || 1)) * 100)}%)`
  );
}

/** Reapunta las rutas .png de un manifest a .webp, si el archivo existe. */
function reapuntarManifest(file) {
  if (!existsSync(file)) return;
  const lista = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(lista)) return;
  let cambios = 0;
  const nueva = lista.map((url) => {
    if (typeof url !== 'string' || !url.toLowerCase().endsWith('.png')) return url;
    const webpUrl = url.replace(/\.png$/i, '.webp');
    if (!existsSync(join(PUBLIC, webpUrl.replace(/^\//, '')))) return url;
    cambios++;
    return webpUrl;
  });
  if (cambios) {
    writeFileSync(file, JSON.stringify(nueva, null, 2) + '\n');
    console.log(`[img] ${basename(file)}: ${cambios} rutas → .webp`);
  }
}

if (!tieneCwebp()) {
  console.error('[img] falta `cwebp`. Instalalo con: brew install webp');
  process.exit(1);
}

TARGETS.forEach(convertir);
MANIFESTS.forEach(reapuntarManifest);
