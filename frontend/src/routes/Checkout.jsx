import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import CheckoutForm from '../components/CheckoutForm.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { createPreference } from '../services/paymentService.js';
import { calculateShipping } from '../config/site.js';
import { trackBeginCheckout, trackAddShippingInfo } from '../lib/analytics.js';
import { useSeo } from '../lib/seo.js';

export default function Checkout() {
  const { items, subtotal } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shippingMethod, setShippingMethod] = useState('envio-rosario');
  const shippingCost = calculateShipping(shippingMethod, subtotal);
  const total = subtotal + shippingCost;

  useSeo({ title: 'Checkout', description: 'Completá tus datos para pagar online con Mercado Pago.' });

  useEffect(() => {
    if (items.length > 0) trackBeginCheckout(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMethodChange = useCallback((method) => {
    setShippingMethod(method);
    trackAddShippingInfo(items, method);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="page-gradient min-h-screen">
        <div className="container-app py-20 text-center">
          <h1 className="font-display font-extrabold text-3xl">No hay productos en el carrito</h1>
          <Link to="/productos" className="btn-primary mt-6 inline-flex">Ver productos</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async ({ payer, shipping }) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const { init_point } = await createPreference({
        items,
        payer,
        shipping: { ...shipping, cost: shippingCost }
      });
      if (!init_point) throw new Error('Respuesta inválida del backend');
      window.location.href = init_point;
    } catch (err) {
      console.error(err);
      setErrorMsg(
        'No pudimos iniciar el pago. Revisá que el backend esté corriendo y que estén configuradas las credenciales de Mercado Pago.'
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Carrito', to: '/carrito' }, { name: 'Checkout' }]} />
        <h1 className="font-display font-extrabold text-3xl md:text-4xl">Checkout</h1>
        <p className="text-white/60 mt-2">Revisá tu pedido y completá tus datos para pagar online.</p>

        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <CheckoutForm
              onSubmit={handleSubmit}
              onMethodChange={onMethodChange}
              submitting={submitting}
              errorMsg={errorMsg}
            />
          </div>

          <aside className="card-glass p-6 h-fit lg:sticky lg:top-24">
            <h3 className="font-display font-extrabold text-xl mb-4">Tu pedido</h3>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3">
                  <img src={it.image} alt={it.name} className="w-14 h-14 rounded-xl object-cover" />
                  <div className="flex-1 text-sm">
                    <div className="font-semibold leading-snug">{it.name}</div>
                    <div className="text-white/50">x{it.quantity} · {formatPrice(it.price)}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatPrice(it.price * it.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 my-4" />
            <div className="flex justify-between text-white/70 text-sm mb-1.5">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-white/70 text-sm mb-3">
              <span>Envío</span>
              <span className={shippingCost === 0 ? 'text-emerald-400 font-semibold' : ''}>
                {shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}
              </span>
            </div>
            <div className="flex justify-between font-display font-extrabold text-lg">
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>

            <div className="mt-5 space-y-2 text-xs text-white/50">
              <div>💳 Pagás con Mercado Pago (tarjetas, dinero en cuenta, efectivo).</div>
              <div>📦 Pedido mínimo 10 calcos. Todos nuestros packs ya cumplen.</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
