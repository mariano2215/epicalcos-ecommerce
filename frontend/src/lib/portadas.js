// src/lib/portadas.js
// Qué diseño muestra la card de cada categoría.
//
// La fórmula vivía adentro de CategoryCard, pero la grilla de /categorías
// necesita mirar TODAS las portadas juntas: la única forma de garantizar que
// dos categorías no muestren el mismo dibujo es resolverlas en conjunto, no
// card por card.
//
// Desde la spec 011 la elección además está FILTRADA: solo entran los diseños
// con fondo gris uniforme (los que en el catálogo fuente eran .jpg). El resto
// son recortes transparentes y sobre la card se veían flotando, con el borde
// blanco del troquel perdiéndose contra el fondo. Qué diseño es cuál lo
// resuelve scripts/build-portadas.mjs y viaja en /data/portadas.json.

/**
 * Gris del catálogo. Los diseños que vienen de un .jpg traen ESTE fondo adentro
 * del archivo; la card pinta el mismo tono en su recuadro, así el borde del
 * cuadrado desaparece y el calco queda flotando sobre gris.
 *
 * Lo importan las dos puntas —`CategoryCard` para pintar y
 * `scripts/build-portadas.mjs` para saber qué buscar— justamente para que no
 * puedan desincronizarse.
 */
export const PORTADA_BG = '#F8F8F8';

/** Mismo slug → mismo número. Es lo que hace que la portada sea determinística. */
const hashDe = (slug) => [...slug].reduce((a, ch) => a + ch.charCodeAt(0), 0);

/**
 * Diseño que le toca a una categoría dentro de su propia carpeta.
 * `rotation` corre el índice: misma categoría + misma rotación → misma imagen.
 *
 * Con `portadas` la elección queda restringida a esa lista: son los diseños con
 * fondo gris uniforme (los que vienen de un .jpg). Sin ella se elige entre
 * todos, que es lo que hacen las 7 categorías que no tienen ninguno.
 *
 * @param {string} slug
 * @param {number} count        cuántos diseños tiene la categoría
 * @param {number} rotation
 * @param {string} [cover]      portada de /data/catalog.json, fallback
 * @param {number[]} [portadas] índices elegibles, de /data/portadas.json
 */
export function portadaDe(slug, count, rotation = 0, cover, portadas) {
  if (!slug) return cover;
  const url = (n) => `/stickers/${slug}/${n}.webp`;

  if (portadas?.length) {
    // Una sola elegible: esa es la portada, rote lo que rote.
    if (portadas.length === 1) return url(portadas[0]);
    return url(portadas[(hashDe(slug) + rotation) % portadas.length]);
  }

  if (!count || count <= 1) return cover;
  return url(((hashDe(slug) + rotation) % count) + 1);
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
 * @param {Object} counts      { [slug]: { count, cover, portadas } }
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
    const portadas = counts[cat.slug]?.portadas;
    // Cuántas opciones tiene realmente para probar. Con lista de portadas son
    // las de la lista: correr la rotación más allá de eso sería dar vueltas
    // sobre las mismas imágenes.
    const opciones = portadas?.length || total;
    let rot = semilla;

    // Las categorías de 1 diseño (o sin catálogo) no tienen de dónde elegir.
    if (opciones > 1) {
      for (let intento = 0; intento < opciones; intento++) {
        const id = huella(
          portadaDe(cat.slug, total, semilla + intento, cover, portadas),
          duplicados
        );
        if (!usadas.has(id)) {
          rot = semilla + intento;
          usadas.add(id);
          break;
        }
        rot = semilla + intento;
      }
    } else {
      usadas.add(huella(portadaDe(cat.slug, total, semilla, cover, portadas), duplicados));
    }

    out[cat.slug] = rot;
  }

  return out;
}
