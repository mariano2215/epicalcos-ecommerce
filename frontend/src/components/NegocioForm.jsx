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

/** % de descuento contra el precio de lista, para el badge. */
const NEGOCIO_OFF = Math.round((1 - NEGOCIO.price / NEGOCIO.listPrice) * 100);

/** Foto real de una tirada de calcos de logo. Si falta el archivo, la card va sin foto. */
const MUESTRA_SRC = '/images/negocio-muestra.jpg';

/**
 * Promo Negocio: 100 calcos de un solo diseño (el logo del cliente) en 6 cm a $39.999
 * (precio de lista $96.999). El logo se coordina por WhatsApp después de la compra.
 */
export default function NegocioForm() {
  const { addNegocio } = useCart();
  const navigate = useNavigate();
  const [business, setBusiness] = useState('');
  const [error, setError] = useState('');
  const [muestraOk, setMuestraOk] = useState(true);

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
      <div className="card-glass overflow-hidden">
        {muestraOk && (
          <div className="relative">
            <img
              src={MUESTRA_SRC}
              alt="Tirada de calcos con el logo de un cliente, recién impresos"
              decoding="async"
              onError={() => setMuestraOk(false)}
              className="w-full aspect-[4/3] object-cover"
            />
            {/* funde la foto con la card para que no corte como un rectángulo pegado.
                #1d1d1d es el color efectivo de .card-glass (rgba(32,32,32,.82) sobre #111). */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#1d1d1d] via-[#1d1d1d]/70 to-transparent" />
            <span className="badge absolute top-4 left-4 bg-black/60 text-white backdrop-blur-sm border border-white/15">
              Muestra real
            </span>
          </div>
        )}
        <div className="p-6 md:p-8">
        <span className="badge badge-new mb-3">Para tu negocio</span>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl">Promo Negocio</h1>
        <p className="text-white/70 mt-3">
          <strong className="text-white">100 calcos</strong> de un solo diseño (tu logo o el arte de tu
          marca) en <strong className="text-white">6 cm</strong>.
        </p>

        <div className="mt-5">
          <div className="flex items-center gap-2.5">
            <span className="text-white/45 text-xl md:text-2xl line-through decoration-white/40">
              {formatPrice(NEGOCIO.listPrice)}
            </span>
            <span className="badge badge-new">{NEGOCIO_OFF}% OFF</span>
          </div>
          <div className="font-display font-extrabold text-4xl md:text-5xl leading-none mt-1"
            style={{ backgroundImage: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            {formatPrice(NEGOCIO.price)}
          </div>
        </div>
        <ul className="mt-5 space-y-2 text-sm text-white/70">
          <li>✅ Ideal para bares, kioscos, peluquerías, marcas y emprendimientos.</li>
          <li>✅ Vinilo premium resistente al agua y al sol.</li>
          <li>✅ Tu logo lo mandás por WhatsApp después de pagar.</li>
        </ul>
        </div>
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
          <div className="flex justify-between items-baseline font-display font-extrabold text-lg pt-1">
            <span>Total</span>
            <span className="flex items-baseline gap-2">
              <span className="text-sm font-normal text-white/40 line-through decoration-white/40">
                {formatPrice(NEGOCIO.listPrice)}
              </span>
              <span>{formatPrice(NEGOCIO.price)}</span>
            </span>
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
