import { Link } from 'react-router-dom';
import { TAMANOS, getTamano } from '../../../config/personalizados.js';
import { NEGOCIO } from '../../../config/pricing.js';
import { PRECIOS, NEGOCIO_COPY, TAMANO_MAS_ELEGIDO } from '../../../config/personalizadosLanding.js';
import { usoCorto } from '../../../lib/usosPorTamano.js';
import { formatPrice } from '../../../lib/formato.js';
import { cotizarTanda } from '../../../lib/precioPersonalizados.js';
import { usePromoActive } from '../../../lib/promo.js';
import { trackWholesaleClick } from '../../../lib/analytics.js';
import { useBorrador } from '../useBorrador.js';

/** Mismo % que ya muestra /negocio (`NegocioForm.jsx`) — un solo número para la misma promo en todo el sitio. */
const NEGOCIO_OFF = Math.round((1 - NEGOCIO.price / NEGOCIO.listPrice) * 100);

/**
 * Precios y cantidades (RF-L12, L13). Todo sale de las reglas: el precio por
 * tamaño de `SIZES` y el precio por unidad con el 3x2 de `cotizarTanda()`, que
 * redondea igual que el servidor. Si el 3x2 se apaga, la tabla desaparece sola
 * — no queda ningún "ahorrás" de algo que ya no existe.
 *
 * La tabla usa el tamaño que el cliente eligió arriba; si todavía no eligió, el
 * más elegido.
 */
export default function Precios() {
  const promoActiva = usePromoActive();
  const [estado] = useBorrador();
  const tam = getTamano(estado.tamano) || getTamano(TAMANO_MAS_ELEGIDO);

  return (
    <section className="seccion">
      <div className="container-app max-w-4xl">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">{PRECIOS.titulo}</h2>
          <p className="text-white/65 mt-3 text-sm md:text-base">{PRECIOS.bajada}</p>
        </div>

        <ul className="grid grid-cols-3 gap-2 sm:gap-4">
          {TAMANOS.map((t) => (
            <li key={t.id} className="card-glass p-4 sm:p-6 text-center">
              <div className="font-display font-extrabold text-lg sm:text-2xl">{t.label}</div>
              <div className="font-display font-black text-xl sm:text-3xl mt-1 tabular-nums">{formatPrice(t.precio)}</div>
              <div className="text-[11px] sm:text-xs text-white/55">por calco</div>
              <div className="text-[11px] sm:text-xs text-white/45 mt-2 leading-tight">{usoCorto(t.id)}</div>
            </li>
          ))}
        </ul>

        {promoActiva && (
          <div className="card-glass p-5 sm:p-6 mt-4">
            <p className="font-semibold">{PRECIOS.promo}</p>
            <p className="text-xs text-white/50 mt-1">Precio por unidad en {tam.label}, con el 3x2 aplicado:</p>
            <ul className="mt-3 divide-y divide-white/10">
              {PRECIOS.cantidadesEjemplo.map((n) => {
                // A partir de NEGOCIO.qty en NEGOCIO.size, la Promo Negocio (acá
                // abajo) siempre sale más barata que el 3x2 solo — mostrar el
                // precio de lista del 3x2 en esta fila (ej. $107.200 para 100 en
                // 6 cm) contradecía el "$39.999" del cartel de abajo, dos precios
                // distintos para lo mismo en la misma pantalla. Esta fila muestra
                // el precio con el que en verdad se paga: el de Negocio.
                const esNegocio = n === NEGOCIO.qty && tam.id === NEGOCIO.size;
                const c = esNegocio
                  ? { unitario: Math.round(NEGOCIO.price / NEGOCIO.qty), total: NEGOCIO.price, ahorroPct: NEGOCIO_OFF }
                  : cotizarTanda({ tamano: tam.id, unidades: n, promoActiva: true });
                return (
                  <li key={n} className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-3 py-2 text-sm tabular-nums">
                    <span className="text-white/80 whitespace-nowrap">
                      {n} calcos
                      {esNegocio && <span className="block text-[10px] text-white/40 normal-case">Promo Negocio</span>}
                    </span>
                    <span className="text-white/60 text-right whitespace-nowrap">
                      {formatPrice(c.unitario)} c/u · <strong className="text-white">{formatPrice(c.total)}</strong>
                    </span>
                    <span className="text-emerald-400 font-semibold text-right whitespace-nowrap">−{c.ahorroPct} %</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="font-display font-extrabold text-lg">{NEGOCIO_COPY.titulo}</p>
            <p className="text-sm text-white/65 mt-1">{NEGOCIO_COPY.texto}</p>
          </div>
          <Link to={NEGOCIO_COPY.to} onClick={() => trackWholesaleClick('personalizados')} className="btn-secondary shrink-0">
            {NEGOCIO_COPY.link}
          </Link>
        </div>
      </div>
    </section>
  );
}
