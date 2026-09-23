/**
 * HTML propio para una ruta del SPA, generado en el build (spec 023, D-7).
 * Función PURA: string de `index.html` adentro, string de la ruta afuera.
 *
 * POR QUÉ EXISTE: `index.html` es el fallback de TODAS las rutas del sitio, y
 * trae el título, la descripción y el `<link rel="canonical">` del Home. Pedida
 * por URL, `/personalizados` le llegaba a un buscador como un duplicado del Home
 * sin H1 y sin una sola palabra propia; todo lo suyo aparecía recién al correr
 * el JavaScript (verificado con `curl` el 14/9/2026).
 *
 * Qué hace: reemplaza título, descripción, canonical, Open Graph y Twitter;
 * agrega el JSON-LD (marcado `data-seo-jsonld="page"`, así `useSeo` lo pisa en
 * vez de duplicarlo cuando monta React); agrega un `modulepreload` del chunk de
 * la ruta (acorta el "Cargando…" entre el HTML estático y la página), y mete el
 * contenido estático dentro de `#root`, que `createRoot().render()` reemplaza
 * al montar.
 *
 * Genérica a propósito: el mismo defecto lo tienen todas las rutas del sitio y
 * quedó propuesto como spec aparte (design.md §12 de la spec 023).
 *
 * ⚠️ Corre en Node desde `scripts/prerender.mjs`: sin `window` ni imports de React.
 */

/** Escapa texto para HTML (contenido y atributos). */
export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** JSON dentro de un <script>: `<` escapado para que ningún string pueda cerrar la etiqueta. */
const jsonEnScript = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

function meta(html, selector, etiqueta) {
  const re = new RegExp(`<meta\\s+${selector}[^>]*>`, 'i');
  return re.test(html) ? html.replace(re, etiqueta) : html.replace('</head>', `    ${etiqueta}\n  </head>`);
}

/**
 * @param {string} indexHtml el `dist/index.html` que genera Vite
 * @param {{ title: string, description: string, canonical: string, image?: string,
 *           jsonLd?: object, cuerpo?: string, modulepreload?: string|null }} ruta
 */
export function prerenderRuta(indexHtml, { title, description, canonical, image, jsonLd, cuerpo = '', modulepreload = null }) {
  let html = String(indexHtml);

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = meta(html, 'name="description"', `<meta name="description" content="${esc(description)}" />`);
  html = html.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${esc(canonical)}" />`);
  if (!/rel="canonical"/i.test(html)) html = html.replace('</head>', `    <link rel="canonical" href="${esc(canonical)}" />\n  </head>`);

  html = meta(html, 'property="og:title"', `<meta property="og:title" content="${esc(title)}" />`);
  html = meta(html, 'property="og:description"', `<meta property="og:description" content="${esc(description)}" />`);
  html = meta(html, 'property="og:url"', `<meta property="og:url" content="${esc(canonical)}" />`);
  html = meta(html, 'name="twitter:title"', `<meta name="twitter:title" content="${esc(title)}" />`);
  html = meta(html, 'name="twitter:description"', `<meta name="twitter:description" content="${esc(description)}" />`);
  if (image) {
    html = meta(html, 'property="og:image"', `<meta property="og:image" content="${esc(image)}" />`);
    html = meta(html, 'name="twitter:image"', `<meta name="twitter:image" content="${esc(image)}" />`);
    html = meta(html, 'name="twitter:card"', `<meta name="twitter:card" content="summary_large_image" />`);
  }

  // Idempotente: si ya había un JSON-LD de página o el mismo preload, se reemplazan.
  html = html.replace(/\s*<script type="application\/ld\+json" data-seo-jsonld="page">[\s\S]*?<\/script>/g, '');
  if (jsonLd) {
    html = html.replace(
      '</head>',
      `    <script type="application/ld+json" data-seo-jsonld="page">${jsonEnScript(jsonLd)}</script>\n  </head>`
    );
  }
  if (modulepreload) {
    const tag = `<link rel="modulepreload" crossorigin href="${esc(modulepreload)}" />`;
    // Se saca (con su sangría) y se vuelve a poner: así queda siempre después del JSON-LD.
    const previo = new RegExp(`\\s*${tag.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`, 'g');
    html = html.replace(previo, '');
    html = html.replace('</head>', `    ${tag}\n  </head>`);
  }

  html = html.replace(/<div id="root">[\s\S]*?<\/div>(?=\s*<\/body>|\s*<script)/i, `<div id="root">${cuerpo}</div>`);
  return html;
}
