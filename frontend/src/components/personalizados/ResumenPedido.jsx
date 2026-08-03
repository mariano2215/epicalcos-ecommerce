import { formatPrice } from '../../context/CartContext.jsx';
import { isPromoActive } from '../../config/pricing.js';
import { CANTIDAD } from '../../config/personalizados.js';

function ctaLabel(precio) {
  if (!precio.configuracionCompleta) return `Elegí ${precio.faltante} para ver el precio`;
  return `Agregar al carrito · ${formatPrice(precio.total)}`;
}

/** Filas "campo → valor" de la especificación elegida. */
function specRows(sel) {
  return [
    ['Tamaño', sel.tamanoLabel],
    ['Corte', sel.corteLabel]
  ].filter(([, v]) => v);
}

/** Cantidad: SIN mínimo de compra, arranca en 1. Stepper + input libre. */
function SelectorCantidad({ cantidad, onChange }) {
  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-white/50 text-sm">Cantidad</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(cantidad - 1)}
            disabled={cantidad <= CANTIDAD.min}
            aria-label="Quitar una unidad"
            className="btn-ghost !px-3 !py-1 disabled:opacity-30"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={CANTIDAD.min}
            max={CANTIDAD.max}
            value={cantidad}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Cantidad de calcos"
            className="input-dark !w-16 text-center !py-1"
          />
          <button
            type="button"
            onClick={() => onChange(cantidad + 1)}
            disabled={cantidad >= CANTIDAD.max}
            aria-label="Sumar una unidad"
            className="btn-ghost !px-3 !py-1 disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>
      <p className="text-[11px] text-white/40 mt-1.5 text-right">Sin mínimo: podés llevar una sola.</p>
    </div>
  );
}

/** Tarjeta de resumen (columna sticky en desktop, en el flujo en mobile). */
export default function ResumenPedido({ precio, seleccion, cantidad, onCantidadChange, onAdd }) {
  const completa = precio.configuracionCompleta;
  return (
    <aside className="card-glass p-5 lg:sticky lg:top-24 h-fit">
      <h3 className="font-display font-extrabold text-lg mb-3">Tu calco</h3>

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

      <SelectorCantidad cantidad={cantidad} onChange={onCantidadChange} />

      {completa && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="flex justify-between text-white/70 text-sm mb-1">
            <span>Precio por unidad</span>
            <span>{formatPrice(precio.unitario)}</span>
          </div>
          <div className="flex justify-between font-display font-extrabold text-2xl">
            <span>Total</span>
            <span>{formatPrice(precio.total)}</span>
          </div>
          <p className="text-xs text-white/45 mt-1">Mismo precio que los calcos del catálogo.</p>
        </div>
      )}

      {isPromoActive() && (
        <p className="mt-4 text-xs text-brand-fuchsia bg-brand-fuchsia/10 border border-brand-fuchsia/25 rounded-lg px-3 py-2">
          🎉 <strong>Promo 3x2</strong>: la promo se aplica en el carrito — cada 3 calcos (contando catálogo + personalizados), la más barata te queda gratis.
        </p>
      )}

      <button
        type="button"
        onClick={onAdd}
        disabled={!completa}
        className="btn-primary w-full mt-4"
      >
        {ctaLabel(precio)}
      </button>
    </aside>
  );
}

/** Barra compacta fija al borde inferior — solo mobile. */
export function BarraResumenMovil({ precio, onAdd }) {
  const completa = precio.configuracionCompleta;
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bg-deep/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="container-app flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {completa ? (
            <>
              <div className="font-display font-extrabold text-lg leading-none">{formatPrice(precio.total)}</div>
              <div className="text-[11px] text-white/50">
                {formatPrice(precio.unitario)} c/u · {precio.cantidad} u
              </div>
            </>
          ) : (
            <div className="text-xs text-white/60">Elegí tamaño y corte para ver el precio</div>
          )}
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={!completa}
          className="btn-primary shrink-0 !py-2.5"
        >
          {completa ? 'Agregar' : `Elegí ${precio.faltante}`}
        </button>
      </div>
    </div>
  );
}
