import { useCart, formatPrice } from '../context/CartContext.jsx';
import { TRANSFER_OFF } from '../config/pricing.js';

/**
 * El descuento por transferencia en el carrito, con cuánto se ahorra (spec 027).
 *
 * Hasta el 26/9/2026 esto era `BulkProgress`: una barra hacia las 10 calcos que
 * destrababan el 10 %. Desde la spec 027 el 15 % corre con una sola calco y
 * sobre todo producto, así que no hay nada que "completar": la barra se fue y
 * queda el aviso — que va en cualquier carrito, también en uno de packs,
 * Polaroid o imprimibles, porque a esos también los alcanza.
 *
 * ⚠️ LA CONDICIÓN NO ES OPCIONAL: nunca "15% off" a secas. Corre SOLO pagando
 * por transferencia, y el medio se elige recién en el checkout (ver el
 * comentario de DiscountNote.jsx sobre el "10% off automático" de /categorias).
 *
 * `transferSavings` sale de `pricedItems`, la MISMA cuenta del checkout: el
 * ahorro que se muestra acá es exactamente el que se cobra.
 *
 * @param {{ className?: string, compacto?: boolean }} props
 */
export default function AvisoTransferencia({ className = '', compacto = false }) {
  const { transferSavings, items } = useCart();
  if (!items.length) return null;

  return (
    <div
      className={`rounded-xl border border-emerald-500/30 bg-emerald-500/10 ${
        compacto ? 'p-2.5 text-xs' : 'p-3.5 text-sm'
      } ${className}`}
    >
      <span className="text-emerald-400 font-semibold">
        🏦 {TRANSFER_OFF}
        {transferSavings > 0 && <> · ahorrás {formatPrice(transferSavings)}</>}
      </span>
      {!compacto && <p className="text-xs text-white/45 mt-1">En cualquier compra, desde 1 calco. El medio de pago se elige en el checkout.</p>}
    </div>
  );
}
