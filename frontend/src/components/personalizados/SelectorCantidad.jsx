import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CANTIDAD, TAMANOS, PACK_HOLOGRAFICO, RECARGO_HOLOGRAFICO } from '../../config/personalizados.js';
import { CANTIDAD_COPY, NEGOCIO_COPY } from '../../config/personalizadosLanding.js';
import { formatPrice } from '../../lib/formato.js';
import { trackPersonalizedQuantitySelected, trackWholesaleClick } from '../../lib/analytics.js';

const precioDesde = Math.min(...TAMANOS.map((t) => t.precio));
const precioPackHolografico = PACK_HOLOGRAFICO.precio + RECARGO_HOLOGRAFICO.precio;

/**
 * Cantidad y precio (RF-Q1…Q5, RF-L13).
 *
 * `cotizacion` viene de `cotizarTanda()`: el "ahorrás" se calcula con la MISMA
 * regla y el MISMO redondeo que el servidor, y solo aparece si hay un beneficio
 * real y vigente (hoy, el 3x2). Sin promo no se muestra ningún descuento.
 *
 * La cantidad de los atajos se trackea al toque; la del −/+ y la tipeada, cuando
 * el cliente deja de tocar (si no, un "50" tipeado serían dos eventos: 5 y 50).
 *
 * Con Vinilo Holográfico (`cotizacion.esHolografico`, enmienda 26/9/2026) no
 * hay cantidad que elegir: es un pack de 100 en total, repartidas entre los
 * diseños (RF-MAT11, MAT14). Se ocultan el −/+, los atajos y todo lo del 3x2,
 * que el pack no tiene (RF-MAT15).
 */
