import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prerenderRuta, esc } from './prerender.js';
import { jsonLdPersonalizados, cuerpoPersonalizados, RUTA } from './personalizadosEstatico.js';
import { SEO, FAQ, CLAIM } from '../config/personalizadosLanding.js';
import { SIZES } from '../config/pricing.js';
import { site } from '../config/site.js';

// El index.html del repo es la misma plantilla que Vite deja en dist/ (con otros <script>).
const INDEX = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'index.html'), 'utf8');

const generar = () =>
  prerenderRuta(INDEX, {
    title: `${SEO.title} | ${site.name}`,
    description: SEO.description,
    canonical: `${site.url}${RUTA}`,
    image: `${site.url}${SEO.imagen}`,
    jsonLd: jsonLdPersonalizados(),
    cuerpo: cuerpoPersonalizados(),
    modulepreload: '/assets/Personalizados-abc123.js'
  });

const HTML = generar();
const jsonLd = () => JSON.parse(HTML.match(/<script type="application\/ld\+json" data-seo-jsonld="page">([\s\S]*?)<\/script>/)[1]);

describe('HTML propio de /personalizados (RF-S1…S7)', () => {
  it('título, descripción y canonical propios — ya no los del Home', () => {
    expect(HTML).toContain('<title>Stickers y Calcos Personalizados con tu Diseño | EPICALCOS</title>');
    expect(HTML).toContain(`<meta name="description" content="${esc(SEO.description)}" />`);
    expect(HTML).toContain('<link rel="canonical" href="https://epicalcos.com/personalizados" />');
    expect(HTML).not.toContain('<link rel="canonical" href="https://epicalcos.com/" />');
    expect(HTML).not.toContain('EPICALCOS · Calcos premium para personalizar lo que quieras</title>');
    expect(HTML.match(/<title>/g)).toHaveLength(1);
    expect(HTML.match(/rel="canonical"/g)).toHaveLength(1);
  });

  it('Open Graph y Twitter de la página, con la imagen real', () => {
    expect(HTML).toContain('<meta property="og:url" content="https://epicalcos.com/personalizados" />');
    expect(HTML).toContain('<meta property="og:image" content="https://epicalcos.com/meta/personalizados.jpg" />');
    expect(HTML).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(HTML.match(/property="og:title"/g)).toHaveLength(1);
  });

  it('un solo H1, y el contenido principal está en el HTML sin JavaScript', () => {
    expect(HTML.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(HTML).toContain(`>${esc(SEO.h1)}</h1>`);
    expect(HTML).toContain(CLAIM);
    for (const s of SIZES) expect(HTML).toContain(s.label);
    for (const f of FAQ) expect(HTML).toContain(esc(f.q));
    expect(HTML).toContain('href="/categorias"');
    expect(HTML).toContain('href="/negocio"');
  });

  it('JSON-LD: Product con AggregateOffer de SIZES, BreadcrumbList y FAQPage; sin ratings', () => {
    const g = jsonLd()['@graph'];
    const producto = g.find((x) => x['@type'] === 'Product');
    expect(producto.offers).toMatchObject({
      '@type': 'AggregateOffer',
      priceCurrency: 'ARS',
      lowPrice: Math.min(...SIZES.map((s) => s.price)),
      highPrice: Math.max(...SIZES.map((s) => s.price)),
      availability: 'https://schema.org/InStock'
    });
    expect(producto.image[0]).toBe('https://epicalcos.com/testimonials/logo-1.webp');
    expect(g.find((x) => x['@type'] === 'BreadcrumbList').itemListElement).toHaveLength(3);
    expect(g.find((x) => x['@type'] === 'FAQPage').mainEntity).toHaveLength(FAQ.length);
    expect(HTML).not.toMatch(/AggregateRating|"Review"/);
  });

  it('el JSON-LD lleva la marca que usa `useSeo` para reemplazarlo (y no duplicarlo)', () => {
    expect(HTML.match(/data-seo-jsonld="page"/g)).toHaveLength(1);
  });

  it('precarga el chunk de la ruta', () => {
    expect(HTML).toContain('<link rel="modulepreload" crossorigin href="/assets/Personalizados-abc123.js" />');
  });

  it('el contenido va dentro de #root y el resto del body queda igual', () => {
    expect(HTML).toMatch(/<div id="root"><div class="page-gradient">[\s\S]+<\/div><\/div>\s*<script type="module"/);
    expect(HTML).toContain('<script type="module" src="/src/main.jsx"></script>');
  });

  it('no dice nada de lo que no se dice (RF-L18)', () => {
    const texto = HTML.replace(/<script[\s\S]*?<\/script>/g, '');
    expect(texto).not.toMatch(/boceto|prueba de impresi|pr[oó]ximamente|perfect/i);
  });

  it('es idempotente: aplicarlo dos veces da lo mismo', () => {
    const otra = prerenderRuta(HTML, {
      title: `${SEO.title} | ${site.name}`,
      description: SEO.description,
      canonical: `${site.url}${RUTA}`,
      image: `${site.url}${SEO.imagen}`,
      jsonLd: jsonLdPersonalizados(),
      cuerpo: cuerpoPersonalizados(),
      modulepreload: '/assets/Personalizados-abc123.js'
    });
    expect(otra).toBe(HTML);
  });

  it('un string con < en el JSON-LD no puede cerrar el <script>', () => {
    const html = prerenderRuta(INDEX, { title: 't', description: 'd', canonical: 'c', jsonLd: { x: '</script><b>' } });
    expect(html).not.toContain('</script><b>');
  });
});
