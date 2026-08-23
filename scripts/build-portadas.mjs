#!/usr/bin/env node
/**
 * build-portadas.mjs
 * Qué diseños de cada categoría sirven como PORTADA de la card.
 *
 * El catálogo fuente mezcla dos presentaciones del mismo producto: el calco
 * fotografiado sobre el gris parejo del estudio (venían como .jpg) y el calco
 * recortado con fondo transparente (venían como .png). En la grilla de
 * categorías la segunda queda flotando sobre el fondo oscuro y el borde blanco
 * del troquel se pierde: dos cards vecinas no parecen del mismo catálogo.
 *
 * No se puede mirar la extensión original: import-catalogo-completo.mjs
 * convierte todo a .webp y renumera 1..N, y los archivos de iCloud son
 * dataless (volver a bajarlos es lo caro del pipeline). Así que la elegibilidad
 * se detecta POR PÍXELES sobre el .webp ya publicado y se deja escrita acá.
 *
 * Salida: frontend/public/data/portadas.json → { "<slug>": [n, n, …] }
 * Las categorías sin ningún diseño elegible NO aparecen en el objeto: el
 * frontend no tiene que distinguir "no hay dato" de "no hay ninguno", en los dos
 * casos elige entre todos (ver lib/portadas.js).
 *
 * ⚠️ Se commitea. El build de Netlify no corre estos scripts, igual que con
 * catalog.json y duplicados.json.
 *
 * Correr DESPUÉS de import-catalogo-completo.mjs y build-catalog.mjs. Si se
 * reemplaza el catálogo y no se vuelve a correr, los índices quedan apuntando a
 * otros dibujos: hay un test de coherencia en lib/portadas.test.js que lo caza
 * y corta el deploy.
 *
 * Uso:
 *   node scripts/build-portadas.mjs [--jobs 10]
 *
 * Requiere `magick` (brew install imagemagick).
 */
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { PORTADA_BG } from '../frontend/src/lib/portadas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'frontend', 'public');
const STICKERS = join(ROOT, 'stickers');
const SALIDA = join(ROOT, 'data', 'portadas.json');

const argJobs = process.argv.indexOf('--jobs');
const JOBS = argJobs > -1 ? Number(process.argv[argJobs + 1]) : 10;

/** Lado al que se reduce la imagen para medir. Alcanza de sobra para el borde. */
const LADO = 64;

/** El gris que buscamos, en RGB. Sale del mismo módulo que pinta la card. */
const GRIS = [1, 3, 5].map((i) => parseInt(PORTADA_BG.slice(i, i + 2), 16));

/**
 * Umbrales de "esto tiene fondo claro y parejo". Están flojos a propósito
 * alrededor del gris del catálogo: la conversión a webp con pérdida mueve un
 * poco el valor, y hay diseños servidos sobre blanco puro que se ven igual.
 */
const ALFA_MIN = 250; // un solo píxel transparente en el borde ya delata el recorte
const DESVIO_MAX = 3; // desvío estándar por canal: descarta dibujo pegado al borde
const CROMA_MAX = 6; // max(r,g,b) − min(r,g,b): descarta fondos de color
const CLARO_MIN = Math.min(...GRIS) - 25; // descarta fondos oscuros uniformes

/**
 * Cuánto puede alejarse del gris del catálogo para seguir contando como ESE
 * gris. Un fondo liso pero blanco puro (255) también existe en el catálogo, y
 * sobre el recuadro de la card se le ve el cuadrado: sirve de reserva, no de
 * primera opción.
 */
const TOLERANCIA_GRIS = 4;

if (!existsSync(STICKERS)) {
  console.error('No existe', STICKERS, '— corré primero scripts/import-catalogo-completo.mjs');
  process.exit(1);
}

const tareas = [];
for (const slug of readdirSync(STICKERS)
  .filter((d) => statSync(join(STICKERS, d)).isDirectory())
  .sort()) {
  for (const f of readdirSync(join(STICKERS, slug)).filter((f) => /\.webp$/i.test(f))) {
    tareas.push({ slug, n: parseInt(f, 10), path: join(STICKERS, slug, f) });
  }
}

