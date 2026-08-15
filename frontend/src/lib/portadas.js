// src/lib/portadas.js
// Qué diseño muestra la card de cada categoría.
//
// La fórmula vivía adentro de CategoryCard, pero la grilla de /categorías
// necesita mirar TODAS las portadas juntas: la única forma de garantizar que
// dos categorías no muestren el mismo dibujo es resolverlas en conjunto, no
// card por card.

/**
 * Diseño que le toca a una categoría dentro de su propia carpeta.
 * `rotation` corre el índice: misma categoría + misma rotación → misma imagen.
 *
 * @param {string} slug
 * @param {number} count      cuántos diseños tiene la categoría
 * @param {number} rotation
 * @param {string} [cover]    portada de /data/catalog.json, fallback
 */
export function portadaDe(slug, count, rotation = 0, cover) {
  if (!count || count <= 1 || !slug) return cover;
  const hash = [...slug].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const n = ((hash + rotation) % count) + 1;
  return `/stickers/${slug}/${n}.webp`;
}

/**
 * Identidad visual de un archivo. Dos categorías pueden tener el MISMO dibujo
 * en carpetas distintas (Disney y TV - Disney, Memes y TV - Bob Esponja…): son
 * archivos distintos con el mismo contenido. `duplicados` —generado por
 * scripts/build-duplicados.mjs— los colapsa en uno solo para poder detectarlo.
 */
const huella = (url, duplicados) => (url ? duplicados[url] || url : url);

/**
 * Rotación por categoría de forma que ninguna repita el diseño de otra.
 *
 * Empieza por `semilla` (la misma para todas: cambia en cada visita) y a la que
 * choca le corre la rotación hasta encontrar un diseño libre. Con una categoría
 * de N diseños prueba como mucho N veces: si todos están tomados se queda con
 * el último — mostrar algo repetido es mejor que no mostrar nada.
 *
 * @param {Array}  categorias  [{ slug }] en el orden en que se van a renderizar
 * @param {Object} counts      { [slug]: { count, cover } }
 * @param {number} semilla
 * @param {Object} duplicados  { [urlDuplicada]: urlCanónica }
 * @returns {Object} { [slug]: rotation }
 */
export function rotacionesSinRepetir(categorias, counts, semilla = 0, duplicados = {}) {
  const usadas = new Set();
  const out = {};

  for (const cat of categorias) {
    const total = counts[cat.slug]?.count || 0;
    const cover = counts[cat.slug]?.cover;
    let rot = semilla;

    // Las categorías de 1 diseño (o sin catálogo) no tienen de dónde elegir.
    if (total > 1) {
      for (let intento = 0; intento < total; intento++) {
        const id = huella(portadaDe(cat.slug, total, semilla + intento, cover), duplicados);
        if (!usadas.has(id)) {
          rot = semilla + intento;
          usadas.add(id);
          break;
        }
        rot = semilla + intento;
      }
    } else {
      usadas.add(huella(cover, duplicados));
    }

    out[cat.slug] = rot;
  }

  return out;
}
