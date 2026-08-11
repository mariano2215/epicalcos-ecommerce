import { formatPrice } from '../context/CartContext.jsx';
import { shipping } from '../config/site.js';

/**
 * Progreso hacia el envío gratis, en el carrito.
 *
 * Hasta ahora el "te faltan $X" solo existía en el checkout, cuando el cliente
 * ya cargó sus datos y agregar un calco más es incómodo. Acá todavía está
 * eligiendo.
 *
 * EL DETALLE QUE IMPORTA: el umbral depende del destino (el de Rosario es más
 * bajo que el nacional, ver config/site.js) y en el carrito TODAVÍA NO SABEMOS a dónde va.
 * Por eso se nombran los dos y se dice cuál es cuál, en vez de mostrar una
 * barra sin condición que después el checkout desmiente. Es el mismo error que
 * tenía "10% off automático" en /categorias.
 *
 * @param {{ subtotal: number, className?: string }} props
 */
export default function FreeShippingProgress({ subtotal, className = '' }) {
  const rosario = shipping.freeShippingThresholdRosario;
  const nacional = shipping.freeShippingThresholdNational;

  // Umbral que todavía no alcanzó: es el que tiene sentido mostrar en la barra.
  const objetivo = subtotal < rosario ? rosario : nacional;
  const alcanzado = subtotal >= nacional;
  const pct = Math.min(100, Math.round((subtotal / objetivo) * 100));
  const falta = Math.max(0, objetivo - subtotal);

  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-3.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        {alcanzado ? (
          <span className="text-emerald-400 font-semibold">
            ✓ Tenés envío gratis a todo el país
          </span>
        ) : subtotal >= rosario ? (
          <span className="text-white/80">
            <span className="text-emerald-400 font-semibold">✓ Envío gratis en Rosario.</span>{' '}
            Te faltan <strong className="text-white">{formatPrice(falta)}</strong> para que también sea
            gratis al resto del país.
          </span>
        ) : (
          <span className="text-white/80">
            Te faltan <strong className="text-white">{formatPrice(falta)}</strong> para{' '}
            <strong className="text-white">envío gratis en Rosario</strong>.
          </span>
        )}
      </div>

      <div
        className="mt-2.5 h-2 rounded-full bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso hacia el envío gratis"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${alcanzado ? 100 : pct}%`,
            background: alcanzado
              ? '#34d399'
              : 'linear-gradient(90deg,#FF1B8D,#FF5A1F)'
          }}
        />
      </div>

      {!alcanzado && (
        <p className="text-xs text-white/45 mt-2">
          Envío gratis desde {formatPrice(rosario)} en Rosario y desde {formatPrice(nacional)} al resto
          del país. También podés retirar sin costo.
        </p>
      )}
    </div>
  );
}
