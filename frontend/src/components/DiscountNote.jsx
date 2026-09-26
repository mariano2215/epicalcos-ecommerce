import { TRANSFER_PCT, TRANSFER_OFF } from '../config/pricing.js';

/**
 * La condición del descuento por transferencia, escrita UNA sola vez.
 *
 * NO es automático: corre solo pagando por transferencia bancaria (ver
 * TRANSFER_PAYMENT_METHOD en config/pricing.js). Antes cada pantalla lo contaba
 * a su manera —"10% off automático" en /categorias, "10% off" a secas en el
 * hero— y el cliente se enteraba de la condición recién al elegir medio de pago
 * en el checkout. Todo el sitio consume estas constantes para que la promesa
 * sea siempre la misma.
 *
 * Spec 027 (26/9/2026): 15 % en cualquier compra, desde 1 calco. Hasta ahí era
 * 10 % desde 10 calcos, y esta caja tenía tres estados ("ya llegaste", "te
 * faltan N", "desde 10"); sin umbral queda uno solo.
 */
export const BULK_DISCOUNT_SHORT = TRANSFER_OFF;
export const BULK_DISCOUNT_LONG = `${TRANSFER_PCT}% off pagando por transferencia bancaria, en cualquier compra y desde 1 calco.`;

/**
 * Caja del descuento por transferencia. Se usa en la grilla de categoría, en la
 * ficha de producto y en las landings de uso.
 *
 * @param {{ className?: string }} props
 */
export default function DiscountNote({ className = '' }) {
  return (
    <div className={`rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white/70 flex items-start gap-2 ${className}`}>
      <span aria-hidden>🏷️</span>
      <span>{BULK_DISCOUNT_LONG}</span>
    </div>
  );
}
