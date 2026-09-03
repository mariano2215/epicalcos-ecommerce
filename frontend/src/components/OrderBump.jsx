import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { precioVidriera, sizeLabel } from '../config/pricing.js';
import { useTamanoElegido } from '../lib/tamanoElegido.js';
import { cargarManifest, categoriasFuente, elegirUno } from '../lib/sugerencias.js';

/**
 * Order bump del carrito lateral: UN calco concreto para sumar en un toque.
 *
 * POR QUÉ ACÁ Y NO OTRO SuggestedStickers: el cross-sell de 4 cards ya existe
 * en /carrito y en /checkout, pero el drawer —que es lo que se abre en cada "+"
 * de la grilla, o sea la pantalla más vista de toda la compra— no ofrecía nada.
 * El que abre el drawer todavía está eligiendo; mandarlo de vuelta a una grilla
 * de 3.397 diseños para sumar uno más es la fricción que hay que sacar.
 *
 * DIFERENCIAS DELIBERADAS CON SuggestedStickers:
 *
 *  - UNA card, no cuatro. El drawer mide 420 px de ancho (y el 100 % del ancho
 *    en mobile), y el pie tiene que dejar visible el botón de checkout a 375 px.
 *  - SIN selector de tamaño: usa el que ya eligió en la grilla
 *    (lib/tamanoElegido.js). Un order bump con tres decisiones adentro deja de
 *    ser "un click".
 *  - NO rota sola. SuggestedStickers rebaraja cada 7 s porque tiene cuatro
 *    cards y aire alrededor; acá una card que se cambia sola abajo del pulgar
 *    es un click perdido. Se cambia sólo si la persona pide otra.
 *
 * El calco se agrega con `addSticker()`, el MISMO camino que la grilla: la
 * línea es `sticker:{id}:{size}` y el precio lo pone `priceForSize()`. No hay
 * forma de que este componente introduzca un precio que el servidor rechace.
 */

/** Nombre de la superficie en GA4 (ver `listName` en trackAddToCart). */
export const ORDER_BUMP_LIST = 'order_bump_drawer';

export default function OrderBump() {
  const { items, addSticker, digitalOnly } = useCart();
  const [size] = useTamanoElegido();
  const [listas, setListas] = useState(null); // null = todavía cargando
  const [pick, setPick] = useState(null);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  // Categorías del carrito: sugerir más de lo que ya le gustó convierte mejor
  // que sugerir al azar. `cartKey` en vez del array para que el memo no se
  // recalcule en cada render por identidad.
  const cartKey = [...new Set(items.filter((i) => i.type === 'sticker' && i.category).map((i) => i.category))].join(',');

  const fuentes = useMemo(
    () => categoriasFuente(cartKey ? cartKey.split(',') : []),
    [cartKey]
  );

  useEffect(() => {
    let cancelado = false;
    Promise.all(fuentes.map(cargarManifest)).then((ls) => {
      if (!cancelado && vivo.current) setListas(ls.filter((l) => l.length));
    });
    return () => {
      cancelado = true;
    };
  }, [fuentes]);

  // Lo que ya está en el carrito no se ofrece. El id de la línea es
  // `sticker:{stickerId}:{size}`, así que el diseño es el segmento del medio.
  const enCarrito = useMemo(
    () => new Set(items.filter((i) => i.type === 'sticker').map((i) => String(i.id).split(':')[1])),
    [items]
  );

  const otro = useCallback(
    (excluirTambien = []) =>
      setPick(elegirUno(listas, new Set([...enCarrito, ...excluirTambien]))),
    [listas, enCarrito]
  );

  // Primera elección, y reemplazo cuando el que estaba ofrecido entró al carrito.
  useEffect(() => {
    if (!listas) return;
    if (!pick || enCarrito.has(pick.id)) setPick(elegirUno(listas, enCarrito));
  }, [listas, pick, enCarrito]);

  // Un carrito 100 % digital son archivos que llegan por mail: sumarle un calco
  // físico le agrega envío a un pedido que no tenía. No se ofrece.
  if (digitalOnly) return null;
  // Sin nada para ofrecer (o todavía cargando) el bump no ocupa lugar.
  if (!pick) return null;

  const { price, listPrice, enPromo } = precioVidriera(pick.id, size);

  const agregar = () => {
    const agregado = pick.id;
    addSticker(pick, size, 1, {
      // El drawer ya está abierto y la línea aparece en la lista de arriba: esa
      // es la confirmación. El toast va `position: fixed; bottom: 24px` con
      // z-index 100 (ver .toast en styles/index.css), o sea que taparía el
      // botón "Ir al checkout" durante 2,2 s justo después de un click de compra.
      openDrawer: false,
      silent: true,
      listName: ORDER_BUMP_LIST
    });
    // Se ofrece otro en el acto, sin esperar a que el efecto note el cambio:
    // así el hueco no parpadea entre el click y el re-render.
    otro([agregado]);
  };

  return (
    <div className="rounded-xl border border-brand-fuchsia/25 bg-brand-fuchsia/[0.07] p-2.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-widest text-white/50">
          ✨ Sumalo a este pedido
        </span>
        <button
          type="button"
          onClick={() => otro()}
          className="text-[11px] text-white/50 hover:text-white shrink-0 min-h-[44px] -my-3 px-1"
          aria-label="Ver otro calco sugerido"
        >
          🎲 Otro
        </button>
      </div>

      <div className="flex items-center gap-3">
        <img
          src={pick.image}
          alt={pick.name}
          loading="lazy"
          decoding="async"
          width={56}
          height={56}
          className="w-14 h-14 shrink-0 rounded-lg object-contain bg-white/5 p-1"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug truncate">{pick.name}</p>
          <p className="text-[11px] text-white/50 mt-0.5">
            {sizeLabel(size)} ·{' '}
            {enPromo && (
              <span className="line-through text-white/30 mr-1" aria-hidden="true">
                {formatPrice(listPrice)}
              </span>
            )}
            <span className="text-white/70 font-semibold">{formatPrice(price)}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={agregar}
          className="btn-primary shrink-0 !py-2 !px-3.5 !text-xs min-h-[44px]"
          aria-label={`Agregar ${pick.name} en ${sizeLabel(size)} por ${formatPrice(price)}`}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
