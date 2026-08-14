#!/usr/bin/env node
/**
 * build-catalog.mjs
 * Escanea frontend/public/stickers/<categoria>/*.webp y genera:
 *   - frontend/public/data/<categoria>.json  → [{ id, file }]   (fetch on-demand por categoría)
 *   - frontend/public/data/catalog.json       → [{ slug, count, cover }]  (metadata liviana)
 *   - frontend/src/data/catalogStats.js       → CATEGORY_COUNT  (se hornea en el bundle)
 *
 * Correr DESPUÉS de import-stickers.sh. Es resumible: regenera con lo que haya.
 */
import { readdirSync, statSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'frontend', 'public');
const STICKERS = join(ROOT, 'stickers');
const DATA = join(ROOT, 'data');

if (!existsSync(STICKERS)) {
  console.error('No existe', STICKERS, '— corré primero scripts/import-stickers.sh');
  process.exit(1);
}
mkdirSync(DATA, { recursive: true });

// Orden numérico natural (2.webp antes que 10.webp)
const numStem = (f) => parseInt(f.replace(/\.webp$/i, ''), 10);
const byNum = (a, b) => {
  const na = numStem(a), nb = numStem(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b);
  return na - nb;
};

const cats = readdirSync(STICKERS)
  .filter((d) => statSync(join(STICKERS, d)).isDirectory())
  .sort();

const catalog = [];

for (const slug of cats) {
  const dir = join(STICKERS, slug);
  const files = readdirSync(dir).filter((f) => /\.webp$/i.test(f)).sort(byNum);
  if (files.length === 0) continue;

  // Preservar sku/stock ya asignados (los pone scripts/build-meta-feed.mjs).
  // Meta trackea productos por id → un rebuild NO debe borrar ni renumerar SKUs.
  const outPath = join(DATA, `${slug}.json`);
  const prevById = existsSync(outPath)
    ? Object.fromEntries(JSON.parse(readFileSync(outPath, 'utf8')).map((p) => [p.id, p]))
    : {};

  const items = files.map((f) => {
    const stem = f.replace(/\.webp$/i, '');
    const id = `${slug}-${stem}`;
    const item = { id, file: `/stickers/${slug}/${f}` };
    const prev = prevById[id];
    if (prev?.sku) {
      item.sku = prev.sku;
      item.stock = prev.stock ?? 50;
    }
    return item;
  });

  writeFileSync(outPath, JSON.stringify(items));
  catalog.push({ slug, count: items.length, cover: items[0].file });
  console.log(`${slug}: ${items.length}`);
}

writeFileSync(join(DATA, 'catalog.json'), JSON.stringify(catalog, null, 0));
const total = catalog.reduce((a, c) => a + c.count, 0);

// La cantidad de categorías se muestra en el Hero y en las landings por caso de
// uso. Estaba escrita a mano ("99 categorías") en tres lugares y quedaba vieja
// cada vez que cambiaba el catálogo: ahora sale de acá.
//
// Se escribe como módulo JS y NO se lee de /data/catalog.json en runtime a
// propósito: el Hero es eager por LCP (regla 12) y un fetch para pintar un
// número del copy sería un salto de layout servido a costa del LCP. Como el
// build de Netlify no corre este script, el archivo se commitea igual que
// catalog.json.
const STATS_FILE = join(ROOT, '..', 'src', 'data', 'catalogStats.js');
writeFileSync(
  STATS_FILE,
  '// GENERADO por scripts/build-catalog.mjs — no editar a mano.\n' +
    '// Se regenera al correr el pipeline del catálogo y se commitea con él.\n\n' +
    '/** Categorías de calcos publicadas (las que tienen al menos un .webp). */\n' +
    `export const CATEGORY_COUNT = ${catalog.length};\n`
);

console.log(`\ncatalog.json → ${catalog.length} categorías, ${total} stickers`);
console.log(`catalogStats.js → CATEGORY_COUNT = ${catalog.length}`);
