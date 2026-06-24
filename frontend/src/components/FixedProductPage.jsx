import { useState } from 'react';
import Breadcrumbs from './Breadcrumbs.jsx';
import { useCart, formatPrice } from '../context/CartContext.jsx';

/**
 * Página de producto de precio fijo (tatuajes / polaroid) con stepper de cantidad.
 * @param {{ product:{id,name,price}, emoji:string, badge:string, title:string,
 *           subtitle:string, bullets:string[], breadcrumb:string }} props
 */
export default function FixedProductPage({ product, emoji, badge, title, subtitle, bullets, breadcrumb }) {
  const { addFixed } = useCart();
  const [qty, setQty] = useState(1);

  const image =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' rx='24' fill='#202020'/><text x='50%' y='52%' font-size='96' text-anchor='middle' dominant-baseline='middle'>${emoji}</text></svg>`
    );

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías', to: '/categorias' }, { name: breadcrumb }]} />

        <div className="grid lg:grid-cols-2 gap-6 items-start mt-6">
          <div className="card-glass aspect-square grid place-items-center text-[8rem]">{emoji}</div>

          <div className="card-glass p-6 md:p-8">
            <span className="badge badge-new mb-3">{badge}</span>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl">{title}</h1>
            <p className="text-white/70 mt-3">{subtitle}</p>

            <div className="mt-5 font-display font-extrabold text-3xl"
              style={{ backgroundImage: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {formatPrice(product.price)}
            </div>

            <ul className="mt-5 space-y-2 text-sm text-white/70">
              {bullets.map((b) => <li key={b}>✅ {b}</li>)}
            </ul>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Restar">–</button>
                <span className="w-10 text-center font-semibold">{qty}</span>
                <button className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10" onClick={() => setQty((q) => q + 1)} aria-label="Sumar">+</button>
              </div>
              <button onClick={() => addFixed({ ...product, image }, qty)} className="btn-primary flex-1">
                Agregar · {formatPrice(product.price * qty)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
