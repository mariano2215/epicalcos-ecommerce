/**
 * Lo que `/personalizados` le entrega a un buscador ANTES de correr JavaScript
 * (spec 023, RF-S1…S7): el JSON-LD y el contenido estático que va dentro de
 * `#root` en `dist/personalizados.html`. Lo usan el prerender del build y la
 * página React (el JSON-LD es el mismo en los dos lados).
 *
 * ⚠️ TODO SALE DE `config/personalizadosLanding.js`, el mismo módulo que lee la
 * página: el HTML que lee Google y la página que ve el cliente no pueden decir
 * cosas distintas. Si se agrega una sección a la página, se agrega acá también
 * (y si no tiene fotos reales, no va en ninguno de los dos).
 *
 * ⚠️ Corre en Node (lo importa `scripts/prerender.mjs`): sin React, `window` ni
 * `import.meta.env`. Por eso el breadcrumb se arma acá y no con `lib/seo.js`.
 */
import { site, navLinks, footerLinks } from '../config/site.js';
import { SIZES } from '../config/pricing.js';
import { META_LINE_SKU } from '../config/metaCatalog.js';
import { TAMANOS } from '../config/personalizados.js';
import { TESTIMONIALS } from '../data/testimonials.js';
import { USOS_POR_TAMANO } from './usosPorTamano.js';
import { formatPrice } from './formato.js';
import { esc } from './prerender.js';
import {
  SEO,
  HERO,
  CTA,
  CONFIANZA,
  EDITORIAL,
  BENEFICIOS,
  PROCESO,
  PRECIOS,
  FAQ,
  FAQ_TITULO,
  CTA_FINAL,
  TESTIMONIO,
  NEGOCIO_COPY
} from '../config/personalizadosLanding.js';

export const RUTA = '/personalizados';
const abs = (p) => (String(p).startsWith('http') ? p : `${site.url}${p}`);

/** `@graph` con Product + BreadcrumbList + FAQPage. Sin `AggregateRating` ni `Review`: no hay reseñas verificables. */
export function jsonLdPersonalizados() {
  const precios = SIZES.map((s) => s.price);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: SEO.h1,
        description: SEO.description,
        image: [abs(SEO.imagenProducto)],
        sku: META_LINE_SKU.personalizados,
        brand: { '@type': 'Brand', name: site.name },
        category: 'Calcos personalizadas',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'ARS',
          lowPrice: Math.min(...precios),
          highPrice: Math.max(...precios),
          offerCount: SIZES.length,
          availability: 'https://schema.org/InStock',
          url: abs(RUTA),
          seller: { '@type': 'Organization', name: site.name }
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: abs('/') },
          { '@type': 'ListItem', position: 2, name: 'Categorías', item: abs('/categorias') },
          { '@type': 'ListItem', position: 3, name: 'Personalizados', item: abs(RUTA) }
        ]
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
      }
    ]
  };
}

const lista = (items, cls = '') => `<ul class="${cls}">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const h2 = (t) => `<h2 class="font-display font-extrabold text-2xl mt-10">${esc(t)}</h2>`;

/**
 * El contenido estático. Semántico y liviano, con clases que ya existen en el
 * CSS del sitio: se ve un instante hasta que monta React, y eso tiene que
 * parecerse al hero y no a una página rota.
 */
export function cuerpoPersonalizados() {
  const testimonio = TESTIMONIALS.find((t) => t.personalizado);
  const tamanos = TAMANOS.map(
    (t) => `<strong>${esc(t.label)}</strong> — ${esc(formatPrice(t.precio))} por calco · ideal para ${esc(USOS_POR_TAMANO[t.id]?.para.join(', ') || '')}`
  );
  const links = [...navLinks.filter((l) => !l.hash && l.to !== RUTA), ...footerLinks.ayuda];

  return [
    '<div class="page-gradient"><div class="container-app pt-4 pb-16">',
    '<nav aria-label="Breadcrumb" class="mb-6 text-xs text-white/50"><a href="/">Inicio</a> / <a href="/categorias">Categorías</a> / <span class="text-white/80">Personalizados</span></nav>',
    `<p class="font-display font-black text-[2.25rem] sm:text-6xl leading-[0.95] gradient-text">${esc(HERO.claim)}</p>`,
    `<h1 class="font-display font-extrabold text-lg sm:text-2xl leading-tight mt-3">${esc(HERO.h1)}</h1>`,
    `<p class="text-white/80 mt-3 text-base sm:text-lg leading-snug">${esc(HERO.bajada)}</p>`,
    `<p class="text-white/55 mt-2 text-sm">${esc(HERO.texto)}</p>`,
    `<p class="mt-6"><a class="btn-primary" href="${RUTA}">${esc(CTA.subir)}</a></p>`,
    lista(CONFIANZA.map((c) => `${esc(c.valor)} ${esc(c.label)}`), 'mt-8 text-sm text-white/70'),
    testimonio
      ? `${h2(TESTIMONIO.titulo)}<blockquote class="text-white/85 mt-3">“${esc(testimonio.text)}” — ${esc(testimonio.name)} · ${esc(testimonio.label)}</blockquote>`
      : '',
    h2(EDITORIAL.titulo),
    `<p class="text-white/65 mt-2">${esc(EDITORIAL.bajada)}</p>`,
    lista(EDITORIAL.lista.map(esc), 'mt-3 text-sm text-white/80'),
    `<p class="font-display font-black text-3xl mt-6">${esc(EDITORIAL.cierre)}</p>`,
    h2(BENEFICIOS.titulo),
    lista(BENEFICIOS.items.map((b) => `<strong>${esc(b.titulo)}</strong>: ${esc(b.texto)}`), 'mt-3 text-sm text-white/80 space-y-1'),
    h2(PROCESO.titulo),
    `<ol class="mt-3 text-sm text-white/80 space-y-1">${PROCESO.pasos.map((p) => `<li><strong>${esc(p.titulo)}</strong>: ${esc(p.texto)}</li>`).join('')}</ol>`,
    h2(PRECIOS.titulo),
    `<p class="text-white/65 mt-2">${esc(PRECIOS.bajada)}</p>`,
    lista(tamanos, 'mt-3 text-sm text-white/80 space-y-1'),
    `<p class="text-sm text-white/70 mt-4"><strong>${esc(NEGOCIO_COPY.titulo)}</strong> ${esc(NEGOCIO_COPY.texto)} <a href="${NEGOCIO_COPY.to}">${esc(NEGOCIO_COPY.link)}</a></p>`,
    h2(FAQ_TITULO),
    `<dl class="mt-3 text-sm space-y-3">${FAQ.map((f) => `<dt class="font-semibold">${esc(f.q)}</dt><dd class="text-white/70">${esc(f.a)}</dd>`).join('')}</dl>`,
    h2(CTA_FINAL.titulo),
    `<p class="text-white/70 mt-2">${esc(CTA_FINAL.bajada)} ${esc(CTA_FINAL.nota)}</p>`,
    `<nav aria-label="Más de EPICALCOS" class="mt-10 text-sm text-white/60">${lista(
      links.map((l) => `<a href="${esc(l.to)}">${esc(l.label)}</a>`),
      'flex flex-wrap gap-4'
    )}</nav>`,
    '</div></div>'
  ].join('');
}
