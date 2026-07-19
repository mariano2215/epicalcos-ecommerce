#!/usr/bin/env node
/**
 * import-category-full.mjs
 * Importa TODOS los formatos (png/jpg/jpeg/webp) de UNA carpeta del lote
 * "Stickers CATALOGO" a una categoría del catálogo, renumerando secuencial
 * 1.webp..N.webp → frontend/public/stickers/<slug>/
 *
 * A diferencia de import-catalogo.mjs (solo JPG, append), este:
 *   - toma png/jpg/jpeg/webp
 *   - dedupe por número de diseño (mismo stem en dos formatos = un diseño;
 *     prefiere png > jpeg/jpg > webp)
 *   - RENUMERA secuencial (cierra huecos de la numeración original)
 *   - regenera la carpeta de salida desde cero (borra .webp previos)
 *   - materializa los dataless de iCloud (readFileSync) y tiene fallback CMYK (sips)
 *
 * Uso:
 *   node scripts/import-category-full.mjs "Futbol - Rosario Central" futbol-rosario-central
 */
import { readdirSync, statSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const SRC_BASE = '/Users/marianocalandra/Library/Mobile Documents/com~apple~CloudDocs/Documents/Mariano/EPICALCOS/Stickers/Stickers CATALOGO/Stickers';
const DEST_BASE = '/Users/marianocalandra/Documents/Mariano/epicalcos-ecommerce/frontend/public/stickers';
const QUALITY = 82, WIDTH = 600;

const [folder, slug] = process.argv.slice(2);
if (!folder || !slug) {
  console.error('Uso: node scripts/import-category-full.mjs "<Carpeta origen>" <slug>');
  process.exit(1);
}

const srcDir = join(SRC_BASE, folder);
const outDir = join(DEST_BASE, slug);
if (!existsSync(srcDir)) {
  console.error('No existe la carpeta origen:', srcDir);
  process.exit(1);
}

// Rango de calidad por formato para el desempate cuando un mismo número
// aparece en más de un formato (mayor = se prefiere).
const EXT_RANK = { png: 3, jpeg: 2, jpg: 2, webp: 1 };

const numStem = (name) => parseInt(name, 10);

// Un archivo por número de diseño, prefiriendo el formato de mayor calidad.
const byStem = new Map(); // stem(number) -> { path, rank, name }
for (const name of readdirSync(srcDir)) {
  const m = name.match(/\.(png|jpe?g|webp)$/i);
  if (!m) continue;
  const ext = m[1].toLowerCase();
  const stem = numStem(name);
  if (Number.isNaN(stem)) { console.warn('  (salteado, sin número):', name); continue; }
  const rank = EXT_RANK[ext] ?? 0;
  const prev = byStem.get(stem);
  if (!prev || rank > prev.rank) byStem.set(stem, { path: join(srcDir, name), rank, name });
}

const designs = [...byStem.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
console.log(`Origen: ${folder}`);
console.log(`Diseños únicos (por número): ${designs.length}\n`);

// Regenerar la carpeta de salida desde cero (evita webp huérfanos de importes previos).
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

function convert(src, target) {
  // Materializar el dataless de iCloud (forzar descarga) antes de convertir.
  try { readFileSync(src); } catch { /* si falla igual probamos cwebp */ }
  let r = spawnSync('cwebp', ['-quiet', '-q', String(QUALITY), '-resize', String(WIDTH), '0', src, '-o', target]);
  try { if (r.status === 0 && statSync(target).size > 0) return true; } catch {}
  // Fallback CMYK/perfil raro: convertir a PNG con sips y reintentar.
  const png = join(tmpdir(), `imp-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  const s = spawnSync('sips', ['-s', 'format', 'png', src, '--out', png]);
  if (s.status !== 0) return false;
  r = spawnSync('cwebp', ['-quiet', '-q', String(QUALITY), '-resize', String(WIDTH), '0', png, '-o', target]);
  try { spawnSync('rm', ['-f', png]); } catch {}
  try { return r.status === 0 && statSync(target).size > 0; } catch { return false; }
}

let ok = 0;
const fails = [];
designs.forEach((d, i) => {
  const target = join(outDir, `${i + 1}.webp`);
  if (convert(d.path, target)) ok++;
  else fails.push(d.name);
  if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${designs.length}`);
});

console.log(`\n=== ${slug} ===`);
console.log(`Convertidos: ${ok}/${designs.length}  →  ${outDir}`);
if (fails.length) { console.log('FALLOS:', fails.join(', ')); process.exit(1); }