/** Un solo proceso de magick por imagen: el volcado de píxeles en texto. */
function medir(tarea) {
  return new Promise((resolve) => {
    const p = spawn('magick', [tarea.path, '-resize', `${LADO}x${LADO}!`, '-depth', '8', 'txt:-']);
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('error', () => resolve(null));
    p.on('close', (code) => resolve(code === 0 ? analizar(out) : null));
  });
}

/**
 * Mira SOLO el anillo de borde (las cuatro filas/columnas exteriores). El
 * centro no importa: lo que distingue una foto sobre gris de un recorte es qué
 * hay alrededor del dibujo.
 */
function analizar(txt) {
  const lineas = txt.split('\n');
  const conAlfa = /srgba/.test(lineas[0] || '');
  const px = new Map();
  for (const l of lineas) {
    const m = l.match(/^(\d+),(\d+):\s+\(([\d,\s]+)\)/);
    if (m) px.set(`${m[1]},${m[2]}`, m[3].split(',').map((v) => Number(v.trim())));
  }

  const anillo = [];
  for (let i = 0; i < LADO; i++) {
    for (const k of [`${i},0`, `${i},${LADO - 1}`, `0,${i}`, `${LADO - 1},${i}`]) {
      const p = px.get(k);
      if (p) anillo.push(p);
    }
  }
  if (!anillo.length) return null;

  const alfaMin = conAlfa ? Math.min(...anillo.map((p) => p[3])) : 255;
  const medias = [0, 1, 2].map((c) => anillo.reduce((a, p) => a + p[c], 0) / anillo.length);
  const desvio = Math.max(
    ...[0, 1, 2].map((c) =>
      Math.sqrt(anillo.reduce((a, p) => a + (p[c] - medias[c]) ** 2, 0) / anillo.length)
    )
  );

  const croma = Math.max(...medias) - Math.min(...medias);
  const claro = medias.reduce((a, v) => a + v, 0) / 3;

  const liso = alfaMin >= ALFA_MIN && desvio <= DESVIO_MAX && croma <= CROMA_MAX && claro >= CLARO_MIN;
  if (!liso) return null;

  // Dos niveles: el gris exacto del catálogo y, más abajo, cualquier fondo liso
  // y claro. Se prefiere el primero y solo se cae al segundo si la categoría no
  // tiene ni uno.
  const objetivo = GRIS.reduce((a, v) => a + v, 0) / 3;
  return Math.abs(claro - objetivo) <= TOLERANCIA_GRIS ? 'gris' : 'liso';
}

const gris = {};
const liso = {};
let hechas = 0;
let i = 0;

await Promise.all(
  Array.from({ length: JOBS }, async () => {
    while (i < tareas.length) {
      const t = tareas[i++];
      const clase = await medir(t);
      if (clase === 'gris') (gris[t.slug] ||= []).push(t.n);
      else if (clase === 'liso') (liso[t.slug] ||= []).push(t.n);
      if (++hechas % 500 === 0) process.stderr.write(`  ${hechas}/${tareas.length}\n`);
    }
  })
);

// Orden numérico: el JSON tiene que ser estable entre corridas o el diff de git
// cambia sin que haya cambiado nada.
const elegibles = {};
for (const slug of new Set([...Object.keys(gris), ...Object.keys(liso)])) {
  elegibles[slug] = gris[slug]?.length ? gris[slug] : liso[slug];
}

const salida = {};
for (const slug of Object.keys(elegibles).sort()) salida[slug] = elegibles[slug].sort((a, b) => a - b);

writeFileSync(SALIDA, JSON.stringify(salida));

const conPortada = Object.keys(salida).length;
const totalCats = new Set(tareas.map((t) => t.slug)).size;
const totalElegibles = Object.values(salida).reduce((a, l) => a + l.length, 0);

console.log(`\nportadas.json → ${totalElegibles} de ${tareas.length} diseños elegibles`);
console.log(`${conPortada} de ${totalCats} categorías con fondo liso propio`);

const deReserva = Object.keys(salida).filter((s) => !gris[s]?.length);
if (deReserva.length) {
  console.log(`\nSin el gris exacto, van con fondo liso claro: ${deReserva.join(', ')}`);
}

const sinNinguna = [...new Set(tareas.map((t) => t.slug))].filter((s) => !salida[s]);
if (sinNinguna.length) {
  console.log(`\nSin ningún diseño con fondo gris (la card se los pone): ${sinNinguna.join(', ')}`);
}
