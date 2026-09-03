import { SIZES, PROMO_ARGENTINA, esCategoriaEnPromoArgentina, round } from '../config/pricing.js';
import { formatPrice } from '../context/CartContext.jsx';
import { useTamanoElegido } from '../lib/tamanoElegido.js';
import { usoCorto } from '../lib/usosPorTamano.js';

/**
 * Selector de tamaño de la grilla: una sola vez para toda la categoría, en vez
 * de tres botones repetidos en cada card (ver lib/tamanoElegido.js).
 *
 * A propósito NO es pegajoso: el header ya ocupa 177 px fijos en mobile (22 %
 * de la pantalla) y sumarle otra barra clavada iría en contra de lo único que
 * importa acá, que es ver diseños. La elección se hace una vez al entrar y se
 * recuerda hasta en la próxima visita.
 *
 * CADA BOTÓN DICE PARA QUÉ SIRVE SU TAMAÑO ("Termo · notebook"). Antes decía
 * sólo "6 cm · $1.600", y quien nunca compró un calco no tiene forma de saber
 * si 6 cm le sirve para un termo — la respuesta existía en SizeGuide, pero ese
 * componente vive en la ficha de producto y en las landings, o sea NO en la
 * pantalla donde se toca "+". Los textos salen de lib/usosPorTamano.js, que es
 * la misma fuente que lee la guía.
 */
export default function SizePicker({ className = '', categoria }) {
  const [size, setSize] = useTamanoElegido();
  // En la categoría en promo, los precios del selector son los de la promo: si
  // mostrara los de lista contradiría a las cards que tiene justo abajo.
  const enPromo = esCategoriaEnPromoArgentina(categoria);
  const precioDe = (s) => (enPromo ? round(s.price * (1 - PROMO_ARGENTINA.discount)) : s.price);

  return (
    <div className={`card-glass p-3 flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <span className="text-[10px] uppercase tracking-widest text-white/40">Tamaño</span>
      <div className="flex gap-1.5 flex-1" role="group" aria-label="Elegir tamaño de los calcos">
        {SIZES.map((s) => {
          const active = s.id === size;
          const uso = usoCorto(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSize(s.id)}
              aria-pressed={active}
              // `aria-label` completo: leído a secas, el botón dice "6 cm
              // $1.600 Termo · notebook" en tres nodos sueltos.
              aria-label={`${s.label}, ${formatPrice(precioDe(s))}${uso ? `, ideal para ${uso.replace(' · ', ' o ')}` : ''}`}
              className={`flex-1 min-h-[44px] px-1.5 py-1.5 rounded-xl border flex flex-col items-center justify-center leading-none transition-colors ${
                active
                  ? 'border-brand-fuchsia bg-brand-fuchsia/15 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25'
              }`}
            >
              <span className="text-xs font-bold">{s.label}</span>
              <span className="text-[10px] text-white/50 mt-0.5">
                {formatPrice(precioDe(s))}
                {enPromo && (
                  <span className="ml-1 line-through text-white/30">{formatPrice(s.price)}</span>
                )}
              </span>
              {/* `text-[9px]` y `leading-tight`: a 375 px cada botón mide
                  ~110 px y "Termo · notebook" tiene que entrar sin partir la
                  fila. Es decorativo — el aria-label de arriba ya lo dice. */}
              {uso && (
                <span
                  className="text-[9px] text-white/35 mt-1 leading-tight text-center"
                  aria-hidden="true"
                >
                  {uso}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="basis-full text-[11px] text-white/40 leading-snug">
        {enPromo
          ? `${PROMO_ARGENTINA.titulo} — ya aplicado. Se agrega a todos los calcos que sumes; podés mezclar tamaños volviendo a cambiarlo.`
          : 'Se aplica a todos los calcos que agregues. Podés mezclar tamaños volviendo a cambiarlo.'}
      </p>
    </div>
  );
}
