/**
 * Lo que `/negocio` y `/mayorista` le entregan a un buscador ANTES de correr
 * JavaScript (spec 031 Fase 4, spec 034): título, descripción, JSON-LD y el
 * contenido estático que va dentro de `#root` en `dist/negocio.html` y
 * `dist/mayorista.html`. Mismo patrón que `personalizadosEstatico.js`.
 *
 * POR QUÉ: `index.html` es el fallback de todas las rutas y trae el título y el
 * canonical del Home. Pedidas por URL, las dos páginas de venta por cantidad le
 * llegaban a Google como un duplicado del Home, sin H1 ni precios (AUDIT H-9
 * de la spec 031).
 *
 * ⚠️ TODO SALE DE `config/negocios.js` y de la escala: la página React y este
 * HTML leen lo mismo. El JSON-LD lo usa también la página (`useSeo`), así que
 * cuando monta React reemplaza al prerenderizado en vez de duplicarlo.
 *
 * ⚠️ Corre en Node (lo importa `scripts/prerender.mjs`): sin React, `window` ni
 * `import.meta.env`.
 */
import { site } from '../config/site.js';
import { META_LINE_SKU } from '../config/metaCatalog.js';
import {
  SEO,
  HERO,
  CONFIANZA,
  PASOS,
  USOS,
  MATERIALES_NEGOCIO,
  PREGUNTAS,
  ESCALA,
  PEDIDOS_GRANDES,
  MAYORISTA,
  MUESTRA_GRATIS,
  COTIZADOR
} from '../config/negocios.js';
import { ESCALA_VOLUMEN } from '../config/pricing.js';
import { filasEscala, TAMANOS_ESCALA, MATERIALES_ESCALA } from './cotizadorNegocio.js';
import { formatPrice } from './formato.js';
import { esc } from './prerender.js';

export const RUTA_NEGOCIO = '/negocio';
export const RUTA_MAYORISTA = '/mayorista';

const abs = (p) => (String(p).startsWith('http') ? p : `${site.url}${p}`);
const num = (n) => Number(n).toLocaleString('es-AR');

/** Todos los montos totales que existen en la escala (4 y 6 cm, los tres materiales). */
function montosEscala({ conHolografico = true } = {}) {
  const filas = conHolografico ? Object.values(ESCALA_VOLUMEN) : TAMANOS_ESCALA.map((t) => ESCALA_VOLUMEN[t]);
  return filas.flatMap((f) => Object.values(f));
}

/** `FAQPage` con las preguntas de negocio, que son las que se ven en la página. */
export function faqPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PREGUNTAS.items.map((p) => ({ '@type': 'Question', name: p.q, acceptedAnswer: { '@type': 'Answer', text: p.a } }))
  };
}

const migas = (nombre, ruta) => ({
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: abs('/') },
    { '@type': 'ListItem', position: 2, name: nombre, item: abs(ruta) }
  ]
});

/**
 * Product + AggregateOffer con los precios REALES de la escala (el más bajo y
 * el más alto que se cobran). Sin `AggregateRating` ni `Review`: no hay reseñas
 * verificables y Google penaliza las inventadas.
 */
function producto({ nombre, descripcion, sku, ruta, montos }) {
  return {
    '@type': 'Product',
    name: nombre,
    description: descripcion,
    image: [abs('/images/negocio-muestra.webp')],
    sku,
    brand: { '@type': 'Brand', name: site.name },
    category: 'Calcos personalizadas',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'ARS',
      lowPrice: Math.min(...montos),
      highPrice: Math.max(...montos),
      offerCount: montos.length,
      availability: 'https://schema.org/InStock',
      url: abs(ruta),
      seller: { '@type': 'Organization', name: site.name }
    }
  };
}

export function jsonLdNegocio() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      producto({
        nombre: SEO.negocio.title,
        descripcion: SEO.negocio.description,
        sku: META_LINE_SKU.negocio,
        ruta: RUTA_NEGOCIO,
        montos: montosEscala()
      }),
      migas('Calcos para negocios', RUTA_NEGOCIO),
      { '@type': 'FAQPage', mainEntity: faqPageJsonLd().mainEntity }
    ]
  };
}

export function jsonLdMayorista() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      producto({
        nombre: SEO.mayorista.title,
        descripcion: SEO.mayorista.description,
        sku: META_LINE_SKU.mayorista,
        ruta: RUTA_MAYORISTA,
        // El armador de /mayorista no vende holográfico: solo las filas de 4 y 6 cm.
        montos: montosEscala({ conHolografico: false })
      }),
      migas('Calcos por mayor', RUTA_MAYORISTA)
    ]
  };
}

// ─── Contenido estático ─────────────────────────────────────────────────────

