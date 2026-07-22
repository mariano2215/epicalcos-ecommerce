import { useState } from 'react';
import { formatPrice } from '../../context/CartContext.jsx';
import { isPromoActive } from '../../config/pricing.js';

function ctaLabel(precio) {
  if (!precio.configuracionCompleta) return `Elegí ${precio.faltante} para ver el precio`;
  return `Agregar al carrito · ${formatPrice(precio.total)}`;
}

/** Filas "campo → valor" de la especificación elegida. */
function specRows(sel) {
  return [
    ['Material', sel.materialLabel],
    ['Tamaño', sel.tamanoLabel],
    ['Corte', sel.corteLabel],
    ['Cantidad', sel.cantidad ? `${sel.cantidad} u` : null]
  ].filter(([, v]) => v);
}

/** Desglose "¿Cómo se calcula?" (acordeón). */
function Desglose({ desglose }) {
  const [open, setOpen] = useState(false);
  if (!desglose) return null;
  const { precioTamano, multiplicadorMaterial, factorVolumen, unitarioLista, unitario } = desglose;
  const recargo = Math.round((multiplicadorMaterial - 1) * 100);
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-xs text-white/60 hover:text-white"
      >
        <span>¿Cómo se calcula?</span>
        <span>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <dl className="mt-2 space-y-1 text-xs text-white/60">
          <div className="flex justify-between"><dt>Precio del tamaño</dt><dd>{formatPrice(precioTamano)}</dd></div>
          <div className="flex justify-between">
            <dt>Recargo del material</dt>
            <dd>{recargo > 0 ? `+${recargo}%` : 'sin recargo'}</dd>
          </div>
          <div className="flex justify-between border-t border-white/5 pt-1">
            <dt>Precio de lista (c/u)</dt><dd>{formatPrice(unitarioLista)}</dd>
          </div>
          <div className="flex justify-between text-emerald-400">
            <dt>Descuento por volumen</dt>
            <dd>×{factorVolumen}{unitarioLista > unitario ? ` (−${formatPrice(unitarioLista - unitario)})` : ''}</dd>
          </div>
          <div className="flex justify-between font-semibold text-white border-t border-white/5 pt-1">
            <dt>Unitario final</dt><dd>{formatPrice(unitario)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

/** Tarjeta de resumen (columna sticky en desktop, en el flujo en mobile). */
export default function ResumenPedido({ precio, seleccion, onAdd }) {
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
          {precio.porcentajeAhorro > 0 && (
            <p className="text-xs text-emerald-400 mt-1">
              {precio.porcentajeAhorro}% off por volumen · ahorrás {formatPrice(precio.ahorro)}
            </p>
          )}
          <Desglose desglose={precio.desglose} />
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
              <div className="text-[11px] text-white/50">{formatPrice(precio.unitario)} c/u</div>
            </>
          ) : (
            <div className="text-xs text-white/60">Completá la config para ver el precio</div>
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
