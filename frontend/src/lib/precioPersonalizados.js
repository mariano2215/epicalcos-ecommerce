/**
 * Cálculo de precio de un calco personalizado. Función PURA (sin React).
 *
 * Fórmula (idéntica a la rama `custom` de netlify/functions/lib/pricing.js):
 *   unitario = precio(tamaño)      // el mismo precio que un calco del catálogo
 *   total    = unitario × cantidad
 *
 * Si falta elegir tamaño o corte devuelve `configuracionCompleta: false` y el
 * primer campo faltante en `faltante` (para el CTA "Elegí X para ver el precio").
 * La cantidad NO tiene mínimo: si no viene, se asume 1.
 */
import { getTamano, getCorte, clampCantidad } from '../config/personalizados.js';

/** Orden en el que se pide completar la configuración. */
const CAMPOS = [
  { key: 'tamano', label: 'el tamaño' },
  { key: 'corte', label: 'el corte' }
];

export function calcularPrecio({ tamano, corte, cantidad } = {}) {
  const seleccion = { tamano: getTamano(tamano), corte: getCorte(corte) };
  const faltanteCampo = CAMPOS.find((c) => !seleccion[c.key]);
  const unidades = clampCantidad(cantidad);

  if (faltanteCampo) {
    return {
      unitario: 0,
      total: 0,
      cantidad: unidades,
      configuracionCompleta: false,
      faltante: faltanteCampo.label
    };
  }

  const unitario = seleccion.tamano.precio;

  return {
    unitario,
    total: unitario * unidades,
    cantidad: unidades,
    configuracionCompleta: true,
    faltante: null
  };
}
