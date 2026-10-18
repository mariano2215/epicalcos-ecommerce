import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prerenderRuta, esc } from './prerender.js';
import {
  RUTA_NEGOCIO,
  RUTA_MAYORISTA,
  jsonLdNegocio,
  jsonLdMayorista,
  cuerpoNegocio,
  cuerpoMayorista,
  faqPageJsonLd
} from './negociosEstatico.js';
import { SEO, HERO, MAYORISTA, PREGUNTAS } from '../config/negocios.js';
import { ESCALA_VOLUMEN, NEGOCIO } from '../config/pricing.js';
import { site } from '../config/site.js';
import { formatPrice } from './formato.js';

/**
 * El HTML que Google lee de /negocio y /mayorista sin correr JavaScript (spec
 * 031 Fase 4, spec 034). Hasta acá las dos le llegaban con el título y el
 * canonical del Home.
 */
const INDEX = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'index.html'), 'utf8');

const negocio = prerenderRuta(INDEX, {
  title: `${SEO.negocio.title} | ${site.name}`,
  description: SEO.negocio.description,
  canonical: `${site.url}${RUTA_NEGOCIO}`,
  image: `${site.url}/images/negocio-muestra.webp`,
  jsonLd: jsonLdNegocio(),
  cuerpo: cuerpoNegocio()
});
const mayorista = prerenderRuta(INDEX, {
  title: `${SEO.mayorista.title} | ${site.name}`,
  description: SEO.mayorista.description,
  canonical: `${site.url}${RUTA_MAYORISTA}`,
  jsonLd: jsonLdMayorista(),
  cuerpo: cuerpoMayorista()
});
const ldDe = (html) => JSON.parse(html.match(/<script type="application\/ld\+json" data-seo-jsonld="page">([\s\S]*?)<\/script>/)[1]);
const tipo = (ld, t) => ld['@graph'].find((n) => n['@type'] === t);

describe('/negocio sin JavaScript (031 RF-SEO1…3)', () => {
  it('título, descripción y canonical propios, una sola vez', () => {
    expect(negocio).toContain(`<title>${esc(SEO.negocio.title)} | EPICALCOS</title>`);
    expect(negocio).toContain('<link rel="canonical" href="https://epicalcos.com/negocio" />');
    expect(negocio.match(/<title>/g)).toHaveLength(1);
    expect(negocio.match(/rel="canonical"/g)).toHaveLength(1);
  });

  it('el H1, el precio y el CTA están en el HTML, con los textos de la página', () => {
    expect(negocio).toContain(`${esc(HERO.h1)}</h1>`);
    expect(negocio).toContain(esc(HERO.precio.principal));
    expect(negocio).toContain('href="/negocio#cotizador"');
    expect(negocio.match(/<h1/g)).toHaveLength(1);
  });

  it('la escala sale de la tabla aprobada (nada escrito a mano)', () => {
    expect(negocio).toContain(esc(formatPrice(ESCALA_VOLUMEN['6cm'][250])));
    expect(negocio).toContain(esc(formatPrice(ESCALA_VOLUMEN['6cm'][1000])));
  });

  it('JSON-LD: Product con AggregateOffer de precios reales, migas y FAQPage con las preguntas visibles; sin reseñas', () => {
    const ld = ldDe(negocio);
    const prod = tipo(ld, 'Product');
    expect(prod.offers.lowPrice).toBe(NEGOCIO.price);
    expect(prod.offers.highPrice).toBe(ESCALA_VOLUMEN.holografico[1000]);
    expect(prod.offers.priceCurrency).toBe('ARS');
    expect(tipo(ld, 'BreadcrumbList').itemListElement.at(-1).item).toBe('https://epicalcos.com/negocio');
    expect(tipo(ld, 'FAQPage').mainEntity).toHaveLength(PREGUNTAS.items.length);
    for (const p of PREGUNTAS.items) expect(negocio).toContain(esc(p.q));
    expect(JSON.stringify(ld)).not.toMatch(/AggregateRating|"Review"/);
  });

  it('el FAQPage suelto (Home B2B) es el mismo que va en el @graph', () => {
    expect(faqPageJsonLd().mainEntity).toEqual(tipo(jsonLdNegocio(), 'FAQPage').mainEntity);
  });
});

describe('/mayorista sin JavaScript', () => {
  it('título, canonical y H1 propios', () => {
    expect(mayorista).toContain(`<title>${esc(SEO.mayorista.title)} | EPICALCOS</title>`);
    expect(mayorista).toContain('<link rel="canonical" href="https://epicalcos.com/mayorista" />');
    expect(mayorista).toContain(`${esc(MAYORISTA.h1)}</h1>`);
  });

  it('condiciones a la vista y la oferta sin holográfico (el armador no lo vende)', () => {
    for (const c of MAYORISTA.condiciones) expect(mayorista).toContain(esc(c.t));
    const prod = tipo(ldDe(mayorista), 'Product');
    expect(prod.offers.lowPrice).toBe(ESCALA_VOLUMEN['4cm'][100]);
    expect(prod.offers.highPrice).toBe(ESCALA_VOLUMEN['6cm'][1000]);
  });

  it('ya no habla de una promo "por tiempo limitado" (RF-24)', () => {
    expect(mayorista).not.toMatch(/tiempo limitado|termina en/i);
    expect(cuerpoMayorista()).not.toMatch(/tiempo limitado/i);
  });
});

describe('copy prohibido también en el HTML estático', () => {
  it('ni "archivo perfecto", ni boceto, ni cupones', () => {
    for (const html of [cuerpoNegocio(), cuerpoMayorista()]) {
      expect(html).not.toMatch(/perfect|boceto|EPICA10|EPI50|EMOJI50/i);
    }
  });
});
