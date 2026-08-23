import { Link } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { precioVidriera, sizeLabel } from '../config/pricing.js';
import { useTamanoElegido } from '../lib/tamanoElegido.js';
import { trackSelectItem } from '../lib/analytics.js';

/**
 * Card de un calco en la grilla. Compacta a propósito.
 *
 * Antes traía selector de tamaño (3 botones), contador de cantidad y botón de
 * agregar: 379 px de alto, con la imagen ocupando menos de la mitad de su
 * propia card. En mobile entraban ~3 diseños por pantalla sobre 254.
 *
 * Ahora la card es la IMAGEN, que es lo que vende un calco. El tamaño se elige
 * una vez para toda la grilla (ver SizePicker + lib/tamanoElegido.js) y la
 * cantidad se resuelve tocando "+" las veces que haga falta —o desde el
 * carrito—, que es más rápido que un stepper de 44 px por card.
 *
 * @param {{ id:string, image:string, name:string, category:string, categoryLabel:string }} sticker
 */
export default function StickerCard({ sticker, listName = 'catalog', mostrarTamano = false }) {
  const { addSticker, items } = useCart();
  const [size] = useTamanoElegido();

  // Precio de vidriera: durante la promo de Argentina, la mitad. Sin esto la
  // grilla anunciaría $1.600 mientras el carrito cobra $800.
  const { price: unit, listPrice, enPromo } = precioVidriera(sticker.id, size);
  const href = `/producto/${sticker.category}/${sticker.id.split('-').pop()}`;

  // Cuántas ya lleva de ESTE diseño en ESTE tamaño. Sin el contador, tocar "+"
  // tres veces no tiene ninguna devolución visible en la grilla.
  const enCarrito = items.find((i) => i.id === `sticker:${sticker.id}:${size}`)?.quantity || 0;

  // Click desde la grilla a la ficha: cierra el par view_item_list → select_item.
  const onSelect = () => trackSelectItem({ ...sticker, price: unit }, listName);

  return (
    <article className="card-glass card-glass-hover overflow-hidden flex flex-col">
      <Link
        to={href}
        onClick={onSelect}
        aria-label={`Ver ${sticker.name}`}
        className="relative aspect-square overflow-hidden bg-white/[0.03] grid place-items-center p-2"
      >
        <img
          src={sticker.image}
          alt={sticker.name}
          loading="lazy"
          decoding="async"
          /* Los recortes del catálogo son cuadrados de 320 px: con el tamaño
             declarado el navegador reserva el lugar antes de bajarlos y la
             grilla no salta (CLS). El contenedor ya fija el aspect-square, así
             que las clases mandan sobre estos números. */
          width={320}
          height={320}
          /* `w-full h-full`, NO `max-w-full max-h-full`. Con los max-*, un calco
             más alto que ancho se renderizaba a 165×205 px dentro de una caja de
             165×165 y `overflow-hidden` le cortaba la cabeza y los pies: el
             `max-height: 100%` no resolvía contra el alto que deriva del
             `aspect-square`. Con la imagen ocupando la caja exacta, `object-contain`
             hace el letterbox adentro y NADA puede desbordar, sea cual sea la
             proporción del archivo. El `p-2` del contenedor deja 8 px por lado,
             más que los 4 px que se come el `scale-105` del hover. */
          className="w-full h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-transform duration-500 hover:scale-105"
        />
        {enCarrito > 0 && (
          <span
            className="absolute top-1.5 left-1.5 min-w-[22px] h-[22px] px-1.5 grid place-items-center rounded-full bg-brand-fuchsia text-white text-[11px] font-bold tabular-nums shadow-lg"
            aria-hidden
          >
            {enCarrito}
          </span>
        )}
      </Link>

      {/* El nombre va en su propia línea: compartiendo fila con el botón le
          quedaban ~50 px y se truncaba en "Anime…", comiéndose el número, que
          es lo único que distingue un diseño de otro. */}
      <div className="px-2 pb-2 pt-1.5">
        {/* `mostrarTamano` solo donde NO hay SizePicker arriba (el Home): ahí el
            precio depende de lo que la persona eligió antes y sin el dato sería
            un número sin explicación. En la grilla de categoría el selector ya
            lo dice, y meterlo acá le robaba ancho al nombre — "Argentina #129"
            truncaba a "Argentin…" y se perdía el número, que es lo único que
            distingue un diseño de otro. */}
        <div className="flex items-baseline gap-1">
          <h3 className="text-[11px] sm:text-xs text-white/60 leading-tight truncate flex-1 min-w-0">
            <Link to={href} onClick={onSelect} className="hover:text-brand-fuchsia transition-colors">
              {sticker.name}
            </Link>
          </h3>
          {mostrarTamano && (
            <span className="shrink-0 text-[10px] text-white/35 tabular-nums">{sizeLabel(size)}</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-1">
          <p className="text-xs sm:text-sm font-bold text-white leading-none tabular-nums min-w-0">
            {formatPrice(unit)}
            {enPromo && (
              <span className="block text-[10px] font-normal text-white/40 line-through leading-none mt-0.5">
                {formatPrice(listPrice)}
              </span>
            )}
          </p>

          {/* `openDrawer: false` — tocando "+" varias veces seguidas, abrir el
              carrito en cada toque tapa la grilla y corta la elección. El toast
              y el contador sobre la imagen alcanzan como devolución. */}
          <button
            type="button"
            onClick={() => addSticker(sticker, size, 1, { openDrawer: false })}
            aria-label={
              enCarrito > 0
                ? `Agregar otro ${sticker.name} de ${sizeLabel(size)} (llevás ${enCarrito})`
                : `Agregar ${sticker.name} de ${sizeLabel(size)} al carrito`
            }
            className="shrink-0 -my-1.5 -mr-1 w-11 h-11 grid place-items-center text-white/80 hover:text-white active:scale-95 transition"
          >
            <span
              className="w-8 h-8 grid place-items-center rounded-lg bg-brand-fuchsia/15 border border-brand-fuchsia/40 text-base leading-none font-bold"
              aria-hidden
            >
              +
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
