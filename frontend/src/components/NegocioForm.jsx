import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { NEGOCIO } from '../config/pricing.js';
import { contact } from '../config/site.js';

const NEGOCIO_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' rx='24' fill='#202020'/><text x='50%' y='52%' font-size='72' text-anchor='middle' dominant-baseline='middle'>🏪</text></svg>`
  );

/**
 * Promo Negocio: 100 calcos de un solo diseño (el logo del cliente) en 6 cm a $40.000.
 * El logo se coordina por WhatsApp después de la compra.
 */
export default function NegocioForm() {
  const { addNegocio } = useCart();
  const navigate = useNavigate();
  const [business, setBusiness] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!business.trim()) {
      setError('Poné el nombre de tu negocio');
      return;
    }
    addNegocio({
      id: `negocio:${Date.now()}`,
      name: `Negocio · ${business.trim()} · 100u 6 cm`,
      categoryLabel: 'Negocio',
      image: NEGOCIO_IMG,
      size: NEGOCIO.size,
      basePrice: NEGOCIO.price,
      quantity: 1,
      meta: { business: business.trim(), qty: NEGOCIO.qty, size: NEGOCIO.size }
    });
    navigate('/carrito');
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="card-glass p-6 md:p-8">
        <span className="badge badge-new mb-3">Para tu negocio</span>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl">Promo Negocio</h1>
        <p className="text-white/70 mt-3">
          <strong className="text-white">100 calcos</strong> de un solo diseño (tu logo o el arte de tu
          marca) en <strong className="text-white">6 cm</strong> por{' '}
          <span className="font-display font-extrabold text-2xl"
            style={{ backgroundImage: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            {formatPrice(NEGOCIO.price)}
          </span>
          .
        </p>
        <ul className="mt-5 space-y-2 text-sm text-white/70">
          <li>✅ Ideal para bares, kioscos, peluquerías, marcas y emprendimientos.</li>
          <li>✅ Vinilo premium resistente al agua y al sol.</li>
          <li>✅ Tu logo lo mandás por WhatsApp después de pagar.</li>
        </ul>
      </div>

      <form onSubmit={submit} className="card-glass p-6 md:p-8 space-y-5">
        <h3 className="font-display font-extrabold text-xl">Pedí tu promo</h3>
        <label className="block">
          <span className="text-sm text-white/70 mb-1.5 block">Nombre del negocio / marca *</span>
          <input
            type="text"
            value={business}
            onChange={(e) => { setBusiness(e.target.value); setError(''); }}
            placeholder="Ej: Bar La Esquina"
            className="input-dark"
          />
          {error && <span className="text-xs text-brand-pink mt-1 block">{error}</span>}
        </label>

        <div className="rounded-xl p-4 border border-white/10 bg-white/5 text-sm space-y-1.5">
          <div className="flex justify-between"><span className="text-white/60">Cantidad</span><span>100 calcos</span></div>
          <div className="flex justify-between"><span className="text-white/60">Tamaño</span><span>6 cm</span></div>
          <div className="flex justify-between"><span className="text-white/60">Diseño</span><span>1 (tu logo)</span></div>
          <div className="flex justify-between font-display font-extrabold text-lg pt-1">
            <span>Total</span><span>{formatPrice(NEGOCIO.price)}</span>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full">Agregar al carrito →</button>
        <p className="text-xs text-white/50 text-center">
          Después del pago coordinamos tu logo por WhatsApp ({contact.whatsappDisplay}).
        </p>
      </form>
    </div>
  );
}
