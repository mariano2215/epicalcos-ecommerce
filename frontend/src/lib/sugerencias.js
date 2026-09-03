// src/lib/sugerencias.js
// Motor de sugerencias de calcos: de qué categorías salen, qué diseño se elige
// y de dónde se bajan los manifests.
//
// POR QUÉ ES UN MÓDULO Y NO VIVE ADENTRO DEL COMPONENTE: hasta ahora todo esto
// estaba dentro de SuggestedStickers.jsx (el upsell de /carrito y /checkout).
// Con el order bump del carrito lateral pasaron a ser DOS los componentes que
// sugieren calcos, y duplicarlo traía dos problemas concretos:
//
//  1. Dos caches de manifests → el mismo /data/anime.json bajado dos veces por
//     visita. En una tienda que vive del tráfico de Instagram en 4G, eso se paga.
//  2. En este repo NO hay tests de componentes (todos los .test.js son de
//     funciones puras de lib/). Lógica adentro de un .jsx es lógica que nadie
//     puede verificar.
//
// Todo lo de acá es puro y determinístico si le pasás `rnd`. El único efecto
// es el fetch de `cargarManifest`, que está aislado al final.

import { CATEGORIES, categoryName } from '../data/categories.js';

/**
 * Categorías de respaldo cuando en el carrito no hay calcos de catálogo (por
 * ejemplo, un carrito que sólo tiene un pack o un personalizado). Son las que
 * mejor funcionan como "algo para sumar": genéricas y de catálogo grande.
 */
export const CATEGORIAS_RESPALDO = [
  'frases',
  'memes',
  'shaka-good-vibes',
  'aesthetic',
  'argentina',
  'anime',
  'flores',
  'gamer'
];

/** Cuántos manifests se traen por vez. */
export const MAX_CATEGORIAS_FUENTE = 4;

const TODOS_LOS_SLUGS = CATEGORIES.map((c) => c.slug);

/**
 * `n` elementos al azar, sin repetir. `rnd` se inyecta para poder testearlo.
 * @param {Array} arr
 * @param {number} n
 * @param {() => number} [rnd]
 */
export function sampleSize(arr, n, rnd = Math.random) {
  const pool = [...arr];
  const out = [];
  while (pool.length && out.length < n) {
    out.push(...pool.splice(Math.floor(rnd() * pool.length), 1));
  }
  return out;
}

/**
 * De qué categorías salen las sugerencias: primero las que el cliente YA tiene
 * en el carrito (sugerir más de lo que ya le gustó convierte mejor que sugerir
 * al azar), y el resto se rellena.
 *
 * El relleno cambia según el caso, a propósito:
 *  - si hay categorías en el carrito → se completa con las de respaldo, que son
 *    genéricas y combinan con cualquier cosa;
 *  - si el carrito no tiene calcos de catálogo → se sortea entre TODAS, porque
 *    no hay ninguna señal sobre el gusto de esa persona y las de respaldo
 *    sesgarían la muestra siempre a las mismas ocho.
 *
 * @param {string[]} categoriasDelCarrito
 * @param {{ max?: number, rnd?: () => number, todos?: string[] }} [opts]
 * @returns {string[]}
 */
export function categoriasFuente(categoriasDelCarrito, opts = {}) {
  const { max = MAX_CATEGORIAS_FUENTE, rnd = Math.random, todos = TODOS_LOS_SLUGS } = opts;
  const base = [...new Set(categoriasDelCarrito.filter(Boolean))];
  const candidatasRelleno = (base.length ? CATEGORIAS_RESPALDO : sampleSize(todos, 12, rnd)).filter(
    (s) => !base.includes(s)
  );
  const relleno = sampleSize(candidatasRelleno, Math.max(0, max - base.length), rnd);
  return [...sampleSize(base, max, rnd), ...relleno];
}

/**
 * Manifest crudo (`{ id, file, sku }`) → forma que consumen las cards.
 *
 * El nombre se arma acá y no en el JSON porque los diseños del catálogo no
 * tienen nombre propio: son archivos numerados. "Anime #12" se compone en
 * runtime, igual que en Category.jsx.
 */
export function mapearManifest(slug, items) {
  const label = categoryName(slug);
  return (Array.isArray(items) ? items : []).map((it) => {
    const num = String(it.id).split('-').pop();
    return {
      id: it.id,
      sku: it.sku,
      image: it.file,
      num,
      name: `${label} #${num}`,
      category: slug,
      categoryLabel: label
    };
  });
}

/**
 * Elige UN diseño de las listas, respetando el orden en que vienen (las
 * categorías del carrito van primero, así que se prefieren) y sin devolver nada
 * que esté en `excluidos`.
 *
 * Devuelve `null` cuando no queda nada para ofrecer — el llamador tiene que
 * esconder la sugerencia en vez de mostrar una card vacía.
 *
 * @param {Array<Array>} listas   una lista de diseños por categoría fuente
 * @param {Set<string>|string[]} excluidos  ids que no se pueden ofrecer
 * @param {() => number} [rnd]
 */
export function elegirUno(listas, excluidos = [], rnd = Math.random) {
  const fuera = excluidos instanceof Set ? excluidos : new Set(excluidos);
  for (const lista of listas || []) {
    const libres = (lista || []).filter((s) => !fuera.has(s.id));
    if (libres.length) return libres[Math.floor(rnd() * libres.length)];
  }
  return null;
}

/**
 * Elige `cantidad` diseños repartidos entre las listas: una vuelta por lista
 * antes de repetir categoría, para que una tanda mezcle y no quede dominada por
 * la categoría con más diseños.
 */
export function elegirVarios(listas, cantidad, excluidos = [], rnd = Math.random) {
  const usados = new Set(excluidos instanceof Set ? [...excluidos] : excluidos);
  const disponibles = (listas || []).filter((l) => l && l.length);
  const elegidos = [];
  for (let vuelta = 0; elegidos.length < cantidad && vuelta < cantidad; vuelta++) {
    for (const lista of disponibles) {
      if (elegidos.length >= cantidad) break;
      const pick = elegirUno([lista], usados, rnd);
      if (!pick) continue;
      usados.add(pick.id);
      elegidos.push(pick);
    }
  }
  return elegidos;
}

// ─── Único efecto del módulo: bajar los manifests ─────────────────────────────

/**
 * Manifests ya bajados. Vive a nivel de módulo (no de componente) para que el
 * upsell del checkout y el order bump del drawer compartan el mismo cache: son
 * los mismos JSON y la visita los baja UNA vez.
 */
const cache = new Map();

/** Baja `/data/{slug}.json` (una sola vez por visita) ya mapeado. Nunca rechaza. */
export function cargarManifest(slug) {
  if (!cache.has(slug)) {
    cache.set(
      slug,
      fetch(`/data/${slug}.json`)
        .then((r) => (r.ok ? r.json() : []))
        .then((items) => mapearManifest(slug, items))
        .catch(() => [])
    );
  }
  return cache.get(slug);
}

/** Sólo para los tests: vacía el cache entre casos. */
export const _resetCache = () => cache.clear();
