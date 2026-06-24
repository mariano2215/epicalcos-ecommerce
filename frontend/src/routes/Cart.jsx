import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { trackViewCart } from '../lib/analytics.js';
import { useSeo } from '../lib/seo.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';

const EDITABLE = new Set(['sticker', 'fixed']);

export default function Cart() {
  const { items, setQty, removeItem, subtotal, clear, bulkActive, unitsToBulk, bulkSavings } = useCart();
  const navigate = useNavigate();

  useSeo({ title: 'Carrito', description: 'Revisá tu pedido antes de pagar con Mercado Pago.' });

  useEffect(() => {
    if (items.length > 0) trackViewCart(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <div className="page-gradient min-h-screen">
        <div className="container-app py-20 text-center">
          <div className="text-6xl mb-3">🛒</div>
          <h1 className="font-display font-extrabold text-3xl">Tu carrito está vacío</h1>
          <p className="text-white/60 mt-3">Sumá tus calcos favoritos y volvé acá para finalizar.</p>
          <Link to="/categorias" className="btn-primary mt-6 inline-flex">Ver categorías</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Carrito' }]} />
        <h1 className="font-display font-extrabold text-3xl md:text-4xl">Tu carrito</h1>

        {/* Banner de descuento por volumen */}
        {bulkActive ? (
          <div className="mt-4 rounded-xl p-3 text-sm border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            🎉 ¡10% de descuento por volumen aplicado! Estás ahorrando {formatPrice(bulkSavings)}.
          </div>
        ) : unitsToBulk > 0 ? (
          <div className="mt-4 rounded-xl p-3 text-sm border border-white/10 bg-white/5 text-white/70">
            Sumá {unitsToBulk} calco{unitsToBulk === 1 ? '' : 's'} más y obtené <strong className="text-white">10% off</strong> en los calcos sueltos.
          </div>
        ) : null}

        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-4">
            {items.map((it) => (
              <div key={it.id} className="card-glass p-4 flex gap-4">
                <img src={it.image} alt={it.name} className="w-24 h-24 object-contain bg-white/5 rounded-2xl p-1" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {it.categoryLabel && (
                        <div className="text-xs text-white/50 uppercase tracking-wider">{it.categoryLabel}</div>
                      )}
                      <h3 className="font-semibold">{it.name}</h3>
                      {(it.meta?.items?.length > 0 || it.meta?.customCount > 0) && (
                        <div className="text-xs text-white/50 mt-1">
                          {it.meta.items?.length > 0 && `${it.meta.items.length} diseño(s) del catálogo`}
                          {it.meta.items?.length > 0 && it.meta.customCount > 0 ? ' + ' : ''}
                          {it.meta.customCount > 0 ? `${it.meta.customCount} propio(s)` : ''}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeItem(it.id)} className="text-white/40 hover:text-white" aria-label="Quitar">✕</button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {EDITABLE.has(it.type) ? (
                      <div className="flex items-center gap-2">
                        <button className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10" onClick={() => setQty(it.id, it.quantity - 1)} aria-label="Restar">–</button>
                        <span className="w-10 text-center font-semibold">{it.quantity}</span>
                        <button className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10" onClick={() => setQty(it.id, it.quantity + 1)} aria-label="Sumar">+</button>
                      </div>
                    ) : (
                      <span className="text-sm text-white/60">{it.quantity} unidad{it.quantity === 1 ? '' : 'es'}</span>
                    )}
                    <span className="font-display font-extrabold">{formatPrice(it.price * it.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={clear} className="btn-ghost">Vaciar carrito</button>
          </div>

          <aside className="card-glass p-6 h-fit lg:sticky lg:top-24">
            <h3 className="font-display font-extrabold text-xl mb-4">Resumen</h3>
            <div className="flex justify-between text-white/70 mb-2">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            {bulkSavings > 0 && (
              <div className="flex justify-between text-emerald-400 text-sm mb-2">
                <span>Descuento 10%</span><span>incluido</span>
              </div>
            )}
            <div className="flex justify-between text-white/70 mb-2">
              <span>Envío</span><span className="text-white/50">Se calcula en el checkout</span>
            </div>
            <div className="border-t border-white/10 my-3" />
            <div className="flex justify-between font-display font-extrabold text-lg">
              <span>Total</span><span>{formatPrice(subtotal)}</span>
            </div>
            <button onClick={() => navigate('/checkout')} className="btn-primary w-full mt-5">
              Ir al checkout →
            </button>
            <p className="text-xs text-white/50 mt-3 text-center">
              🔒 Vas a pagar de forma segura con Mercado Pago.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
