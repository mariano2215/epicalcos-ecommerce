import { useState } from 'react';
import { formatPrice } from '../context/CartContext.jsx';
import {
  shipping,
  provinces,
  shippingZone,
  calculateShipping,
  freeShippingThresholdFor
} from '../config/site.js';
import { trackShippingCalculated } from '../lib/analytics.js';

/**
 * Plazos y costos de envío, disponibles ANTES del checkout.
 *
 * Separa a propósito PRODUCCIÓN (taller) de ENTREGA (total hasta la puerta):
 * mezclarlas hacía que el interior leyera "producción 5 a 7 días hábiles",
 * cuando esos días ya incluyen el correo.
 *
 * La calculadora pide provincia + ciudad —no código postal— porque es
 * EXACTAMENTE lo que consume `calculateShipping`: el precio que muestra acá es
 * el mismo que va a pagar en el checkout. Un campo de CP quedaría lindo pero no
 * cambiaría el resultado, y prometer una precisión que no existe es peor que no
 * tener la calculadora.
 *
 * @param {{ subtotal?: number, freeShipping?: boolean, defaultOpen?: boolean, className?: string }} props
 *        `subtotal` (opcional) hace que la calculadora conozca el carrito y
 *        pueda decir "te faltan $X para el envío gratis".
 *        `freeShipping` = el carrito ya trae un pack con el envío incluido; sin
 *        esto la calculadora cotizaría $8.500 al interior justo al lado de un
 *        resumen que dice "envío gratis incluido".
 */
export default function ShippingInfo({
  subtotal = 0,
  freeShipping = false,
  defaultOpen = false,
  className = ''
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('Santa Fe');
  const [result, setResult] = useState(null);

  const calcular = (e) => {
    e.preventDefault();
    if (!city.trim()) {
      setResult({ error: 'Escribí tu ciudad para calcular el envío.' });
      return;
    }
    const zone = shippingZone(city, province);
    const cost = calculateShipping({ method: 'envio', subtotal, city, province, freeShipping });
    const threshold = freeShippingThresholdFor(city, province);
    trackShippingCalculated({ zone, cost });
    setResult({
      zone,
      cost,
      threshold,
      incluido: freeShipping,
      gap: Math.max(0, threshold - subtotal),
      delivery: zone === 'interior' ? shipping.deliveryInterior : shipping.deliveryRosario
    });
  };

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${className}`}>
      <dl className="space-y-2.5 text-sm">
        <div className="flex gap-3">
          <dt className="text-white/50 shrink-0 w-24">⚡ Producción</dt>
          <dd className="text-white/80">
            <strong className="text-white">{shipping.production}</strong> desde que se confirma el pago.
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-white/50 shrink-0 w-24">🚚 Entrega</dt>
          <dd className="text-white/80">
            Rosario <strong className="text-white">{shipping.deliveryRosario}</strong> · resto del país{' '}
            <strong className="text-white">{shipping.deliveryInterior}</strong> (incluye el correo).
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-white/50 shrink-0 w-24">🎁 Envío gratis</dt>
          <dd className="text-white/80">
            En Rosario desde{' '}
            <strong className="text-emerald-400">{formatPrice(shipping.freeShippingThresholdRosario)}</strong> y a
            todo el país desde{' '}
            <strong className="text-emerald-400">{formatPrice(shipping.freeShippingThresholdNational)}</strong>.
          </dd>
        </div>
      </dl>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-ghost !px-0 hover:!bg-transparent mt-2 min-h-[44px] text-sm underline decoration-white/30"
        >
          Calculá tu envío →
        </button>
      ) : (
        <form onSubmit={calcular} className="mt-4 border-t border-white/10 pt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-white/50 mb-1 block">Provincia</span>
              <select
                value={province}
                onChange={(e) => { setProvince(e.target.value); setResult(null); }}
                className="input-dark !py-2 text-sm"
              >
                {provinces.map((p) => (
                  <option key={p} value={p} className="bg-bg-deep">{p}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-white/50 mb-1 block">Ciudad</span>
              <input
                type="text"
                value={city}
                onChange={(e) => { setCity(e.target.value); setResult(null); }}
                placeholder="Rosario"
                autoComplete="address-level2"
                className="input-dark !py-2 text-sm"
              />
            </label>
          </div>
          <button type="submit" className="btn-secondary !py-2 text-sm w-full sm:w-auto">
            Calcular
          </button>

          {result?.error && <p className="text-sm text-brand-pink">{result.error}</p>}

          {result && !result.error && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm" aria-live="polite">
              <div className="flex justify-between gap-3">
                <span className="text-white/60">Costo del envío</span>
                <span className={result.cost === 0 ? 'text-emerald-400 font-semibold' : 'font-semibold'}>
                  {result.incluido ? 'Incluido' : result.cost === 0 ? 'Gratis' : formatPrice(result.cost)}
                </span>
              </div>
              <div className="flex justify-between gap-3 mt-1">
                <span className="text-white/60">Llega en</span>
                <span className="text-white/80">{result.delivery}</span>
              </div>
              {result.cost > 0 && result.gap > 0 && (
                <p className="text-xs text-white/50 mt-2">
                  Sumá {formatPrice(result.gap)} al pedido y el envío te sale gratis.
                </p>
              )}
              {result.cost === 0 && (
                <p className="text-xs text-emerald-400 mt-2">
                  {result.incluido
                    ? '✓ Tu pack trae el envío incluido, a cualquier punto del país.'
                    : '✓ Tu pedido ya tiene envío gratis a ese destino.'}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-white/40">
            También podés retirar sin costo en {shipping.pickupZone}.
          </p>
        </form>
      )}
    </div>
  );
}
