import { useState } from 'react';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { SIZES, DEFAULT_SIZE, priceForSize } from '../config/pricing.js';

/**
 * Card individual de un calco (estilo TiendaNube): elegís tamaño (4/6/9 cm),
 * cantidad y lo agregás al carrito. El 10% por volumen se aplica solo en el carrito.
 *
 * @param {{ id:string, image:string, name:string, category:string, categoryLabel:string }} sticker
 */
export default function StickerCard({ sticker }) {
  const { addSticker } = useCart();
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [qty, setQty] = useState(1);

  const unit = priceForSize(size);

  return (
    <article className="card-glass card-glass-hover overflow-hidden flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-white/[0.03] grid place-items-center p-3">
        <img
          src={sticker.image}
          alt={sticker.name}
          loading="lazy"
          className="max-w-full max-h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-transform duration-500 hover:scale-105"
        />
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-white text-sm leading-snug truncate">{sticker.name}</h3>

        {/* Selector de tamaño */}
        <div className="mt-3 grid grid-cols-3 gap-1.5" role="group" aria-label="Elegir tamaño">
          {SIZES.map((s) => {
            const active = s.id === size;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSize(s.id)}
                aria-pressed={active}
                className={`rounded-xl py-1.5 text-center border transition-colors ${
                  active
                    ? 'border-brand-fuchsia bg-brand-fuchsia/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25'
                }`}
              >
                <span className="block text-xs font-bold leading-none">{s.label}</span>
                <span className="block text-[10px] text-white/50 mt-0.5">{formatPrice(s.price)}</span>
              </button>
            );
          })}
        </div>

        {/* Cantidad + agregar */}
        <div className="mt-auto pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              className="w-9 h-9 grid place-items-center rounded-l-xl text-lg leading-none text-white/70 hover:text-white hover:bg-white/5"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Restar"
            >–</button>
            <span className="text-sm font-semibold tabular-nums">{qty}</span>
            <button
              type="button"
              className="w-9 h-9 grid place-items-center rounded-r-xl text-lg leading-none text-white/70 hover:text-white hover:bg-white/5"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Sumar"
            >+</button>
          </div>
          <button
            type="button"
            onClick={() => addSticker(sticker, size, qty)}
            className="btn-primary w-full !py-2.5 !px-3 text-xs"
          >
            Agregar · {formatPrice(unit * qty)}
          </button>
        </div>
      </div>
    </article>
  );
}
