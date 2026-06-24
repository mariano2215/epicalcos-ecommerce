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
        <div className="mt-3 flex items-center gap-2 mt-auto pt-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Restar"
            >–</button>
            <span className="w-7 text-center text-sm font-semibold">{qty}</span>
            <button
              type="button"
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Sumar"
            >+</button>
          </div>
          <button
            type="button"
            onClick={() => addSticker(sticker, size, qty)}
            className="btn-primary !py-2 !px-3 text-xs flex-1"
          >
            Agregar · {formatPrice(unit * qty)}
          </button>
        </div>
      </div>
    </article>
  );
}
