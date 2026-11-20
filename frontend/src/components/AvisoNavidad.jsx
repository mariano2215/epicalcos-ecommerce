import { NAVIDAD_2026, shipping } from '../config/site.js';
import { fechaLimiteNavidad, fechasNavidadVigentes } from '../lib/navidad.js';

/**
 * Hasta cuándo se puede pedir para recibir antes de Navidad (spec 042).
 *
 * Las fechas no se escriben acá: salen de `NAVIDAD_2026` (config/site.js) y se
 * evalúan en cada render, así que cada aviso desaparece solo al pasar su corte.
 * Sin fecha vigente no se renderiza nada: ni "ya no llega", ni un hueco.
 */

/** Cómo se nombra cada zona en la lista de la ficha. */
const LUGAR = {
  interior: 'al interior',
  rosario: 'con envío en Rosario',
  retiro: 'si retirás en Rosario'
};

/**
 * Todas las fechas vigentes, en una oración. Para la ficha y el carrito
 * (`ShippingInfo`), donde todavía no se sabe a dónde va el pedido.
 * Devuelve un `<dd>`-compatible fragmento o `null`.
 */
export function FechasNavidad({ volumen = false }) {
  const fechas = fechasNavidadVigentes({ volumen, config: NAVIDAD_2026 });
  if (!fechas.length) return null;
  // Con 100+ envío y retiro en Rosario comparten fecha: se dice "en Rosario".
  const lugar = (zona) => (volumen && zona === 'rosario' ? 'en Rosario' : LUGAR[zona]);
  const inicio = volumen
    ? `Con ${shipping.produccionVolumenDesde} calcos o más, llega antes del 24 si pedís hasta el `
    : 'Llega antes del 24 si pedís hasta el ';
  return (
    <>
      {inicio}
      {fechas.map((f, i) => (
        <span key={f.zona}>
          {i > 0 && (i === fechas.length - 1 ? ' o el ' : ', el ')}
          <strong className="text-white">{f.etiqueta}</strong> {lugar(f.zona)}
        </span>
      ))}
      .
    </>
  );
}

/**
 * Una sola fecha, la de la zona elegida. Para el checkout, que ya sabe ciudad,
 * provincia y método. `zona` sale de `zonaNavidad()` (lib/navidad.js).
 */
export default function AvisoNavidad({ zona, volumen = false, className = '' }) {
  const fecha = fechaLimiteNavidad({ zona, volumen, config: NAVIDAD_2026 });
  if (!fecha) return null;
  return (
    <p className={`text-xs text-emerald-300/90 ${className}`}>
      🎄 {zona === 'retiro' ? 'Para retirarlo antes de Navidad' : 'Para recibirlo antes de Navidad'}, pedí hasta el{' '}
      <strong className="text-emerald-200">{fecha}</strong>.
    </p>
  );
}
