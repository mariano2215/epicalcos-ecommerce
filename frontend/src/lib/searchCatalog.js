// src/lib/searchCatalog.js
// EPICALCOS — motor de búsqueda del catálogo.
// Reemplaza el filtro `name.includes(q) || slug.includes(q)` de src/pages/Categorias.jsx
//
// Qué resuelve:
//  1. Normaliza acentos  -> "fútbol" y "futbol" dan el mismo resultado
//  2. Diccionario de alias -> "goku" encuentra Dragon Ball, "gato" encuentra Gatitos
//  3. Ruteo por intención  -> "logo" / "mayorista" van a la página, no a la grilla
//  4. Ranking por relevancia + tamaño de categoría (no alfabético)
//  5. Sugerencias para el estado vacío (nunca dejar al usuario sin salida)

/** Normaliza: minúsculas, sin diacríticos, espacios colapsados. */
export function norm(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const SCORE = {
  EXACT_NAME: 100, // el usuario escribió el nombre exacto de la categoría
  EXACT_ALIAS: 90, // el usuario escribió un alias exacto ("goku")
  PARTIAL_NAME: 60, // substring del nombre o slug
  PARTIAL_ALIAS: 45, // substring de un alias
};

/**
 * @param {string} query        lo que escribió el usuario
 * @param {Array}  categories   [{ slug, name, emoji }]  (constante CATEGORIES del proyecto)
 * @param {Object} counts       { [slug]: { count, cover } }  (de /data/catalog.json)
 * @param {Object} aliases      contenido de /data/aliases.json
 * @returns {{ kind:'all'|'route'|'results'|'empty', route?:string, results:Array, suggestions:Array }}
 */
export function searchCatalog(query, categories, counts, aliases) {
  const q = norm(query);
  const available = categories.filter((c) => counts[c.slug]);

  // Sin query: catálogo completo, ordenado por tamaño (las gordas primero).
  if (!q) {
    return {
      kind: 'all',
      results: [...available].sort(
        (a, b) => (counts[b.slug]?.count || 0) - (counts[a.slug]?.count || 0)
      ),
      suggestions: [],
    };
  }

  // 1) Intención comercial: "logo", "personalizado", "mayorista", "tatuaje"...
  //    Se chequea PRIMERO: son las consultas de mayor margen.
  const routes = aliases?.rutas || {};
  for (const [route, terms] of Object.entries(routes)) {
    for (const raw of terms) {
      const t = norm(raw);
      if (q === t || (q.length >= 4 && t.includes(q)) || (t.length >= 4 && q.includes(t))) {
        return { kind: 'route', route, results: [], suggestions: [] };
      }
    }
  }

  // 2) Match sobre nombre + slug + alias
  const catAliases = aliases?.categorias || {};
  const scored = [];

  for (const cat of available) {
    const n = norm(cat.name);
    const s = norm(cat.slug);
    let score = 0;

    if (q === n || q === s) score = SCORE.EXACT_NAME;
    else if (n.includes(q) || s.includes(q)) score = SCORE.PARTIAL_NAME;

    if (score < SCORE.EXACT_ALIAS) {
      for (const raw of catAliases[cat.slug] || []) {
        const t = norm(raw);
        if (q === t) { score = Math.max(score, SCORE.EXACT_ALIAS); break; }
        if (q.length >= 3 && (t.includes(q) || q.includes(t))) {
          score = Math.max(score, SCORE.PARTIAL_ALIAS);
        }
      }
    }

    if (score > 0) scored.push({ ...cat, _score: score, _count: counts[cat.slug]?.count || 0 });
  }

  // Ranking: relevancia, y a igual relevancia la categoría con más diseños.
  scored.sort((a, b) => b._score - a._score || b._count - a._count);

  if (scored.length > 0) {
    return { kind: 'results', results: scored, suggestions: [] };
  }

  // 3) Sin resultados -> NUNCA callejón sin salida.
  //    Devolvemos las categorías más grandes como sugerencia + el término
  //    para precargar el CTA de personalizados y el link de WhatsApp.
  const suggestions = [...available]
    .sort((a, b) => (counts[b.slug]?.count || 0) - (counts[a.slug]?.count || 0))
    .slice(0, 6);

  return { kind: 'empty', results: [], suggestions };
}

/**
 * Autocomplete para el buscador del hero.
 * Devuelve hasta `limit` sugerencias mientras el usuario tipea.
 */
export function suggest(query, categories, counts, aliases, limit = 6) {
  const q = norm(query);
  if (q.length < 2) return [];

  const out = searchCatalog(query, categories, counts, aliases);

  if (out.kind === 'route') {
    const labels = {
      '/personalizados': '✏️ Armá tu calco personalizado',
      '/mayorista': '📦 Pack Mayorista x100 · 50% off',
      '/negocio': '🏪 Calcos para tu negocio',
      '/tatuajes': '💉 Tatuajes temporales',
      '/polaroid': '📸 Fotos Polaroid',
      '/contacto': '💬 Hablanos por WhatsApp',
      '/politicas/envios': '🚚 Envíos y tiempos de entrega',
      '/politicas/cambios': '🔄 Cambios y devoluciones',
    };
    return [{ type: 'route', to: out.route, label: labels[out.route] || out.route }];
  }

  return out.results.slice(0, limit).map((c) => ({
    type: 'category',
    to: `/categoria/${c.slug}`,
    label: `${c.emoji || ''} ${c.name}`.trim(),
    count: counts[c.slug]?.count || 0,
  }));
}
