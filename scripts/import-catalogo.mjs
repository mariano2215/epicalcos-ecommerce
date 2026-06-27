#!/usr/bin/env node
/**
 * import-catalogo.mjs
 * Importa el lote "Stickers CATALOGO" (una subcarpeta por categoría) al catálogo
 * de EPICALCOS, SOLO archivos .jpg/.jpeg, redimensionados a 600px y convertidos a
 * webp q82 → frontend/public/stickers/<slug>/<n>.webp
 *
 * - El nombre de la carpeta es la categoría tal cual ("TV - Marvel" → slug "tv-marvel").
 * - Carpetas sin JPG se saltean.
 * - Si el slug ya existe (p.ej. "Memes", "Argentina"), NO duplica la categoría:
 *   agrega los JPG nuevos numerados a continuación del último índice existente.
 * - Numeración determinística (i-ésimo JPG ordenado → base+i), así reintentar es idempotente.
 *   OJO: está pensado para correr UNA vez; no re-ejecutar de cero (recalcularía la base).
 *
 * Uso:
 *   node scripts/import-catalogo.mjs                 # todo
 *   node scripts/import-catalogo.mjs "TV - Marvel"   # solo algunas (para probar)
 */
import { readdirSync, statSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const SRC = '/Users/marianocalandra/Library/Mobile Documents/com~apple~CloudDocs/Documents/Mariano/EPICALCOS/Stickers/Stickers CATALOGO/Stickers';
const DEST = '/Users/marianocalandra/Documents/Mariano/epicalcos-ecommerce/frontend/public/stickers';
const QUALITY = 82;
const WIDTH = 600;
const JOBS = 8;

const onlyArgs = process.argv.slice(2); // si hay args, limita a esas carpetas

const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '') // saca acentos (ñ→n, á→a)
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const numCmp = (a, b) => {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b);
  return na - nb;
};

const dirs = readdirSync(SRC)
  .filter((d) => { try { return statSync(join(SRC, d)).isDirectory(); } catch { return false; } })
  .filter((d) => onlyArgs.length === 0 || onlyArgs.some((a) => a.normalize('NFC') === d.normalize('NFC')))
  .sort();

const plan = [];
const slugSeen = new Map();
for (const cat of dirs) {
  const dir = join(SRC, cat);
  const files = readdirSync(dir).filter((f) => /\.(jpe?g)$/i.test(f)).sort(numCmp);
  if (files.length === 0) continue;

  const slug = slugify(cat);
  if (slugSeen.has(slug)) console.error(`⚠️  SLUG DUPLICADO: "${slug}" de "${cat}" y "${slugSeen.get(slug)}"`);
  slugSeen.set(slug, cat);

  const outDir = join(DEST, slug);
  let base = 0;
  const merge = existsSync(outDir);
  if (merge) {
    const ex = readdirSync(outDir).filter((f) => /\.webp$/i.test(f)).map((f) => parseInt(f, 10)).filter((n) => !Number.isNaN(n));
    base = ex.length ? Math.max(...ex) : 0;
  }
  const mapped = files.map((f, i) => ({ src: join(dir, f), target: join(outDir, `${base + i + 1}.webp`) }));
  plan.push({ cat, slug, outDir, base, merge, count: files.length, files: mapped });
}

for (const p of plan) mkdirSync(p.outDir, { recursive: true });

const tasks = plan.flatMap((p) => p.files);
console.log(`Categorías: ${plan.length} · JPG a convertir: ${tasks.length}\n`);

let idx = 0, done = 0;
let failures = [];

const convert = (t) => new Promise((res) => {
  try { if (statSync(t.target).size > 0) { res(true); return; } } catch {}
  const ch = spawn('cwebp', ['-quiet', '-q', String(QUALITY), '-resize', String(WIDTH), '0', t.src, '-o', t.target]);
  ch.on('close', (code) => {
    let ok = code === 0;
    try { ok = ok && statSync(t.target).size > 0; } catch { ok = false; }
    if (!ok) failures.push(t);
    res(ok);
  });
  ch.on('error', () => { failures.push(t); res(false); });
});

async function worker() {
  while (idx < tasks.length) {
    const t = tasks[idx++];
    await convert(t);
    if (++done % 100 === 0) console.log(`  ${done}/${tasks.length}`);
  }
}
await Promise.all(Array.from({ length: JOBS }, worker));

if (failures.length) {
  console.log(`\nReintentando ${failures.length} fallos (forzando descarga iCloud con readFileSync)…`);
  const retry = failures; failures = [];
  for (const t of retry) {
    try { readFileSync(t.src); } catch {}
    await convert(t);
  }
}

console.log('\n=== RESUMEN ===');
for (const p of plan) console.log(`${p.merge ? 'MERGE ' : 'nueva '} ${p.slug}  +${p.count}${p.merge ? ` (base ${p.base})` : ''}  «${p.cat}»`);
const tot = plan.reduce((a, p) => a + p.count, 0);
console.log(`\nTotal: ${plan.length} categorías, ${tot} JPG importados, ${failures.length} fallos.`);
if (failures.length) { console.log('FALLOS:'); failures.forEach((t) => console.log('  ', t.src)); process.exit(1); }
