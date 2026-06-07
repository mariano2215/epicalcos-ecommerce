import { Link, useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';

export default function Cart() {
  const { items, setQty, removeItem, subtotal, clear } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="page-gradient min-h-screen">
        <div className="container-app py-20 text-center">
          <div className="text-6xl mb-3">🛒</div>
          <h1 className="font-display font-extrabold text-3xl">Tu carrito está vacío</h1>
          <p className="text-white/60 mt-3">Sumá algunos packs y volvé acá para finalizar.</p>
          <Link to="/productos" className="btn-primary mt-6 inline-flex">Ver productos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <h1 className="font-display font-extrabold text-3xl md:text-4xl">Tu carrito</h1>

        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((it) => (
              <div key={it.id} className="card-glass p-4 flex gap-4">
                <img src={it.image} alt={it.name} className="w-24 h-24 object-cover rounded-2xl" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-white/50 uppercase tracking-wider">{it.categoryLabel}</div>
                      <h3 className="font-semibold">{it.name}</h3>
                    </div>
                    <button onClick={() => removeItem(it.id)} className="text-white/40 hover:text-white">✕</button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
                        onClick={() => setQty(it.id, it.quantity - 1)}
                      >–</button>
                      <span className="w-10 text-center font-semibold">{it.quantity}</span>
                      <button
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
                        onClick={() => setQty(it.id, it.quantity + 1)}
                      >+</button>
                    </div>
                    <span className="font-display font-extrabold">
                      {formatPrice(it.price * it.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={clear} className="btn-ghost">Vaciar carrito</button>
          </div>

          <aside className="card-glass p-6 h-fit sticky top-24">
            <h3 className="font-display font-extrabold text-xl mb-4">Resumen</h3>
            <div className="flex justify-between text-white/70 mb-2">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-white/70 mb-2">
              <span>Envío</span><span>A coordinar</span>
            </div>
            <div className="border-t border-white/10 my-3" />
            <div className="flex justify-between font-display font-extrabold text-lg">
              <span>Total</span><span>{formatPrice(subtotal)}</span>
            </div>
            <button onClick={() => navigate('/checkout')} className="btn-primary w-full mt-5">
              Ir al checkout →
            </button>
            <p className="text-xs text-white/50 mt-3 text-center">
              Vas a poder revisar el pedido antes de pagar.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
