import { useCart, formatPrice } from '../context/CartContext.jsx';
import { BULK_THRESHOLD } from '../config/pricing.js';

/**
 * Progreso hacia el 10 % por volumen — el hermano de FreeShippingProgress, pero
 * contando CALCOS en vez de pesos.
 *
 * POR QUÉ EXISTE: el aviso ya estaba, pero como una línea de texto gris de 11 px
 * ("Sumá 3 calcos más para el 10% off por transferencia") apretada entre el
 * subtotal y el total. Decía cuánto falta, pero no mostraba cuán cerca está:
 * con 7 de 10 calcos en el carrito, la persona está al 70 % del descuento y no
 * hay nada en pantalla que lo transmita.
 *
 * ⚠️ LA CONDICIÓN NO ES OPCIONAL. El 10 % NO es automático: corre sólo pagando
 * por transferencia bancaria (BULK_DISCOUNT_PAYMENT_METHOD en config/pricing.js).
 * Este componente NUNCA dice "10% off" a secas — es el error que ya se cometió
 * en /categorias con "10% off automático", y que el cliente descubría recién al
 * elegir medio de pago en el checkout. Ver el comentario de DiscountNote.jsx.
 *
 * Cuenta las mismas unidades que el descuento real: `bulkUnits` del
 * CartContext, que suma SÓLO las líneas `type === 'sticker'`. Packs, negocio y
 * personalizados ya traen su propio descuento y no entran — mostrarlos acá
 * prometería un umbral que después no se cumple.
 *
 * @param {{ className?: string, compacto?: boolean }} props
 */
export default function BulkProgress({ className = '', compacto = false }) {
  const { bulkUnits, bulkEligible, bulkSavings, digitalOnly } = useCart();

  // Un carrito 100 % digital son archivos de precio fijo: el descuento por
  // volumen no los toca, y anunciarlo ahí se lee como que sí. Mismo criterio
  // que ya tenían el drawer y /carrito para los nudges de calcos.
  if (digitalOnly) return null;

  // ⚠️ NO hay guarda de `bulkUnits === 0`. Tentaba poner una —una barra en cero
  // en un carrito que sólo tiene un pack parece ruido—, pero /carrito HOY ya
  // muestra ahí "Sumá 10 calcos más y obtené 10% off": esconderlo sería sacar
  // un nudge que ya está vivo. Con 0 calcos la barra queda vacía y el texto
  // dice los 10 que faltan, que es exactamente lo que decía antes.

  const faltan = Math.max(0, BULK_THRESHOLD - bulkUnits);
  const pct = Math.min(100, Math.round((bulkUnits / BULK_THRESHOLD) * 100));

  return (
    <div
      className={`rounded-xl border ${
        bulkEligible ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'
      } ${compacto ? 'p-2.5' : 'p-3.5'} ${className}`}
    >
      <div className={`flex items-baseline justify-between gap-3 ${compacto ? 'text-xs' : 'text-sm'}`}>
        {bulkEligible ? (
          <span className="text-emerald-400 font-semibold">
            ✓ Llegaste a {BULK_THRESHOLD} calcos — 10% off por transferencia
            {bulkSavings > 0 && <> · ahorrás {formatPrice(bulkSavings)}</>}
          </span>
        ) : (
          <span className="text-white/80">
            Te falta{faltan === 1 ? '' : 'n'}{' '}
            <strong className="text-white">
              {faltan} calco{faltan === 1 ? '' : 's'}
            </strong>{' '}
            para <strong className="text-white">10% off pagando por transferencia</strong>.
          </span>
        )}
      </div>

      <div
        className={`${compacto ? 'mt-2 h-1.5' : 'mt-2.5 h-2'} rounded-full bg-white/10 overflow-hidden`}
        role="progressbar"
        aria-valuenow={Math.min(bulkUnits, BULK_THRESHOLD)}
        aria-valuemin={0}
        aria-valuemax={BULK_THRESHOLD}
        // Pasado el umbral, `bulkUnits` sigue creciendo y "32 de 10 calcos" no
        // es una frase: alcanzado el descuento, el progreso deja de tener
        // sentido y lo que hay que anunciar es el estado.
        aria-label={
          bulkEligible
            ? `10% de descuento por transferencia alcanzado con ${bulkUnits} calcos`
            : `Progreso hacia el 10% de descuento por transferencia: ${bulkUnits} de ${BULK_THRESHOLD} calcos`
        }
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${pct}%`,
            background: bulkEligible ? '#34d399' : 'linear-gradient(90deg,#FF1B8D,#FF5A1F)'
          }}
        />
      </div>

      {!compacto && !bulkEligible && (
        <p className="text-xs text-white/45 mt-2">
          Llevás {bulkUnits} de {BULK_THRESHOLD}. Podés mezclar categorías y tamaños; el medio de
          pago se elige en el checkout.
        </p>
      )}
    </div>
  );
}
