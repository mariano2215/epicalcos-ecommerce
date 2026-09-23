/**
 * Fotos REALES de personalizados, por sección de /personalizados (spec 023).
 *
 * Cada sección que depende de fotos lee su lista de acá y, si está vacía, NO se
 * monta: ni placeholder, ni render, ni un texto que diga que faltan. Es la misma
 * regla de `data/ugc.js` y `data/testimonials.js` — la sección existe para
 * responder "¿cómo queda de verdad?", y una foto generada la responde mal.
 *
 * HOY ESTÁ TODO VACÍO A PROPÓSITO (Mariano, 14/9/2026): no hay más fotos que la
 * del testimonio de Sofía M., que llega a la página por `data/testimonials.js`.
 * `/images/negocio-muestra.webp` es real, pero la respuesta fue "solo la que está
 * en la página".
 *
 * Para sumar fotos: ponerlas en `public/images/personalizados/`, correr
 * `node scripts/optimize-images.mjs` (las pasa a WebP 800 px + variante 400 px)
 * y cargar acá cada una con su `width`/`height` reales y un `alt` que describa
 * la FOTO — es lo único que le llega a un lector de pantalla.
 *
 * @typedef {{ src: string, width: number, height: number, alt: string }} Foto
 */

export const FOTOS = {
  /**
   * Tríos del MISMO diseño: el archivo que mandó el cliente, la calco suelta y
   * la calco pegada. `etiqueta` es opcional ('FOTO → CALCO', 'LOGO → CALCO').
   * @type {Array<{ original: Foto, calco: Foto, aplicada: Foto, etiqueta?: string }>}
   */
  deImagenACalco: [],

  /**
   * Una foto por card. "Qué podés convertir" se monta solo con las cuatro:
   * tres cards con foto y una con un emoji se leen como una sección a medias.
   * @type {{ mascota: Foto|null, foto: Foto|null, dibujo: Foto|null, logo: Foto|null }}
   */
  queConvertir: { mascota: null, foto: null, dibujo: null, logo: null },

  /** Se monta desde `GALERIA.minimo` fotos. @type {Array<Foto & { etiqueta?: string }>} */
  galeria: [],

  /** Macro del borde troquelado y la superficie del vinilo. @type {Foto|null} */
  calidad: null,

  /** Foto opcional por paso del proceso; sin foto, el paso va con su ícono. */
  proceso: { subi: null, revisamos: null, producimos: null, recibis: null }
};

/** ¿Están las cuatro fotos de "Qué podés convertir"? */
export const queConvertirCompleto = () => Object.values(FOTOS.queConvertir).every(Boolean);
