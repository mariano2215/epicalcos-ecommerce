/**
 * Cálculo de precio de un calco personalizado. Función PURA (sin React).
 *
 * Fórmula (idéntica a la rama `custom` de netlify/functions/lib/pricing.js):
 *   unitario = round( precio(tamaño) × multiplicador(material) × factorVolumen(cantidad) )
 *   total    = unitario × cantidad
 *
 * Devuelve SIEMPRE el desglose para que el resumen muestre de dónde sale el precio.
 * Si la configuración está incompleta, devuelve `configuracionCompleta: false` y el
 * primer campo faltante en `faltante` (para el CTA "Elegí X para ver el precio").
 */
import { getMaterial, getTamano, getCorte, getTier, TIERS } from '../config/personalizados.js';

const round = Math.round;

/** Orden en el que se pide completar la configuración. */
const CAMPOS = [
  { key: 'material', label: 'el material' },
  { key: 'tamano', label: 'el tamaño' },
  { key: 'corte', label: 'el corte' },
  { key: 'cantidad', label: 'la cantidad' }
];

/** Unitario para una combinación ya validada (precio del tamaño × material × volumen). */
function unitarioPara(precioTamano, multiplicador, factor) {
  return round(precioTamano * multiplicador * factor);
}

export function calcularPrecio({ material, tamano, corte, cantidad } = {}) {
  const mat = getMaterial(material);
  const tam = getTamano(tamano);
  const cor = getCorte(corte);
  const tier = getTier(cantidad);

  const seleccion = { material: mat, tamano: tam, corte: cor, cantidad: tier };
  const faltanteCampo = CAMPOS.find((c) => !seleccion[c.key]);

  if (faltanteCampo) {
    return {
      unitario: 0,
      total: 0,
      ahorro: 0,
      porcentajeAhorro: 0,
      desglose: null,
      configuracionCompleta: false,
      faltante: faltanteCampo.label
    };
  }

  const precioTamano = tam.precio;
  const multiplicador = mat.multiplicador * (1 + cor.modificador / 100); // corte = 0 %
  const factor = tier.factor;

  const unitarioLista = unitarioPara(precioTamano, multiplicador, TIERS[0].factor); // precio a tier 1
  const unitario = unitarioPara(precioTamano, multiplicador, factor);
  const total = unitario * cantidad;
  const ahorro = (unitarioLista - unitario) * cantidad;
  const porcentajeAhorro = round((1 - factor / TIERS[0].factor) * 100);

  return {
    unitario,
    total,
    ahorro,
    porcentajeAhorro,
    configuracionCompleta: true,
    faltante: null,
    desglose: {
      precioTamano,
      multiplicadorMaterial: mat.multiplicador,
      modificadorCorte: cor.modificador,
      factorVolumen: factor,
      unitarioLista,
      unitario
    }
  };
}

/**
 * Unitario para un tier puntual (para pintar cada opción de cantidad con su $/u).
 * Devuelve 0 si falta material o tamaño.
 */
export function unitarioParaTier({ material, tamano, corte, cantidad }) {
  const mat = getMaterial(material);
  const tam = getTamano(tamano);
  const tier = getTier(cantidad);
  if (!mat || !tam || !tier) return 0;
  const cor = getCorte(corte);
  const multiplicador = mat.multiplicador * (1 + (cor?.modificador || 0) / 100);
  return unitarioPara(tam.precio, multiplicador, tier.factor);
}
