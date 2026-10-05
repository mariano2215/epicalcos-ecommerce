// Plazo de producción según el tamaño del pedido (spec 031, RF-P3), para el
// mail al cliente.
//
// ⚠️ ESPEJO de frontend/src/lib/plazoProduccion.js y de `produccionVolumen` /
// `produccionVolumenDesde` en frontend/src/config/site.js. Si cambia el plazo o
// el umbral allá, cambia acá: si no, el sitio promete un plazo y el mail otro.
// Lo verifica frontend/src/lib/plazoProduccion.test.js.
//
// Las calcos se cuentan desde el ID y la `quantity` de cada línea: es lo único
// que tiene el servidor (el pedido guardado o, si Blobs falla, los items que
// devuelve Mercado Pago, que traen además una línea `shipping`).

export const PRODUCCION_VOLUMEN = '3 a 5 días hábiles';
export const PRODUCCION_VOLUMEN_DESDE = 100;
// Calcos por unidad de las líneas de pack de 100 (espejo de NEGOCIO.qty y
// PROMO_MAYORISTA_100.qty del frontend).
const CALCOS_NEGOCIO = 100;
const CALCOS_MAYORISTA100 = 100;

export function calcosDeLinea(linea) {
  const q = Math.max(0, Number(linea?.quantity) || 0);
  const parts = String(linea?.id || '').split(':');
  switch (parts[0]) {
    case 'sticker':
    case 'custom':
      return q;
    case 'pack':
      return parts[1] === 'mayorista100' ? CALCOS_MAYORISTA100 * q : q;
    case 'negocio':
      return CALCOS_NEGOCIO * q;
    case 'volumen':
      return (Number(parts[3]) || 0) * q;
    default:
      return 0;
  }
}

export function calcosDelPedido(items = []) {
  return (items || []).reduce((total, linea) => total + calcosDeLinea(linea), 0);
}

export function esPedidoVolumen(items = []) {
  return calcosDelPedido(items) >= PRODUCCION_VOLUMEN_DESDE;
}
