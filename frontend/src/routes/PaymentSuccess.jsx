import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { trackPurchase } from '../lib/analytics.js';
import { useSeo } from '../lib/seo.js';

export default function PaymentSuccess() {
  const { items, subtotal, clear } = useCart();
  const [params] = useSearchParams();
  const orderId = params.get('external_reference') || params.get('preference_id') || 'unknown';

  useSeo({ title: 'Pago recibido', description: 'Tu pago fue aprobado. Gracias por comprar en EPICALCOS.' });

  useEffect(() => {
    if (items.length > 0) {
      // Disparamos antes de limpiar el carrito para no perder los items del evento
      trackPurchase({ orderId, items, total: subtotal, shipping: 0 });
    }
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="hero-gradient min-h-screen grid place-items-center">
      <div className="container-app py-20">
        <div className="card-glass p-10 max-w-xl mx-auto text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl">Pago recibido</h1>
          <p className="text-white/70 mt-3">
            Gracias por comprar en EPICALCOS. Ya recibimos tu pedido y te vamos a contactar
            por WhatsApp para coordinar producción y entrega.
          </p>
          {orderId !== 'unknown' && (
            <p className="text-white/40 text-xs mt-3 font-mono">N° de pedido: {orderId}</p>
          )}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="btn-secondary">Volver al inicio</Link>
            <Link to="/productos" className="btn-primary">Ver más productos</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
