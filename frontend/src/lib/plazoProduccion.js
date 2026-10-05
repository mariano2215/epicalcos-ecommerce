/**
 * Plazo de producción según el TAMAÑO del pedido (spec 031, RF-P3).
 * Función PURA, sin React.
 *
 * Mariano, 5/10/2026: los pedidos de 100 calcos o más llevan 3 a 5 días
 * hábiles de producción, de cualquier producto. Con menos, el plazo de
 * siempre (`shipping.production`). Hasta ese día el checkout y el mail le
 * prometían 2 a 3 días también a quien compraba la Promo Negocio o el pack de
 * 100: un plazo que el taller no cumple con esa cantidad.
 *
 * Las calcos se cuentan desde el ID de cada línea y su `quantity`, que son los
 * dos datos que tiene también el servidor (el pedido guardado y el que devuelve
 * Mercado Pago). Contarlas desde `meta` dejaría al mail sin forma de llegar al
 * mismo número.
 *
 * ⚠️ ESPEJO: netlify/functions/lib/plazoProduccion.js (el mail al cliente). Lo
 * verifica `plazoProduccion.test.js`.
 */
import { shipping } from '../config/site.js';
import { NEGOCIO, PROMO_MAYORISTA_100 } from '../config/pricing.js';

/**
 * Cuántas calcos trae una línea.
 * - `sticker:` / `custom:` / `pack:mayorista:` / `pack:personalizados:` → una por unidad.
 * - `pack:mayorista100:` → un pack de 100 por unidad.
 * - `negocio:` (Promo Negocio y pack holográfico) → 100 por unidad.
 * - `volumen:{tamano}:{material}:{cantidad}:{ts}` (escala de la spec 032) → la cantidad del id.
 * - Fijos (Polaroid, tatuajes, recargo holográfico), digitales y el envío → 0:
 *   no son calcos, o ya están contadas en su pack.
 */
export function calcosDeLinea(linea) {
  const q = Math.max(0, Number(linea?.quantity) || 0);
  const parts = String(linea?.id || '').split(':');
  switch (parts[0]) {
    case 'sticker':
    case 'custom':
      return q;
    case 'pack':
      return parts[1] === 'mayorista100' ? PROMO_MAYORISTA_100.qty * q : q;
    case 'negocio':
      return NEGOCIO.qty * q;
    case 'volumen':
      return (Number(parts[3]) || 0) * q;
    default:
      return 0;
  }
}

export function calcosDelPedido(items = []) {
  return items.reduce((total, linea) => total + calcosDeLinea(linea), 0);
}

/** ¿Lleva el plazo de los pedidos grandes? */
export function esPedidoVolumen(items = []) {
  return calcosDelPedido(items) >= shipping.produccionVolumenDesde;
}
