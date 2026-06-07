import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../data/products.js';
import { useCart, formatPrice } from '../context/CartContext.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const product = getProductById(id);
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);

  if (!product) {
    return (
      <div className="page-gradient min-h-screen">
        <div className="container-app py-20 text-center">
          <h1 className="font-display font-extrabold text-3xl">Producto no encontrado</h1>
          <Link to="/productos" className="btn-primary mt-6 inline-flex">Ver catálogo</Link>
        </div>
      </div>
    );
  }

  const buyNow = () => {
    addItem(product, qty);
    navigate('/checkout');
  };

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Link to="/productos" className="btn-ghost mb-6 inline-flex">← Volver al catálogo</Link>

        <div className="grid lg:grid-cols-2 gap-10">
          <div className="card-glass overflow-hidden">
            <img src={product.image} alt={product.name} className="w-full aspect-square object-cover" />
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider text-white/50">{product.categoryLabel}</span>
            <h1 className="font-display font-extrabold text-3xl md:text-5xl mt-2">{product.name}</h1>

            <div className="mt-4">
              <span className="font-display font-extrabold text-3xl"
                style={{
                  backgroundImage: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'
                }}>
                {formatPrice(product.price)}
              </span>
            </div>

            <p className="text-white/70 mt-5 leading-relaxed">{product.description}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {(product.tags || []).map((t) => (
                <span key={t} className="badge badge-soft">#{t}</span>
              ))}
            </div>

            <div className="mt-8 card-glass p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-white/70 text-sm">Cantidad</span>
                <div className="flex items-center gap-2">
                  <button
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >–</button>
                  <span className="w-10 text-center font-semibold">{qty}</span>
                  <button
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
                    onClick={() => setQty((q) => q + 1)}
                  >+</button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => addItem(product, qty)} className="btn-secondary flex-1">
                  Agregar al carrito
                </button>
                <button onClick={buyNow} className="btn-primary flex-1">
                  Comprar ahora →
                </button>
              </div>
            </div>

            <ul className="mt-8 grid grid-cols-2 gap-3 text-sm text-white/70">
              <li className="card-glass p-4">💧 Resistente al agua</li>
              <li className="card-glass p-4">☀️ Resistente al sol</li>
              <li className="card-glass p-4">📦 Producción 2-3 días</li>
              <li className="card-glass p-4">🔒 Pago con Mercado Pago</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