const lista = (items, cls = '') => `<ul class="${cls}">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const h2 = (t) => `<h2 class="font-display font-extrabold text-2xl mt-10">${esc(t)}</h2>`;

function escalaHtml() {
  const filas = filasEscala({ tamano: TAMANOS_ESCALA[TAMANOS_ESCALA.length - 1], material: MATERIALES_ESCALA[0] });
  return [
    h2(ESCALA.titulo),
    `<p class="text-white/65 mt-2">${esc(ESCALA.bajada)}</p>`,
    lista(
      filas.map(
        (f) =>
          `<strong>${esc(num(f.cantidad))} calcos</strong>: ${esc(formatPrice(f.total))} · ${esc(formatPrice(f.unitario))} por calco · ` +
          `${esc(f.pct > 0 ? `−${f.pct}% por calco` : `${MUESTRA_GRATIS.titulo} (${MUESTRA_GRATIS.aclaracion.toLowerCase()})`)}`
      ),
      'mt-3 text-sm text-white/80 space-y-1'
    ),
    `<p class="text-xs text-white/50 mt-2">${esc(ESCALA.nota)}</p>`
  ].join('');
}

const preguntasHtml = () =>
  h2(PREGUNTAS.titulo) +
  `<dl class="mt-3 text-sm space-y-3">${PREGUNTAS.items
    .map((p) => `<dt class="font-semibold">${esc(p.q)}</dt><dd class="text-white/70">${esc(p.a)}</dd>`)
    .join('')}</dl>`;

const migasHtml = (nombre) =>
  `<nav aria-label="Breadcrumb" class="mb-6 text-xs text-white/50"><a href="/">Inicio</a> / <span class="text-white/80">${esc(nombre)}</span></nav>`;

/** Semántico y liviano, con clases que ya existen: se ve un instante hasta que monta React. */
export function cuerpoNegocio() {
  return [
    '<div class="page-gradient"><div class="container-app pt-6 pb-16">',
    migasHtml('Calcos para negocios'),
    `<span class="badge badge-new">${esc(HERO.eyebrow)}</span>`,
    `<h1 class="font-display font-black text-4xl sm:text-5xl leading-[1.02] mt-4">${esc(HERO.h1)}</h1>`,
    `<p class="text-white/75 mt-4">${esc(HERO.bajada)}</p>`,
    `<p class="mt-5 font-display font-extrabold text-2xl gradient-text">${esc(HERO.precio.principal)}</p>`,
    `<p class="text-white/55 text-sm">${esc(HERO.precio.referencia)}</p>`,
    `<p class="mt-6"><a class="btn-primary" href="${RUTA_NEGOCIO}#cotizador">${esc(HERO.ctaPrimario)}</a></p>`,
    lista(CONFIANZA.map((c) => `${esc(c.valor)} ${esc(c.label)}`), 'mt-8 text-sm text-white/70'),
    h2(COTIZADOR.titulo),
    `<p class="text-white/65 mt-2">${esc(COTIZADOR.bajada)}</p>`,
    escalaHtml(),
    h2(USOS.titulo),
    lista(USOS.items.map((u) => `<strong>${esc(u.t)}</strong>: ${esc(u.d)}`), 'mt-3 text-sm text-white/80 space-y-1'),
    h2(PASOS.titulo),
    `<ol class="mt-3 text-sm text-white/80 space-y-1">${PASOS.items.map((p) => `<li><strong>${esc(p.t)}</strong>: ${esc(p.d)}</li>`).join('')}</ol>`,
    h2(MATERIALES_NEGOCIO.titulo),
    lista(MATERIALES_NEGOCIO.items.map((m) => `<strong>${esc(m.label)}</strong>: ${esc(m.descripcion)}${m.nota ? ` ${esc(m.nota)}` : ''}`), 'mt-3 text-sm text-white/80 space-y-1'),
    preguntasHtml(),
    h2(PEDIDOS_GRANDES.titulo),
    `<p class="text-white/70 mt-2">${esc(PEDIDOS_GRANDES.bajada)}</p>`,
    `<nav aria-label="Más de EPICALCOS" class="mt-10 text-sm text-white/60">${lista(
      [
        `<a href="${RUTA_MAYORISTA}">Calcos por mayor del catálogo</a>`,
        '<a href="/personalizados">Calcos con tu diseño, desde una</a>',
        '<a href="/categorias">Tienda</a>',
        '<a href="/contacto">Contacto</a>'
      ],
      'flex flex-wrap gap-4'
    )}</nav>`,
    '</div></div>'
  ].join('');
}

export function cuerpoMayorista() {
  return [
    '<div class="page-gradient"><div class="container-app pt-6 pb-16">',
    migasHtml('Calcos por mayor'),
    `<span class="badge badge-hot">${esc(MAYORISTA.eyebrow)}</span>`,
    `<h1 class="font-display font-black text-4xl sm:text-5xl leading-[1.02] mt-4">${esc(MAYORISTA.h1)}</h1>`,
    `<p class="text-white/75 mt-4">${esc(MAYORISTA.bajada)}</p>`,
    lista(MAYORISTA.condiciones.map((c) => `<strong>${esc(c.t)}</strong>: ${esc(c.d)}`), 'mt-6 text-sm text-white/80 space-y-1'),
    escalaHtml(),
    h2(MAYORISTA.armadorTitulo),
    `<p class="text-white/65 mt-2">${esc(MAYORISTA.armadorBajada)}</p>`,
    h2(PEDIDOS_GRANDES.titulo),
    `<p class="text-white/70 mt-2">${esc(PEDIDOS_GRANDES.bajada)}</p>`,
    `<p class="text-sm text-white/70 mt-6"><strong>${esc(MAYORISTA.conTuLogo.t)}</strong> ${esc(MAYORISTA.conTuLogo.d)} <a href="${RUTA_NEGOCIO}">${esc(MAYORISTA.conTuLogo.cta)}</a></p>`,
    `<nav aria-label="Más de EPICALCOS" class="mt-10 text-sm text-white/60">${lista(
      [
        `<a href="${RUTA_NEGOCIO}">Calcos para negocios</a>`,
        '<a href="/personalizados">Calcos con tu diseño, desde una</a>',
        '<a href="/categorias">Tienda</a>',
        '<a href="/contacto">Contacto</a>'
      ],
      'flex flex-wrap gap-4'
    )}</nav>`,
    '</div></div>'
  ].join('');
}
