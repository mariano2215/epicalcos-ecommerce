/**
 * Fotos REALES para las páginas de negocio (spec 031).
 *
 * Misma regla que `data/personalizadosFotos.js` y `data/ugc.js`: nada de
 * mockups, renders ni fotos de stock. Una sección que necesita fotos lee su
 * lista de acá y, si está vacía, NO se monta — ni placeholder ni "próximamente".
 *
 * Hoy la única foto de un pedido de negocio es la tirada de calcos con logo
 * (`negocio-muestra.webp`, 960 × 720). La lista de fotos que falta sacar está
 * en specs/031-calcos-para-negocios/BUSINESS-TODOS.md (N-6).
 *
 * Para sumar fotos: ponerlas en `public/images/negocios/`, correr
 * `node scripts/optimize-images.mjs` y cargarlas acá con su `width`/`height`
 * reales y un `alt` que describa la FOTO.
 *
 * @typedef {{ src: string, width: number, height: number, alt: string }} Foto
 */

/** @type {Foto} */
export const FOTO_HERO = {
  src: '/images/negocio-muestra.webp',
  width: 960,
  height: 720,
  alt: 'Tirada de calcos con el logo de un cliente, recién impresas'
};
