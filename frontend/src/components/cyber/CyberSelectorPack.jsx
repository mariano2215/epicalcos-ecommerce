import { formatPrice } from '../../lib/formato.js';
import { packSiguiente, porCalco, textoUpsell } from '../../config/epicyber.js';
import { trackSelectPromotion } from '../../lib/analytics.js';

/**
 * Selector de cantidades del armador (spec 036). Cambiar de pack NO remonta el
 * armador: los diseños ya elegidos quedan, y si sobran lo avisa el botón.
 *
 * El upsell es un botón de texto: la persona sigue con su pack sin hacer nada,
 * que es lo que pide RF-15.
 */
export default function CyberSelectorPack({ packs, qty, onElegir, ubicacion }) {
  const actual = packs.find((p) => p.qty === qty);
  const siguiente = actual ? packSiguiente(packs, qty) : null;

  const elegir = (pack, origen) => {
    trackSelectPromotion({ ubicacion: origen, pack });
    onElegir(pack.qty);
  };

  return (
    <div className="card-glass p-4 md:p-5">
      <div className="text-sm font-semibold mb-3">¿Cuántos calcos querés?</div>
      {/* Cuatro columnas en 375 px: siete packs entran en dos filas y los diseños,
          que son el paso que importa, quedan más cerca. */}
      <div className="grid grid-cols-4 gap-2 md:flex md:flex-wrap">
        {packs.map((p) => {
          const activo = p.qty === qty;
          return (
            <button
              key={p.qty}
              type="button"
              aria-pressed={activo}
              onClick={() => elegir(p, ubicacion)}
              className={`min-h-[44px] md:min-w-[84px] rounded-xl border px-2 md:px-3 py-1.5 text-left transition-colors ${
                activo
                  ? 'border-brand-fuchsia bg-brand-fuchsia/15'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              }`}
            >
              <span className="block text-sm font-bold leading-tight">x{p.qty}</span>
              <span className="block text-[11px] text-white/60 leading-tight">{formatPrice(p.price)}</span>
            </button>
          );
        })}
      </div>

      {actual && (
        <p className="mt-3 text-xs text-white/60">
          {formatPrice(porCalco(actual))} por calco.
          {siguiente && (
            <>
              {' '}
              <button
                type="button"
                onClick={() => elegir(siguiente, `${ubicacion}_upsell`)}
                className="min-h-[28px] text-brand-yellow font-semibold underline underline-offset-2"
              >
                {textoUpsell(siguiente, siguiente.price - actual.price)}
              </button>
              <span className="text-white/45"> · {formatPrice(porCalco(siguiente))} por calco</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
