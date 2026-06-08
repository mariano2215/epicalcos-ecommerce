import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../data/products.js';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import RelatedProducts from '../components/RelatedProducts.jsx';
import StickyMobileBar from '../components/StickyMobileBar.jsx';
import { trackViewItem } from '../lib/analytics.js';
import { useSeo, productJsonLd, breadcrumbJsonLd } from '../lib/seo.js';

export default function ProductDetail() {
  const { id } = useParams();
  const product = getProductById(id);
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);

  // SEO siempre se llama (con product undefined entrega defaults)
  useSeo({
    title: product?.name,
    description: product?.description,
    image: product?.image,
    type: 'product',
    jsonLd: product
      ? {
          '@context': 'https://schema.org',
          '@graph': [
            productJsonLd(product),
            breadcrumbJsonLd([
              { name: 'Inicio', url: '/' },
              { name: 'Tienda', url: '/productos' },
              { name: product.categoryLabel, url: `/categoria/${product.category}` },
              { name: product.name, url: `/producto/${product.id}` }
            ])
          ]
        }
      : undefined
  });

  useEffect(() => {
    if (product) trackViewItem(product);
  }, [product?.id]);

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
    <div className="page-gradient min-h-screen pb-24 sm:pb-0">
      <div className="container-app py-10">
        <Breadcrumbs
          items={[
            { name: 'Inicio', to: '/' },
            { name: 'Tienda', to: '/productos' },
            { name: product.categoryLabel, to: `/categoria/${product.category}` },
            { name: product.name }
          ]}
        />

        <div className="grid lg:grid-cols-2 gap-10">
          <div className="card-glass overflow-hidden">
            <img src={product.image} alt={product.name} className="w-full aspect-square object-cover" />
          </div>

          <div>
            <Link to={`/categoria/${product.category}`} className="text-xs uppercase tracking-wider text-white/50 hover:text-white/80">
              {product.categoryLabel}
            </Link>
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
                    aria-label="Restar"
                  >–</button>
                  <span className="w-10 text-center font-semibold">{qty}</span>
                  <button
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
                    onClick={() => setQty((q) => q + 1)}
                    aria-label="Sumar"
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

        <RelatedProducts currentProduct={product} />
      </div>

      <StickyMobileBar product={product} onAdd={() => addItem(product, qty)} onBuyNow={buyNow} />
    </div>
  );
}
