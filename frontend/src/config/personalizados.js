/**
 * Configurador de calcos personalizados — ÚNICA fuente de verdad del frontend.
 *
 * Modelo de precio (simple a propósito): un calco personalizado vale lo MISMO
 * que uno del catálogo, según su tamaño.
 *   unitario = precio(tamaño)   →  4 cm $1.200 · 6 cm $1.600 · 9 cm $2.000
 *   total    = unitario × cantidad
 *
 * NO hay mínimo de compra (antes eran 10) ni recargo por material: el cliente
 * elige TAMAÑO + CORTE, sube su archivo y listo.
 *
 * ⚠️ ESPEJO OBLIGATORIO: la rama `custom` de `netlify/functions/lib/pricing.js`
 * re-precia con el MISMO SIZE_PRICES. Si cambiás un precio de tamaño, cambialo
 * en `config/pricing.js` Y en el espejo del backend, o el checkout se rechaza
 * con `price_mismatch`. El test `src/lib/precioPersonalizados.test.js` verifica
 * que ambos lados coincidan.
 */
import { SIZES } from './pricing.js';

/**
 * Tamaños: se derivan de SIZES (`config/pricing.js`) para no duplicar la lista de
 * precios. Cambiar un precio allá reajusta toda la grilla del configurador.
 * `cm` se usa para recomendar la resolución mínima del archivo.
 */
export const TAMANOS = SIZES.map((s) => ({
  id: s.id,
  label: s.label,
  cm: parseFloat(s.id),
  precio: s.price
}));

/** Cortes: especificación pura, no cambian el precio. */
export const CORTES = [
  { id: 'silueta', label: 'Silueta', descripcion: 'Cortado siguiendo el contorno del diseño.' },
  { id: 'cuadrado', label: 'Cuadrado', descripcion: 'Borde recto con margen parejo.' },
  { id: 'circulo', label: 'Círculo', descripcion: 'Recorte circular.' }
];

/** Cantidad: SIN mínimo de compra. El tope espeja MAX_QTY_PER_LINE del backend. */
export const CANTIDAD = { min: 1, max: 1000, default: 1 };

/**
 * Reglas de validación del archivo (cliente).
 *
 * `maxArchivos` es un tope anti-abuso, no una regla comercial: hay clientes que
 * suben 50 fotos propias, así que el límite vive alto (100). Si se toca, ojo con
 * los links que viajan en `shipping.comments` hasta el mail/CRM: las Netlify
 * Functions recortan ese texto (ver MAX_COMMENTS en create-preference.js).
 */
export const ARCHIVO = {
  formatos: ['png', 'jpg', 'jpeg', 'pdf', 'svg', 'ai'],
  /** Formatos raster a los que se les puede medir la resolución en px. */
  formatosRaster: ['png', 'jpg', 'jpeg'],
  pesoMaximoMB: 10,
  resolucionMinimaDPI: 150,
  maxArchivos: 100,
  /** Subidas simultáneas a Cloudinary: con 50+ archivos, todas juntas se cuelgan. */
  subidasEnParalelo: 4
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getTamano = (id) => TAMANOS.find((t) => t.id === id) || null;
export const getCorte = (id) => CORTES.find((c) => c.id === id) || null;

/** Cantidad saneada dentro de los límites (entero, sin mínimo comercial). */
export const clampCantidad = (n) =>
  Math.min(CANTIDAD.max, Math.max(CANTIDAD.min, Math.floor(Number(n) || CANTIDAD.min)));

/** Resolución mínima recomendada (px) para un tamaño en cm, a la DPI configurada. */
export const recomendacionPx = (cm) => Math.round((cm / 2.54) * ARCHIVO.resolucionMinimaDPI);

/** Mapa derivado para el test de paridad contra el espejo del backend (SIZE_PRICES). */
export const SIZE_PRICE_MAP = Object.fromEntries(TAMANOS.map((t) => [t.id, t.precio]));
