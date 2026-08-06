import { formatPrice } from '../../context/CartContext.jsx';
import { isPromoActive } from '../../config/pricing.js';
import { CANTIDAD, getTamano } from '../../config/personalizados.js';

/**
 * Estado del lote en una línea de texto. Como cada diseño entra SOLO al carrito,
 * el CTA ya no agrega nada: lleva al carrito.
 */
function ctaLabel(resumen, precio, hayCarrito) {
  if (resumen.disenos > 0) return `Ir al carrito · ${formatPrice(resumen.total)}`;
  if (hayCarrito) return 'Ir al carrito';
  if (!precio.configuracionCompleta) return `Elegí ${precio.faltante} para empezar`;
  return 'Subí un diseño para agregarlo';
}

/** Filas "campo → valor" de la especificación elegida. */
function specRows(sel) {
  return [
    ['Tamaño', sel.tamanoLabel],
    ['Corte', sel.corteLabel]
  ].filter(([, v]) => v);
}

/** Copias de CADA diseño (sin mínimo de compra: arranca en 1). */
function SelectorCopias({ copias, onChange, disenos }) {
  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-white/50 text-sm">Copias de cada diseño</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(copias - 1)}
            disabled={copias <= CANTIDAD.min}
            aria-label="Quitar una copia"
            className="btn-ghost !px-3 !py-1 disabled:opacity-30"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={CANTIDAD.min}
            max={CANTIDAD.max}
            value={copias}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Copias de cada diseño"
            className="input-dark !w-16 text-center !py-1"
          />
          <button
            type="button"
            onClick={() => onChange(copias + 1)}
            disabled={copias >= CANTIDAD.max}
            aria-label="Sumar una copia"
            className="btn-ghost !px-3 !py-1 disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>
      <p className="text-[11px] text-white/40 mt-1.5 text-right">
        {disenos > 0
          ? `Se aplica a los ${disenos} diseño${disenos === 1 ? '' : 's'} del pedido.`
          : 'Sin mínimo: podés llevar una sola de cada diseño.'}
      </p>
    </div>
  );
}

/** Lista de los diseños que ya están en el carrito, con su precio. */
function ListaDisenos({ disenos, copias }) {
  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="text-white/50 text-sm mb-2">
        {disenos.length} diseño{disenos.length === 1 ? '' : 's'} en el carrito
      </div>
      <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {disenos.map((d) => {
          const tam = getTamano(d.tamano);
          return (
            <li key={d.fileId} className="flex justify-between gap-3 text-xs">
              <span className="truncate text-white/70" title={d.nombre}>
                {d.nombre}
              </span>
              <span className="shrink-0 text-white/45">
                {tam?.label} · x{copias} · {formatPrice((tam?.precio || 0) * copias)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Tarjeta de resumen (columna sticky en desktop, en el flujo en mobile). */
export default function ResumenPedido({
  precio,
  seleccion,
  disenos,
  resumen,
  copias,
  hayCarrito,
  onCopiasChange,
  onIrAlCarrito
}) {
  const hayDisenos = resumen.disenos > 0;
  return (
    <aside className="card-glass p-5 lg:sticky lg:top-24 h-fit">
      <h3 className="font-display font-extrabold text-lg mb-3">Tu pedido</h3>

      <dl className="space-y-1.5 text-sm">
        {specRows(seleccion).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-white/50">{k}</dt>
            <dd className="text-white text-right font-medium">{v}</dd>
          </div>
        ))}
        {specRows(seleccion).length === 0 && (
          <p className="text-white/40">Elegí las opciones para ver tu calco acá.</p>
        )}
      </dl>
      {precio.configuracionCompleta && (
        <p className="text-[11px] text-white/40 mt-1.5">
          Se aplica a los próximos diseños que subas (los ya agregados mantienen el suyo).
        </p>
      )}

      <SelectorCopias copias={copias} onChange={onCopiasChange} disenos={resumen.disenos} />

      {hayDisenos ? (
        <>
          <ListaDisenos disenos={disenos} copias={copias} />
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="flex justify-between text-white/70 text-sm mb-1">
              <span>Calcos</span>
              <span>{resumen.unidades}</span>
            </div>
            <div className="flex justify-between font-display font-extrabold text-2xl">
              <span>Total</span>
              <span>{formatPrice(resumen.total)}</span>
            </div>
            <p className="text-xs text-white/45 mt-1">Mismo precio que los calcos del catálogo.</p>
          </div>
        </>
      ) : (
        <p className="mt-4 border-t border-white/10 pt-3 text-xs text-white/45">
          Cada diseño que subas se agrega solo al carrito
          {precio.configuracionCompleta ? ` a ${formatPrice(precio.unitario)} c/u` : ''}.
        </p>
      )}

      {isPromoActive() && (
        <p className="mt-4 text-xs text-brand-fuchsia bg-brand-fuchsia/10 border border-brand-fuchsia/25 rounded-lg px-3 py-2">
          🎉 <strong>Promo 3x2</strong>: la promo se aplica en el carrito — cada 3 calcos (contando catálogo + personalizados), la más barata te queda gratis.
        </p>
      )}

      <button
        type="button"
        onClick={onIrAlCarrito}
        disabled={!hayDisenos && !hayCarrito}
        className="btn-primary w-full mt-4"
      >
        {ctaLabel(resumen, precio, hayCarrito)}
      </button>
    </aside>
  );
}

/** Barra compacta fija al borde inferior — solo mobile. */
export function BarraResumenMovil({ resumen, precio, hayCarrito, onIrAlCarrito }) {
  const hayDisenos = resumen.disenos > 0;
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bg-deep/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="container-app flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {hayDisenos ? (
            <>
              <div className="font-display font-extrabold text-lg leading-none">{formatPrice(resumen.total)}</div>
              <div className="text-[11px] text-white/50">
                {resumen.disenos} diseño{resumen.disenos === 1 ? '' : 's'} · {resumen.unidades} calco
                {resumen.unidades === 1 ? '' : 's'}
              </div>
            </>
          ) : (
            <div className="text-xs text-white/60">
              {precio.configuracionCompleta ? 'Subí tus diseños: se agregan solos' : 'Elegí tamaño y corte para empezar'}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onIrAlCarrito}
          disabled={!hayDisenos && !hayCarrito}
          className="btn-primary shrink-0 !py-2.5"
        >
          Ir al carrito
        </button>
      </div>
    </div>
  );
}
