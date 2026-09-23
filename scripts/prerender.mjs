#!/usr/bin/env node
/**
 * prerender.mjs — HTML propio para /personalizados (spec 023, D-7/D-8/D-9).
 *
 * Corre en el `postbuild` de frontend/package.json, después de `vite build`:
 * toma `dist/index.html` y escribe `dist/personalizados.html` con título,
 * descripción, canonical, Open Graph, JSON-LD y el contenido estático de la
 * página. Netlify sirve el archivo en `/personalizados` (un archivo que existe
 * le gana al fallback del SPA), así que un buscador lee la página sin correr
 * JavaScript.
 *
 * POR QUÉ `personalizados.html` Y NO `personalizados/index.html` (D-8): con una
 * carpeta, Netlify puede normalizar `/personalizados` → `/personalizados/` con un
 * 301 y contradecir el canonical sin barra. Se verifica con `curl` después de
 * cada deploy que toque esto.
 *
 * ⚠️ NUNCA CORTA EL BUILD (D-9): si algo falla, copia `index.html` tal cual y
 * avisa — la página queda como estaba antes de la spec 023. Un problema de SEO no
 * puede frenar el deploy de un arreglo de ventas. Lo que sí frena son los tests
 * del builder (`src/lib/prerender.test.js`), que corren antes del build.
 *
 * Si la sección está oculta (`HIDDEN_SECTIONS`), NO se genera nada: el archivo
 * le ganaría a la redirección del SPA y la página "apagada" seguiría viva.
 */
import { readFileSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'frontend', 'dist');
const INDEX = join(DIST, 'index.html');
const SALIDA = join(DIST, 'personalizados.html');

async function main() {
  const indexHtml = readFileSync(INDEX, 'utf8');
  try {
    // Los imports van ACÁ adentro: un error al cargar un módulo también cae en el catch.
    const { site, isSectionHidden } = await import('../frontend/src/config/site.js');
    if (isSectionHidden('personalizados')) {
      console.log('[prerender] /personalizados está oculta (HIDDEN_SECTIONS): no se genera nada.');
      return;
    }
    const { prerenderRuta } = await import('../frontend/src/lib/prerender.js');
    const { RUTA, jsonLdPersonalizados, cuerpoPersonalizados } = await import('../frontend/src/lib/personalizadosEstatico.js');
    const { SEO } = await import('../frontend/src/config/personalizadosLanding.js');

    const chunk = readdirSync(join(DIST, 'assets')).find((f) => /^Personalizados-[\w-]+\.js$/.test(f));
    const html = prerenderRuta(indexHtml, {
      title: `${SEO.title} | ${site.name}`,
      description: SEO.description,
      canonical: `${site.url}${RUTA}`,
      image: `${site.url}${SEO.imagen}`,
      jsonLd: jsonLdPersonalizados(),
      cuerpo: cuerpoPersonalizados(),
      modulepreload: chunk ? `/assets/${chunk}` : null
    });
    writeFileSync(SALIDA, html);
    console.log(
      `[prerender] ✓ dist/personalizados.html (${(html.length / 1024).toFixed(1)} kB)` +
        (chunk ? '' : ' — sin modulepreload: no se encontró el chunk Personalizados-*.js')
    );
  } catch (err) {
    console.warn('[prerender] ⚠️ falló; /personalizados se publica como antes de la spec 023:', err?.message || err);
    try {
      copyFileSync(INDEX, SALIDA);
    } catch {
      /* sin archivo: el fallback del SPA sirve index.html igual */
    }
  }
}

main();
