#!/usr/bin/env node
/**
 * prerender.mjs — HTML propio para las rutas que lo necesitan:
 * /personalizados (spec 023, D-7/D-8/D-9), /negocio y /mayorista (spec 031
 * Fase 4, spec 034).
 *
 * Corre en el `postbuild` de frontend/package.json, después de `vite build`:
 * toma `dist/index.html` y escribe `dist/<ruta>.html` con título,
 * descripción, canonical, Open Graph, JSON-LD y el contenido estático de la
 * página. Netlify sirve el archivo en `/<ruta>` (un archivo que existe le gana
 * al fallback del SPA), así que un buscador lee la página sin correr
 * JavaScript.
 *
 * POR QUÉ `<ruta>.html` Y NO `<ruta>/index.html` (D-8): con una carpeta,
 * Netlify puede normalizar `/personalizados` → `/personalizados/` con un 301 y
 * contradecir el canonical sin barra. Se verifica con `curl` después de cada
 * deploy que toque esto.
 *
 * ⚠️ NUNCA CORTA EL BUILD (D-9): si una ruta falla, se copia `index.html` tal
 * cual para ESA ruta y se avisa — queda como estaba antes de su spec. Un
 * problema de SEO no puede frenar el deploy de un arreglo de ventas. Lo que sí
 * frena son los tests de los builders (`src/lib/prerender.test.js`,
 * `src/lib/negociosEstatico.test.js`), que corren antes del build.
 *
 * Si una sección está oculta (`HIDDEN_SECTIONS`), NO se genera nada: el
 * archivo le ganaría a la redirección del SPA y la página "apagada" seguiría
 * viva.
 */
import { readFileSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'frontend', 'dist');
const INDEX = join(DIST, 'index.html');

/**
 * Cada ruta carga sus propios módulos ADENTRO de `datos()`: un error al
 * importar también cae en el catch de esa ruta y no tumba a las demás.
 */
const RUTAS = [
  {
    seccion: 'personalizados',
    archivo: 'personalizados.html',
    chunk: /^Personalizados-[\w-]+\.js$/,
    async datos(site) {
      const { RUTA, jsonLdPersonalizados, cuerpoPersonalizados } = await import('../frontend/src/lib/personalizadosEstatico.js');
      const { SEO } = await import('../frontend/src/config/personalizadosLanding.js');
      return {
        title: `${SEO.title} | ${site.name}`,
        description: SEO.description,
        canonical: `${site.url}${RUTA}`,
        image: `${site.url}${SEO.imagen}`,
        jsonLd: jsonLdPersonalizados(),
        cuerpo: cuerpoPersonalizados()
      };
    }
  },
  {
    seccion: 'negocio',
    archivo: 'negocio.html',
    chunk: /^Negocio-[\w-]+\.js$/,
    async datos(site) {
      const { RUTA_NEGOCIO, jsonLdNegocio, cuerpoNegocio } = await import('../frontend/src/lib/negociosEstatico.js');
      const { SEO } = await import('../frontend/src/config/negocios.js');
      const { FOTO_HERO } = await import('../frontend/src/data/negociosFotos.js');
      return {
        title: `${SEO.negocio.title} | ${site.name}`,
        description: SEO.negocio.description,
        canonical: `${site.url}${RUTA_NEGOCIO}`,
        image: `${site.url}${FOTO_HERO.src}`,
        jsonLd: jsonLdNegocio(),
        cuerpo: cuerpoNegocio()
      };
    }
  },
  {
    seccion: 'mayorista',
    archivo: 'mayorista.html',
    chunk: /^Mayorista-[\w-]+\.js$/,
    async datos(site) {
      const { RUTA_MAYORISTA, jsonLdMayorista, cuerpoMayorista } = await import('../frontend/src/lib/negociosEstatico.js');
      const { SEO } = await import('../frontend/src/config/negocios.js');
      return {
        title: `${SEO.mayorista.title} | ${site.name}`,
        description: SEO.mayorista.description,
        canonical: `${site.url}${RUTA_MAYORISTA}`,
        jsonLd: jsonLdMayorista(),
        cuerpo: cuerpoMayorista()
      };
    }
  }
];

async function main() {
  const indexHtml = readFileSync(INDEX, 'utf8');
  let assets = [];
  try {
    assets = readdirSync(join(DIST, 'assets'));
  } catch {
    /* sin assets no hay modulepreload; el resto sale igual */
  }

  for (const ruta of RUTAS) {
    const salida = join(DIST, ruta.archivo);
    try {
      const { site, isSectionHidden } = await import('../frontend/src/config/site.js');
      if (isSectionHidden(ruta.seccion)) {
        console.log(`[prerender] /${ruta.seccion} está oculta (HIDDEN_SECTIONS): no se genera nada.`);
        continue;
      }
      const { prerenderRuta } = await import('../frontend/src/lib/prerender.js');
      const chunk = assets.find((f) => ruta.chunk.test(f));
      const html = prerenderRuta(indexHtml, { ...(await ruta.datos(site)), modulepreload: chunk ? `/assets/${chunk}` : null });
      writeFileSync(salida, html);
      console.log(
        `[prerender] ✓ dist/${ruta.archivo} (${(html.length / 1024).toFixed(1)} kB)` +
          (chunk ? '' : ` — sin modulepreload: no se encontró el chunk ${ruta.chunk}`)
      );
    } catch (err) {
      console.warn(`[prerender] ⚠️ /${ruta.seccion} falló; se publica como antes de su spec:`, err?.message || err);
      try {
        copyFileSync(INDEX, salida);
      } catch {
        /* sin archivo: el fallback del SPA sirve index.html igual */
      }
    }
  }
}

main();
