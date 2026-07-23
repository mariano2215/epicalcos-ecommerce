#!/usr/bin/env node
/**
 * build-meta-feed.mjs
 * Asigna SKUs estables + stock a cada diseño y a cada línea especial, y genera
 * el feed de producto para Meta Commerce Manager (catálogo de Facebook/Instagram).
 *
 * Qué hace:
 *  1) Recorre catalog.json (ya ordenado alfabéticamente por slug) y, dentro de
 *     cada categoría, los diseños en su orden natural. Asigna SKU 000001, 000002…
 *  2) Las 5 líneas especiales (SPECIALS de categories.js: personalizados, mayorista,
 *     negocio, tatuajes, polaroid) reciben el SKU siguiente cada una.
 *  3) Escribe { id, file, sku, stock } en cada frontend/public/data/<slug>.json
 *     (source of truth de la tienda; el SKU y el stock quedan en el dato del diseño).
 *  4) Mantiene un registro ESTABLE en data/skus.json: un SKU ya asignado NO se
 *     reusa ni se renumera aunque después agregues o borres diseños. Meta trackea
 *     los productos por `id`, así que los ids tienen que ser estables en el tiempo.
 *  5) Emite data/meta-catalog.csv, listo para cargar como "feed programado" en
 *     Commerce Manager apuntando a https://epicalcos.com/data/meta-catalog.csv
 *
 * Correr:  node scripts/build-meta-feed.mjs      (después de build-catalog.mjs)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../frontend/src/config/site.js';
import { SPECIALS, categoryName } from '../frontend/src/data/categories.js';
import {
  DEFAULT_SIZE,
  priceForSize,
  WHOLESALE_QTY,
  WHOLESALE_DISCOUNT,
  PERSONALIZADOS_MIN,
  PERSONALIZADOS_DISCOUNT,
  NEGOCIO,
  TATUAJES,
  POLAROID
} from '../frontend/src/config/pricing.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'frontend', 'public', 'data');

const STOCK = 50; // "50 disponibles" por diseño → columna inventory del feed
const BRAND = 'EPICALCOS';
const SITE = site.url.replace(/\/$/, ''); // https://epicalcos.com
const CURRENCY = 'ARS';
const SKU_PAD = 6; // 000001
const REGISTRY = join(DATA, 'skus.json');
const FEED_CSV = join(DATA, 'meta-catalog.csv');

/** Imagen real por línea especial (el resto usa placeholder — ver missingImg). */
const SPECIAL_IMAGES = {
  personalizados: '/testimonials/personalizados-1.png',
  mayorista: '/meta/mayorista.jpg',
  negocio: '/meta/negocio.jpg',
  tatuajes: '/meta/tatuajes.jpg',
  polaroid: '/meta/polaroid.webp'
};

/**
 * `image_link` para el feed. Meta NO renderiza WebP en el catálogo, así que los
 * `.webp` se sirven convertidos a JPG on-the-fly con el Netlify Image CDN
 * (`/.netlify/images?...&fm=jpg`) — sin generar ni versionar archivos nuevos.
 * Los JPG/PNG van directo.
 */
function feedImage(path) {
  return /\.webp$/i.test(path)
    ? `${SITE}/.netlify/images?url=${path}&fm=jpg&w=600`
    : `${SITE}${path}`;
}

// ── Registro de SKUs (estable / append-only) ────────────────────────────────
const registry = existsSync(REGISTRY)
  ? JSON.parse(readFileSync(REGISTRY, 'utf8'))
  : { _meta: {}, byKey: {} };
const byKey = registry.byKey || (registry.byKey = {});

let maxSku = 0;
for (const v of Object.values(byKey)) {
  const n = parseInt(v, 10);
  if (Number.isFinite(n) && n > maxSku) maxSku = n;
}
const pad = (n) => String(n).padStart(SKU_PAD, '0');

/** Devuelve el SKU de una clave; si es nueva, toma el siguiente disponible. */
function skuFor(key) {
  if (byKey[key]) return byKey[key];
  const sku = pad(++maxSku);
  byKey[key] = sku;
  return sku;
}

// ── Calcos del catálogo ─────────────────────────────────────────────────────
const catalog = JSON.parse(readFileSync(join(DATA, 'catalog.json'), 'utf8'));
const rows = []; // filas del feed (calcos + líneas especiales)
let stickerCount = 0;

