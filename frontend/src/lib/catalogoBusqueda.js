/**
 * Los dos manifests que necesita el buscador, bajados UNA sola vez por visita.
 *
 * Antes esto vivía dentro de `Hero.jsx`, en el estado del componente. Con el
 * buscador en tres lugares de la Home (la sección propia, el modal del header y
 * el CTA final) ese estado se habría duplicado tres veces y `catalog.json` se
 * habría bajado tres veces en la misma visita.
 *
 * El cache vive a nivel de MÓDULO, igual que el de `lib/sugerencias.js`: las
 * promesas se comparten, así que dos buscadores montados a la vez disparan un
 * solo fetch.
 *
 * Ninguna de las dos funciones rechaza: si un manifest no baja, el buscador
 * tiene que seguir usable (se puede tipear y enviar; lo único que falta es el
 * autocomplete).
 */

let catalogoPromesa = null;
let aliasesPromesa = null;

/** `{ [slug]: { count, cover } }` de /data/catalog.json. Nunca rechaza. */
export function cargarCatalogo() {
  if (!catalogoPromesa) {
    catalogoPromesa = fetch('/data/catalog.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => {
        const map = {};
        for (const c of lista) map[c.slug] = { count: c.count, cover: c.cover };
        return map;
      })
      .catch(() => ({}));
  }
  return catalogoPromesa;
}

/** Diccionario de alias e intenciones de /data/aliases.json. Nunca rechaza. */
export function cargarAliases() {
  if (!aliasesPromesa) {
    aliasesPromesa = fetch('/data/aliases.json')
      .then((r) => (r.ok ? r.json() : { categorias: {}, rutas: {} }))
      .catch(() => ({ categorias: {}, rutas: {} }));
  }
  return aliasesPromesa;
}

/** Sólo para los tests: vacía el cache entre casos. */
export const _resetCache = () => {
  catalogoPromesa = null;
  aliasesPromesa = null;
};
