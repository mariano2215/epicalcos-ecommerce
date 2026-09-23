/**
 * Configurador de calcos personalizados — ÚNICA fuente de verdad del frontend.
 *
 * Modelo de precio (simple a propósito): un calco personalizado vale lo MISMO
 * que uno del catálogo, según su tamaño.
 *   unitario = precio(tamaño)   →  4 cm $1.200 · 6 cm $1.600 · 9 cm $2.000
 *   total    = unitario × cantidad
 *
 * NO hay mínimo de compra (antes eran 10). El cliente elige TAMAÑO + CORTE +
 * MATERIAL, sube su archivo y listo.
 *
 * MATERIAL (enmienda 22/9/2026, spec 023 §7.9): Vinilo Blanco y DTF UV no
 * cambian el precio de arriba. Vinilo Holográfico suma `RECARGO_HOLOGRAFICO`
 * FIJO POR DISEÑO (no por copia) — ver `lib/precioPersonalizados.js` y el
 * comentario de `construirLineas()` en `lib/borradorPersonalizado.js` sobre
 * por qué es una línea de carrito aparte y no un ajuste al unitario.
 *
 * ⚠️ ESPEJO OBLIGATORIO: la rama `custom` de `netlify/functions/lib/pricing.js`
 * re-precia con el MISMO SIZE_PRICES, y `FIXED_PRICES['material-holografico']`
 * espeja `RECARGO_HOLOGRAFICO.precio`. Si cambiás un precio de tamaño o el
 * recargo, cambialo en `config/pricing.js`/acá Y en el espejo del backend, o
 * el checkout se rechaza con `price_mismatch`. El test
 * `src/lib/precioPersonalizados.test.js` verifica que ambos lados coincidan.
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

/**
 * Materiales (enmienda 22/9/2026, spec 023 §7.9). Vinilo Blanco y DTF UV NO
 * cambian el precio (valen lo mismo que el tamaño); Vinilo Holográfico suma
 * `RECARGO_HOLOGRAFICO` FIJO POR DISEÑO, no por copia — ver `precioPersonalizados.js`.
 *
 * ⚠️ ESPEJO OBLIGATORIO: `RECARGO_HOLOGRAFICO.precio` está espejado en
 * `netlify/functions/lib/pricing.js` (`FIXED_PRICES['material-holografico']`).
 * Los tres ids son además una allowlist que el servidor valida contra el id de
 * la línea `custom:` — un id de material que no esté acá el servidor lo rechaza.
 */
export const MATERIALES = [
  { id: 'vinilo-blanco', label: 'Vinilo Blanco', descripcion: 'El clásico. Resistente al agua y al sol.' },
  { id: 'dtf-uv', label: 'DTF UV', descripcion: 'Con relieve y terminación premium.' },
  { id: 'vinilo-holografico', label: 'Vinilo Holográfico', descripcion: 'Brillo tornasolado que cambia con la luz.' }
];

export const MATERIAL_POR_DEFECTO = 'vinilo-blanco';
export const MATERIAL_HOLOGRAFICO_ID = 'vinilo-holografico';

/**
 * Recargo fijo por diseño (no por copia) del Vinilo Holográfico. `id` es el id
 * del producto de precio fijo (línea `fixed:material-holografico:{disenoId}`),
 * NO el id del material (`MATERIAL_HOLOGRAFICO_ID`) — son dos ids distintos a
 * propósito: uno identifica el material que elige el cliente, el otro la
 * línea de cobro que ese material dispara.
 */
export const RECARGO_HOLOGRAFICO = { id: 'material-holografico', precio: 15000 };

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
const FORMATOS_CLOUDINARY = ['png', 'jpg', 'jpeg', 'pdf', 'svg', 'ai'];

/**
 * Formatos que el navegador convierte ANTES de subir (spec 023). El preset de
 * Cloudinary solo acepta `FORMATOS_CLOUDINARY` y editarlo requiere el API secret,
 * que no está en el repo ni en Netlify. Un WEBP se pasa a PNG —no a JPEG: los
 * WEBP de stickers traen transparencia, y la silueta depende del alfa.
 */
