/**
 * Configurador de calcos personalizados — ÚNICA fuente de verdad del frontend.
 *
 * Modelo de precio:
 *   unitario = round( precio(tamaño) × multiplicador(material) × factorVolumen(cantidad) )
 *   total    = unitario × cantidad
 *
 * El precio del tamaño sale de SIZES en `config/pricing.js` (la lista de calcos que
 * ya se mantiene ahí), así que subir un precio allá reajusta todo el configurador.
 *
 * Alcance: SOLO calcos individuales. Sin planchas, sin terminación barniz/laminado.
 * El corte es especificación (modificador 0 %), no cambia el precio.
 *
 * ⚠️ ESPEJO OBLIGATORIO: los multiplicadores por material y los factores de volumen
 * están espejados en `netlify/functions/lib/pricing.js` (CUSTOM_MATERIAL_MULT /
 * CUSTOM_TIERS; los precios por tamaño ya viven allá como SIZE_PRICES). Si cambiás
 * un número acá, cambialo TAMBIÉN allá o el checkout se rechaza con `price_mismatch`.
 * El test `src/lib/precioPersonalizados.test.js` verifica que ambos lados coincidan.
 */
import { SIZES } from './pricing.js';

/**
 * Materiales que produce EPICALCOS. El precio sale del TAMAÑO (lista de `pricing.js`)
 * y el material lo multiplica:
 *   vinilo blanco y transparente → precio de lista (×1)
 *   holográfico tornasolado      → +30 % (×1,30)
 */
export const MATERIALES = [
  {
    id: 'vinilo-blanco',
    label: 'Vinilo blanco',
    descripcion: 'El clásico. Resistente al agua y al sol.',
    multiplicador: 1
  },
  {
    id: 'transparente',
    label: 'Transparente',
    descripcion: 'Sin fondo, se integra a cualquier superficie.',
    multiplicador: 1
  },
  {
    id: 'holografico',
    label: 'Holográfico / especiales',
    descripcion: 'Tornasolado especial, con brillo que cambia con la luz.',
    multiplicador: 1.3
  },
  {
    id: 'dtf-uv',
    label: 'DTF UV sin fondo',
    descripcion: 'Con relieve y terminación premium, sin fondo.',
    multiplicador: 1 // TODO: confirmar con Mariano — ¿va a precio de lista o lleva recargo?
  }
];

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

/** Cortes: especificación pura. modificador SIEMPRE 0 (no cambia el precio). */
export const CORTES = [
  { id: 'silueta', label: 'Silueta', descripcion: 'Cortado siguiendo el contorno del diseño.', modificador: 0 },
  { id: 'cuadrado', label: 'Cuadrado', descripcion: 'Borde recto con margen parejo.', modificador: 0 },
  { id: 'circulo', label: 'Círculo', descripcion: 'Recorte circular.', modificador: 0 }
];

/**
 * Tiers de cantidad (calcos). El usuario elige uno de estos valores; el factor de
 * volumen se aplica sobre el unitario. El primer tier (factor 1) es el precio de lista.
 */
export const TIERS = [
  { cantidad: 10, factor: 1 }, //     TODO: confirmar factores con Mariano
  { cantidad: 25, factor: 0.92 },
  { cantidad: 50, factor: 0.85 },
  { cantidad: 100, factor: 0.78 },
  { cantidad: 250, factor: 0.7 },
  { cantidad: 500, factor: 0.62 }
];

/** Reglas de validación del archivo (cliente). Hasta 10 diseños por pedido. */
export const ARCHIVO = {
  formatos: ['png', 'jpg', 'jpeg', 'pdf', 'svg', 'ai'],
  /** Formatos raster a los que se les puede medir la resolución en px. */
  formatosRaster: ['png', 'jpg', 'jpeg'],
  pesoMaximoMB: 10,
  resolucionMinimaDPI: 150,
  maxArchivos: 10
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getMaterial = (id) => MATERIALES.find((m) => m.id === id) || null;
export const getTamano = (id) => TAMANOS.find((t) => t.id === id) || null;
export const getCorte = (id) => CORTES.find((c) => c.id === id) || null;
export const getTier = (cantidad) => TIERS.find((t) => t.cantidad === cantidad) || null;

/** Resolución mínima recomendada (px) para un tamaño en cm, a la DPI configurada. */
export const recomendacionPx = (cm) => Math.round((cm / 2.54) * ARCHIVO.resolucionMinimaDPI);

/**
 * Mapas derivados para el test de paridad contra el espejo del backend.
 * (Mantienen la MISMA forma que las constantes de netlify/functions/lib/pricing.js.)
 */
export const MATERIAL_MULT_MAP = Object.fromEntries(MATERIALES.map((m) => [m.id, m.multiplicador]));
export const SIZE_PRICE_MAP = Object.fromEntries(TAMANOS.map((t) => [t.id, t.precio]));
