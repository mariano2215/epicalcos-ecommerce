import { Link, useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';

const EDITABLE = new Set(['sticker', 'fixed']);

export default function CartDrawer() {
  const {
    drawerOpen, closeDrawer, items, removeItem, setQty, subtotal, clear,
    bulkEligible, unitsToBulk,
    promoActive, promoFreeUnits, promoSavings, promoUnits, promoToNextFree
  } = useCart();
  const navigate = useNavigate();

  if (!drawerOpen) return null;

  const goCheckout = () => {
    closeDrawer();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-bg-deep border-l border-white/10 flex flex-col">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-display font-extrabold text-xl">Tu carrito</h3>
          <button onClick={closeDrawer} className="btn-ghost text-2xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 && (
            <div className="text-center text-white/60 py-10">
              <div className="text-5xl mb-2">🛒</div>
              <p>Tu carrito está vacío.</p>
              <Link to="/categorias" onClick={closeDrawer} className="btn-primary mt-5 inline-flex">
                Ver categorías
              </Link>
            </div>
          )}

          {items.map((item) => (
            <div key={item.id} className="card-glass p-3 flex gap-3">
              <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-contain bg-white/5 p-1" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm leading-snug">{item.name}</h4>
                  <button onClick={() => removeItem(item.id)} className="text-white/40 hover:text-white text-sm" aria-label="Quitar">
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {EDITABLE.has(item.type) ? (
                    <>
                      <button className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10" onClick={() => setQty(item.id, item.quantity - 1)} aria-label="Restar">–</button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10" onClick={() => setQty(item.id, item.quantity + 1)} aria-label="Sumar">+</button>
                    </>
                  ) : (
                    <span className="text-xs text-white/50">x{item.quantity}</span>
                  )}
                  <span className="ml-auto font-semibold text-sm">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="p-5 border-t border-white/10 space-y-3">
            {promoActive && promoFreeUnits > 0 && (
              <div className="text-xs text-emerald-400">
                🎉 Promo 3x2: {promoFreeUnits} calco{promoFreeUnits === 1 ? '' : 's'} gratis — ahorrás {formatPrice(promoSavings)}.
              </div>
            )}
            {promoActive && promoFreeUnits === 0 && promoUnits > 0 && promoToNextFree > 0 && (
              <div className="text-xs text-white/50">
                Sumá {promoToNextFree} calco{promoToNextFree === 1 ? '' : 's'} y llevás 1 gratis (promo 3x2).
              </div>
            )}
            {bulkEligible ? (
              <div className="text-xs text-emerald-400">🎉 10% off pagando por transferencia bancaria.</div>
            ) : unitsToBulk > 0 ? (
              <div className="text-xs text-white/50">Sumá {unitsToBulk} calco{unitsToBulk === 1 ? '' : 's'} más para el 10% off por transferencia.</div>
            ) : null}
            <div className="flex justify-between text-white/70 text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {promoActive && promoSavings > 0 && (
              <div className="flex justify-between text-emerald-400 text-sm">
                <span>Promo 3x2</span>
                <span>−{formatPrice(promoSavings)}</span>
              </div>
            )}
            <div className="flex justify-between font-display font-extrabold text-lg">
              <span>Total</span>
              <span>{formatPrice(promoActive ? subtotal - promoSavings : subtotal)}</span>
            </div>
            {promoActive && (
              <p className="text-[11px] text-white/40 leading-snug">
                El cupón EPICA10 y el medio de pago se aplican en el checkout.
              </p>
            )}
            <button onClick={goCheckout} className="btn-primary w-full">
              Ir al checkout →
            </button>
            <button onClick={clear} className="btn-ghost w-full justify-center">Vaciar carrito</button>
          </div>
        )}
      </aside>
    </div>
  );
}
