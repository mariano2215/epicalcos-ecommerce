#!/usr/bin/env node
// scripts/build-duplicados.mjs
//
// Mapa de diseños repetidos del catálogo: archivo duplicado → archivo canónico.
//
// Por qué existe: el mismo dibujo aparece en más de una carpeta (un meme que
// también está en TV - Bob Esponja, una flor que también está en Naturaleza -
// Corazones…). Como son archivos distintos, la grilla de /categorías no tiene
// forma de saber que son el mismo diseño y podría mostrarlo dos veces. Este
// mapa se lo dice: son ~15 pares sobre 6.500 archivos, así que el JSON pesa
// menos de 2 KB.
//
// Uso:
//   node scripts/build-duplicados.mjs
//
// Correlo después de regenerar el catálogo (scripts/build-catalog.mjs). Si
// queda desactualizado no rompe nada: en el peor caso se cuela un diseño
// repetido, que es exactamente lo que pasaba antes de que existiera.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STICKERS = join(__dirname, '..', 'frontend', 'public', 'stickers');
const SALIDA = join(__dirname, '..', 'frontend', 'public', 'data', 'duplicados.json');

const md5 = (buf) => createHash('md5').update(buf).digest('hex');

/** [{ hash, url }] de todos los .webp del catálogo. */
function listarArchivos() {
  const out = [];
  for (const slug of readdirSync(STICKERS).sort()) {
    const dir = join(STICKERS, slug);
    if (!statSync(dir).isDirectory()) continue;
    const archivos = readdirSync(dir)
      .filter((f) => f.endsWith('.webp'))
      // Orden numérico: 2.webp antes que 10.webp. Importa porque el primero de
      // cada grupo es el canónico y queremos que el mapa sea estable.
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    for (const f of archivos) {
      out.push({ hash: md5(readFileSync(join(dir, f))), url: `/stickers/${slug}/${f}` });
    }
  }
  return out;
}

const archivos = listarArchivos();

const porHash = new Map();
for (const a of archivos) {
  if (!porHash.has(a.hash)) porHash.set(a.hash, []);
  porHash.get(a.hash).push(a.url);
}

const mapa = {};
let grupos = 0;
for (const urls of porHash.values()) {
  if (urls.length < 2) continue;
  grupos++;
  const [canonica, ...resto] = urls;
  for (const dup of resto) mapa[dup] = canonica;
}

writeFileSync(SALIDA, JSON.stringify(mapa, null, 2) + '\n');

console.log(`[duplicados] ${archivos.length} archivos · ${grupos} diseños repetidos · ${Object.keys(mapa).length} entradas`);
console.log(`[duplicados] escrito en ${SALIDA}`);
