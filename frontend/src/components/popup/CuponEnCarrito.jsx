import { useCart, formatPrice } from '../../context/CartContext.jsx';
import { leerCupon } from '../../lib/cuponVentana.js';
import { beneficioActivo, porcentajeCupon } from '../../lib/popupReglas.js';
import { usePopupVersion } from '../../lib/popupEstado.js';

const sumar = (items) => items.reduce((a, i) => a + i.price * i.quantity, 0);

/**
 * El 10% del popup en el carrito lateral y en /carrito (spec 026).
 *
 * Hasta acá el carrito decía "tu cupón (si tenés uno) se aplica en el
 * checkout", y el popup viejo prometía "ya te lo dejamos aplicado en tu
 * carrito". Ahora se ve, con el monto.
 *
 * ⚠️ EL MONTO NO SE CALCULA ACÁ. EPICA10 solo alcanza a algunas líneas, se
 * suma al 3x2 y a la transferencia y tiene tope: "10% del subtotal" sería
 * inventar un número. Sale de `pricedItems()`, la MISMA función, con los MISMOS
 * argumentos, que usa el checkout (y que el servidor espeja). El Total con
 * cupón es, al peso, el que la persona va a ver al entrar al checkout pagando
 * con Mercado Pago, que es el medio por defecto.
 *
 * ⚠️ GUARDIA: el carrito arma su Total de otra manera (`subtotal −
 * promoSavings`, redondeando distinto que `pricedItems`). Si SIN cupón las dos
 * cuentas no dan lo mismo (±1 peso por unidad, el redondeo), el resumen no
 * cerraría: se muestra el aviso sin números. Preferimos un "está activo" a un
 * resumen donde las líneas no suman el total.
 *
 * @param {{ totalActual: number, totalTransferActual?: number }} args
 *   `totalTransferActual` solo cuando el carrito muestra la caja "Con
 *   transferencia" (/carrito, con cualquier carrito desde la spec 027).
 */
export function useCuponEnCarrito({ totalActual, totalTransferActual }) {
  const { pricedItems, totalItems } = useCart();
  usePopupVersion(); // se entera de la conversión sin recargar

  const cupon = leerCupon();
  if (!beneficioActivo(cupon)) return { activo: false };

  const pct = porcentajeCupon(cupon.code);
  const tolerancia = Math.max(1, totalItems);
  const cierra = (a, b) => Math.abs(a - b) <= tolerancia;

  const sinCupon = sumar(pricedItems('mercadopago', '', null));
  const conCupon = sumar(pricedItems('mercadopago', cupon.code, cupon.emitidoEn));
  let mostrarMonto = cierra(sinCupon, totalActual) && conCupon < totalActual;

  let totalTransfer = totalTransferActual;
  if (totalTransferActual != null) {
    const transferSin = sumar(pricedItems('transferencia', '', null));
    const transferCon = sumar(pricedItems('transferencia', cupon.code, cupon.emitidoEn));
    // Si la caja de transferencia no cierra, tampoco se muestra el monto de
    // arriba: un Total con cupón y una transferencia sin él darían una
    // transferencia MÁS CARA que Mercado Pago.
    if (!cierra(transferSin, totalTransferActual)) mostrarMonto = false;
    if (mostrarMonto) totalTransfer = transferCon;
  }

  return {
    activo: true,
    code: cupon.code,
    pct,
    mostrarMonto,
    // La línea absorbe el redondeo: así las líneas del resumen suman el Total.
    ahorro: mostrarMonto ? totalActual - conCupon : 0,
    total: mostrarMonto ? conCupon : totalActual,
    totalTransfer
  };
}

/** Una sola línea: el pie del carrito lateral no tiene alto de sobra a 375 px. */
export function CuponEnCarritoLinea({ cupon, className = '' }) {
  if (!cupon?.activo) return null;
  if (!cupon.mostrarMonto) {
    return (
      <div className={`text-xs text-emerald-400 ${className}`}>
        🎁 Tu {cupon.pct}% OFF está activo. Se aplica en el checkout a las calcos del catálogo.
      </div>
    );
  }
  return (
    <div className={`flex justify-between gap-3 text-emerald-400 text-sm ${className}`}>
      <span>🎁 Tu {cupon.pct}% OFF está activo</span>
      <span className="shrink-0">−{formatPrice(cupon.ahorro)}</span>
    </div>
  );
}
