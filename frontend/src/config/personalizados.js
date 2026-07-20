/**
 * Configurador de calcos personalizados — ÚNICA fuente de verdad del frontend.
 *
 * Modelo de precio (definido con Mariano en Fase 0):
 *   unitario = round( base(material) × (1 + Σmodificadores/100) × factorVolumen(cantidad) )
 *   total    = unitario × cantidad
 *
 * Alcance Fase 1: SOLO calcos individuales. Sin planchas, sin terminación barniz/laminado.
 * El corte es especificación (modificador 0 %), no cambia el precio.
 *
 * ⚠️ ESPEJO OBLIGATORIO: la grilla numérica (base por material, % por tamaño y
 * factores de volumen) está espejada en `netlify/functions/lib/pricing.js`
 * (constantes CUSTOM_MATERIAL_BASE / CUSTOM_SIZE_MOD / CUSTOM_TIERS). Si cambiás
 * un número acá, cambialo TAMBIÉN allá o el checkout se rechaza con `price_mismatch`.
 * El test `src/lib/precioPersonalizados.test.js` verifica que ambos lados coincidan.
 *
 * 🚧 Los precios base y modificadores son NÚMEROS DE MUESTRA para poder demostrar
 * el flujo. NO son vendibles hasta que Mariano confirme costos reales.
 */

/**
 * Materiales que produce EPICALCOS (Fase 0). `precioBase` = precio del calco en el
 * tamaño de referencia (4 cm, modificador 0 %) al tier más chico (10 u, factor 1).
 */
export const MATERIALES = [
  {
    id: 'vinilo-blanco',
    label: 'Vinilo blanco',
    descripcion: 'El clásico. Resistente al agua y al sol.',
    precioBase: 1200 // TODO: confirmar con Mariano
  },
  {
    id: 'transparente',
    label: 'Transparente',
    descripcion: 'Sin fondo, se integra a cualquier superficie.',
    precioBase: 1400 // TODO: confirmar con Mariano
  },
  {
    id: 'holografico',
    label: 'Holográfico / especiales',
    descripcion: 'Con brillo tornasolado que cambia con la luz.',
    precioBase: 1800 // TODO: confirmar con Mariano
  },
  {
    id: 'dtf-uv',
    label: 'DTF UV sin fondo',
    descripcion: 'Con relieve y terminación premium, sin fondo.',
    precioBase: 1600 // TODO: confirmar con Mariano
  }
];

/** Tamaños ofrecidos. `cm` se usa para recomendar la resolución mínima del archivo. */
export const TAMANOS = [
  { id: '4cm', label: '4 cm', cm: 4, modificador: 0 }, //  TODO: confirmar % con Mariano
  { id: '6cm', label: '6 cm', cm: 6, modificador: 35 }, // TODO: confirmar % con Mariano
  { id: '9cm', label: '9 cm', cm: 9, modificador: 70 } //  TODO: confirmar % con Mariano
];

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
export const MATERIAL_BASE_MAP = Object.fromEntries(MATERIALES.map((m) => [m.id, m.precioBase]));
export const SIZE_MOD_MAP = Object.fromEntries(TAMANOS.map((t) => [t.id, t.modificador]));
