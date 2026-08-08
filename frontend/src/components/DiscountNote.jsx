import { useCart } from '../context/CartContext.jsx';
import { BULK_THRESHOLD } from '../config/pricing.js';

/**
 * La condición del descuento por volumen, escrita UNA sola vez.
 *
 * El 10 % desde 10 calcos NO es automático: solo corre pagando por
 * transferencia bancaria (ver BULK_DISCOUNT_PAYMENT_METHOD en config/pricing.js).
 * Antes cada pantalla lo contaba a su manera —"10% off automático" en
 * /categorias, "10% off" a secas en el hero— y el cliente se enteraba de la
 * condición recién al elegir medio de pago en el checkout. Todo el sitio
 * consume estas constantes para que la promesa sea siempre la misma.
 */
export const BULK_DISCOUNT_SHORT = `10% OFF desde ${BULK_THRESHOLD} calcos pagando por transferencia`;
export const BULK_DISCOUNT_LONG =
  `Desde ${BULK_THRESHOLD} calcos, 10% off pagando por transferencia bancaria — mezclá categorías y tamaños como quieras.`;

/**
 * Caja de descuento por volumen con los tres estados del carrito: ya lo tiene,
 * le faltan N calcos, o todavía no empezó. Se usa en la grilla de categoría y
 * en la ficha de producto.
 *
 * @param {{ className?: string }} props
 */
export default function DiscountNote({ className = '' }) {
  const { bulkEligible, unitsToBulk } = useCart();

  if (bulkEligible) {
    return (
      <div className={`rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-sm text-emerald-400 flex items-start gap-2 ${className}`}>
        <span aria-hidden>🎉</span>
        <span>
          Ya llegaste a {BULK_THRESHOLD} calcos: pagando por <strong>transferencia bancaria</strong> tenés 10% off.
        </span>
      </div>
    );
  }

  if (unitsToBulk > 0 && unitsToBulk < BULK_THRESHOLD) {
    return (
      <div className={`rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white/70 flex items-start gap-2 ${className}`}>
        <span aria-hidden>🏷️</span>
        <span>
          Sumá <strong className="text-white">{unitsToBulk} calco{unitsToBulk === 1 ? '' : 's'} más</strong> y pagando
          por <strong className="text-white">transferencia</strong> tenés 10% off.
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white/70 flex items-start gap-2 ${className}`}>
      <span aria-hidden>🏷️</span>
      <span>{BULK_DISCOUNT_LONG}</span>
    </div>
  );
}