const FORMATOS_CONVERTIBLES = ['webp'];

export const ARCHIVO = {
  /**
   * Lo que acepta Cloudinary. ⚠️ Lo usan también Polaroid, Negocio y el armador
   * mayorista a través de `SubidaArchivo`: sumar acá un formato que Cloudinary
   * rechaza haría que esas páginas acepten un archivo que después no sube.
   */
  formatos: FORMATOS_CLOUDINARY,
  formatosConvertibles: FORMATOS_CONVERTIBLES,
  /**
   * Lo que acepta la zona de subida de /personalizados: lo de Cloudinary más lo
   * que se convierte en el navegador. El orden es el del texto de ayuda (JPG
   * primero: es lo que tiene casi todo el mundo en el celular).
   */
  formatosEntrada: ['jpg', 'jpeg', 'png', ...FORMATOS_CONVERTIBLES, 'pdf', 'svg', 'ai'],
  /** Formatos raster a los que se les puede medir la resolución en px. */
  formatosRaster: ['png', 'jpg', 'jpeg'],
  pesoMaximoMB: 10,
  resolucionMinimaDPI: 150,
  maxArchivos: 100,
  /** Subidas simultáneas a Cloudinary: con 50+ archivos, todas juntas se cuelgan. */
  subidasEnParalelo: 4
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Los formatos aceptados, escritos para que los lea una persona:
 * `['png','jpg','jpeg','pdf','svg','ai']` → `"PNG, JPG, PDF, SVG o AI"`.
 *
 * POR QUÉ EXISTE: el texto de ayuda de la zona de subida estaba escrito a mano
 * ("PNG, JPG o PDF") mientras el validador aceptaba seis extensiones. O sea que
 * el sitio le decía al cliente que su .svg no servía y después se lo aceptaba
 * igual. Ahora la lista SALE de `formatos`, así que agregar o sacar una
 * extensión reescribe el texto solo y no pueden desincronizarse.
 *
 * `jpeg` no se lista aparte a propósito: es la misma extensión que `jpg` y en
 * un texto de ayuda sólo agrega ruido. Se sigue aceptando.
 */
export function formatosLegibles(formatos = ARCHIVO.formatos) {
  const nombres = formatos.filter((f) => f !== 'jpeg').map((f) => f.toUpperCase());
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} o ${nombres[nombres.length - 1]}`;
}

/**
 * Los mismos formatos, para la zona de subida grande: `"JPG · PNG · WEBP · …"`.
 * Sale de la misma lista que `formatosLegibles` por el mismo motivo.
 */
export function formatosCortos(formatos = ARCHIVO.formatosEntrada) {
  return formatos.filter((f) => f !== 'jpeg').map((f) => f.toUpperCase()).join(' · ');
}

/** Extensión en minúscula de un nombre de archivo (`''` si no tiene). */
export const extension = (nombre) => {
  const partes = String(nombre || '').split('.');
  return partes.length > 1 ? partes.pop().toLowerCase() : '';
};

export const getTamano = (id) => TAMANOS.find((t) => t.id === id) || null;
export const getCorte = (id) => CORTES.find((c) => c.id === id) || null;
export const getMaterial = (id) => MATERIALES.find((m) => m.id === id) || null;

/** Cantidad saneada dentro de los límites (entero, sin mínimo comercial). */
export const clampCantidad = (n) =>
  Math.min(CANTIDAD.max, Math.max(CANTIDAD.min, Math.floor(Number(n) || CANTIDAD.min)));

/** Resolución mínima recomendada (px) para un tamaño en cm, a la DPI configurada. */
export const recomendacionPx = (cm) => Math.round((cm / 2.54) * ARCHIVO.resolucionMinimaDPI);

/** Mapa derivado para el test de paridad contra el espejo del backend (SIZE_PRICES). */
export const SIZE_PRICE_MAP = Object.fromEntries(TAMANOS.map((t) => [t.id, t.precio]));