export default function SelectorCantidad({ copias, disenos, tamano, cotizacion, promoActiva, conviene, onCopias }) {
  const [texto, setTexto] = useState(String(copias));
  const asentar = useRef(null);

  useEffect(() => setTexto(String(copias)), [copias]);
  useEffect(() => () => clearTimeout(asentar.current), []);

  const cambiar = (n, { inmediato = false } = {}) => {
    const v = Math.min(CANTIDAD.max, Math.max(CANTIDAD.min, Math.floor(Number(n) || CANTIDAD.min)));
    onCopias(v);
    clearTimeout(asentar.current);
    if (inmediato) trackPersonalizedQuantitySelected(v);
    else asentar.current = setTimeout(() => trackPersonalizedQuantitySelected(v), 800);
  };

  const c = cotizacion;
  const variosDisenos = disenos > 1;
  const esPack = Boolean(c.esHolografico);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display font-extrabold text-sm" id="titulo-cantidad">
          {CANTIDAD_COPY.titulo}
        </span>
        {variosDisenos && !esPack && <span className="text-[11px] text-white/50">copias de cada diseño</span>}
      </div>

      {esPack ? (
        <p className="mt-3 text-sm text-white/80">
          <strong className="text-white">{CANTIDAD_COPY.packHolografico(c.unidades)}</strong>
          {variosDisenos && <> {CANTIDAD_COPY.packHolograficoReparto(disenos)}</>}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => cambiar(copias - 1)}
              disabled={copias <= CANTIDAD.min}
              aria-label="Una menos"
              className="w-11 h-11 rounded-full border border-white/15 text-xl leading-none disabled:opacity-30 hover:border-white/40"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={CANTIDAD.min}
              max={CANTIDAD.max}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                if (e.target.value !== '') cambiar(e.target.value);
              }}
              onBlur={() => setTexto(String(copias))}
              aria-labelledby="titulo-cantidad"
              className="input-dark !w-20 h-11 text-center !py-0 font-semibold tabular-nums"
            />
            <button
              type="button"
              onClick={() => cambiar(copias + 1)}
              disabled={copias >= CANTIDAD.max}
              aria-label="Una más"
              className="w-11 h-11 rounded-full border border-white/15 text-xl leading-none disabled:opacity-30 hover:border-white/40"
            >
              +
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2" role="group" aria-label="Cantidades rápidas">
            {CANTIDAD_COPY.atajos.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => cambiar(n, { inmediato: true })}
                aria-pressed={copias === n}
                className={`min-w-[44px] min-h-[44px] px-3 rounded-full text-sm border transition-colors ${
                  copias === n ? 'border-brand-fuchsia bg-brand-fuchsia/15 text-white' : 'border-white/10 text-white/70 hover:border-white/30'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
        {c.configuracionCompleta ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-white/60 text-sm">
                Total · {c.unidades} calco{c.unidades === 1 ? '' : 's'}
                {/* Enmienda 22/9/2026 ("topear el precio en $39.999"): un solo diseño en
                    6 cm cuyas copias ya cuestan lo mismo o más pasa a cobrarse como la
                    Promo Negocio — nunca más caro que tomarla. Se aclara acá para que
                    no se lea como un 3x2 con un % raro. */}
                {c.esNegocio && (
                  <span className="block text-[10px] text-white/40 normal-case">
                    {CANTIDAD_COPY.etiquetaNegocio(c.packsNegocio, c.sueltas)}
                  </span>
                )}
                {esPack && <span className="block text-[10px] text-white/40 normal-case">{CANTIDAD_COPY.packHolograficoEtiqueta}</span>}
              </span>
              <span className="font-display font-extrabold text-3xl tabular-nums" aria-live="polite">
                {formatPrice(c.total)}
              </span>
            </div>
            {c.recargo > 0 && (
              // RF-MAT4/5 (enmienda 22/9/2026): el recargo se ve como su propio
              // concepto, no mezclado en el unitario de arriba.
              <div className="flex items-baseline justify-between gap-3 text-xs mt-1">
                <span className="text-white/50">Incluye recargo Vinilo Holográfico</span>
                <span className="text-white/70 tabular-nums">+{formatPrice(c.recargo)}</span>
              </div>
            )}
            {c.ahorro > 0 && (
              <div className="flex items-baseline justify-between gap-3 text-sm mt-1">
                <span className="text-white/65 tabular-nums">{formatPrice(c.unitario)} por unidad</span>
                <span className="text-emerald-400 font-semibold">Ahorrás {c.ahorroPct} %</span>
              </div>
            )}
            {!c.esNegocio && !esPack && promoActiva && c.faltanParaGratis > 0 && (
              <p className="text-xs text-brand-yellow mt-2">
                Sumá {c.faltanParaGratis} calco{c.faltanParaGratis === 1 ? '' : 's'} más y una te sale gratis (3x2).
              </p>
            )}
            {!c.esNegocio && !esPack && promoActiva && (
              <p className="text-[11px] text-white/40 mt-1">El 3x2 se aplica en el carrito sobre todas tus calcos.</p>
            )}
          </>
        ) : (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-white/60 text-sm">{tamano ? '' : 'Elegí el tamaño para ver el total'}</span>
            {esPack ? (
              <span className="text-sm text-white/80">
                <strong className="font-display text-lg">{formatPrice(precioPackHolografico)}</strong> por {PACK_HOLOGRAFICO.qty}
              </span>
            ) : (
              <span className="text-sm text-white/80">
                Desde <strong className="font-display text-lg">{formatPrice(precioDesde)}</strong> c/u
              </span>
            )}
          </div>
        )}
      </div>

      {conviene && (
        <p className="mt-3 text-xs text-white/70 rounded-2xl border border-white/10 px-4 py-3">
          <strong className="text-white">{NEGOCIO_COPY.titulo}</strong> {NEGOCIO_COPY.texto}{' '}
          <Link
            to={NEGOCIO_COPY.to}
            onClick={() => trackWholesaleClick('personalizados')}
            className="underline decoration-white/40 underline-offset-2 hover:text-white whitespace-nowrap"
          >
            {NEGOCIO_COPY.link}
          </Link>
        </p>
      )}
    </div>
  );
}
