/**
 * SKUs del catálogo de Meta para las líneas que NO son calcos de catálogo.
 * DEBEN COINCIDIR con el feed que genera scripts/build-meta-feed.mjs
 * (frontend/public/data/skus.json y meta-catalog.csv).
 *
 * Se usan como `content_ids` del Píxel para que Meta matchee las interacciones
 * del sitio (ViewContent / AddToCart / Purchase) con los productos del catálogo
 * — sin esto, la "proporción de coincidencias" queda en 0% y Advantage+ no puede
 * segmentar por estos productos. Los calcos usan el `sku` de su propio diseño
 * (viene embebido en /data/<categoria>.json).
 */
export const META_LINE_SKU = {
  personalizados: '006574',
  mayorista: '006575',
  negocio: '006576',
  tatuajes: '006577',
  polaroid: '006578'
};

/** SKU de catálogo por id de producto de precio fijo (ver pricing.js). */
export const FIXED_SKU = {
  'tatuajes-hoja': META_LINE_SKU.tatuajes,
  'polaroid-x10': META_LINE_SKU.polaroid
};