for (const { slug } of catalog) {
  const file = join(DATA, `${slug}.json`);
  if (!existsSync(file)) {
    console.warn('⚠️  falta', `${slug}.json — lo salteo`);
    continue;
  }
  const items = JSON.parse(readFileSync(file, 'utf8'));
  const name = categoryName(slug);

  const annotated = items.map((it) => {
    const num = String(it.id).split('-').pop();
    const sku = skuFor(`${slug}/${num}`);
    stickerCount++;
    rows.push({
      id: sku,
      title: `${name} · Calco #${num}`,
      description: `Calco premium de ${name}. Vinilo resistente al agua y al sol, disponible en 4, 6 y 9 cm. Hecho en Rosario, envíos a todo el país.`,
      availability: 'in stock',
      condition: 'new',
      price: `${priceForSize(DEFAULT_SIZE).toFixed(2)} ${CURRENCY}`,
      link: `${SITE}/producto/${slug}/${num}`,
      image_link: feedImage(it.file),
      brand: BRAND,
      inventory: STOCK,
      product_type: name
    });
    return { ...it, sku, stock: STOCK };
  });

  writeFileSync(file, JSON.stringify(annotated));
}

// ── Líneas especiales (1 SKU cada una) ──────────────────────────────────────
/** Precio representativo por línea (derivado de pricing.js → una sola fuente). */
function specialPrice(slug) {
  switch (slug) {
    case 'personalizados':
      return PERSONALIZADOS_MIN * priceForSize(DEFAULT_SIZE) * (1 - PERSONALIZADOS_DISCOUNT);
    case 'mayorista':
      return WHOLESALE_QTY * priceForSize(DEFAULT_SIZE) * (1 - WHOLESALE_DISCOUNT);
    case 'negocio':
      return NEGOCIO.price;
    case 'tatuajes':
      return TATUAJES.price;
    case 'polaroid':
      return POLAROID.price;
    default:
      return priceForSize(DEFAULT_SIZE);
  }
}

const missingImg = [];
for (const s of SPECIALS) {
  const sku = skuFor(`linea:${s.slug}`);
  const image = SPECIAL_IMAGES[s.slug] || `/meta/${s.slug}.jpg`;
  if (!SPECIAL_IMAGES[s.slug]) missingImg.push(s.slug);
  rows.push({
    id: sku,
    title: s.name,
    description: s.blurb,
    availability: 'in stock',
    condition: 'new',
    price: `${specialPrice(s.slug).toFixed(2)} ${CURRENCY}`,
    link: `${SITE}${s.to}`,
    image_link: feedImage(image),
    brand: BRAND,
    inventory: STOCK,
    product_type: 'Servicios'
  });
}

// ── Escribir feed CSV ───────────────────────────────────────────────────────
const COLUMNS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'brand',
  'inventory',
  'product_type'
];
const esc = (v) => {
  const str = String(v ?? '');
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};
const csv =
  [COLUMNS.join(',')]
    .concat(rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(',')))
    .join('\n') + '\n';
writeFileSync(FEED_CSV, csv);

// ── Guardar registro estable ────────────────────────────────────────────────
registry._meta = {
  version: 1,
  descripcion:
    'Registro ESTABLE de SKUs de EPICALCOS. Clave = "<slug>/<num>" por calco o "linea:<slug>" por línea especial. Valor = SKU (6 dígitos). No renumerar: Meta trackea los productos por id.',
  generadoPor: 'scripts/build-meta-feed.mjs',
  actualizado: new Date().toISOString().slice(0, 10)
};
writeFileSync(REGISTRY, JSON.stringify(registry, null, 0));

// ── Resumen ─────────────────────────────────────────────────────────────────
const firstSticker = rows[0]?.id;
const lastSticker = rows[stickerCount - 1]?.id;
const specialRows = rows.slice(stickerCount);
console.log(`Calcos:            ${stickerCount}  (SKU ${firstSticker} → ${lastSticker})`);
console.log(`Líneas especiales: ${specialRows.length}  (SKU ${specialRows[0]?.id} → ${specialRows.at(-1)?.id})`);
for (const r of specialRows) console.log(`   ${r.id}  ${r.title}  → ${r.price}`);
console.log(`Total filas del feed: ${rows.length}`);
console.log(`\n→ feed:     ${FEED_CSV}`);
console.log(`→ registro: ${REGISTRY}`);
if (missingImg.length) {
  console.log(
    `\n⚠️  Falta imagen real (≥500×500, JPG/PNG) para: ${missingImg.join(', ')}.` +
      `\n   Puse placeholder /meta/<slug>.jpg — reemplazalas antes de publicar en Meta.`
  );
}
