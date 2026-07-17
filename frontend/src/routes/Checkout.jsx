import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import CheckoutForm from '../components/CheckoutForm.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { createPreference, createTransferOrder } from '../services/paymentService.js';
import { calculateShipping } from '../config/site.js';
import { trackBeginCheckout, trackAddShippingInfo } from '../lib/analytics.js';
import { setAdvancedMatching } from '../lib/advancedMatching.js';
import { useSeo } from '../lib/seo.js';

/** Resumen legible de packs/personalizados/negocio para que le llegue al vendedor. */
function buildDesignSummary(items) {
  const parts = [];
  for (const it of items) {
    if (it.type === 'pack' && it.meta) {
      const designs = (it.meta.items || []).map((d) => `${d.name} x${d.qty}`).join(', ');
      const custom = it.meta.customCount ? ` + ${it.meta.customCount} diseño(s) propio(s)` : '';
      parts.push(`${it.name} → ${designs || 'sin catálogo'}${custom}`);
    } else if (it.type === 'negocio' && it.meta) {
      parts.push(`Negocio "${it.meta.business}": ${it.meta.qty}u ${it.meta.size} (logo por WhatsApp)`);
    }
  }
  return parts.length ? `PEDIDO: ${parts.join(' ; ')}` : '';
}

export default function Checkout() {
  const { pricedItems, clear } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [ship, setShip] = useState({ method: 'envio', city: 'Rosario', province: 'Santa Fe' });
  const [paymentMethod, setPaymentMethod] = useState('mercadopago');
  const isPickup = ship.method === 'retiro';
  const isTransfer = paymentMethod === 'transferencia';

  // Precios reales según el medio de pago elegido: el 10% off por volumen
  // solo se aplica pagando por transferencia (ver CartContext.pricedItems).
  const items = pricedItems(paymentMethod);
  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const shippingCost = calculateShipping({
    method: ship.method,
    subtotal,
    city: ship.city,
    province: ship.province
  });
  const total = subtotal + shippingCost;

  useSeo({ title: 'Checkout', description: 'Completá tus datos para pagar online con Mercado Pago o por transferencia bancaria.' });

  useEffect(() => {
    if (items.length > 0) trackBeginCheckout(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onShippingChange = useCallback((next) => {
    setShip(next);
  }, []);

  const onPaymentMethodChange = useCallback((next) => {
    setPaymentMethod(next);
  }, []);

  // Disparamos el evento de envío solo cuando cambia el método (no en cada tecla de la ciudad).
  useEffect(() => {
    trackAddShippingInfo(items, ship.method);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ship.method]);

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

  const handleSubmit = async ({ payer, shipping, paymentMethod: method }) => {
    setSubmitting(true);
    setErrorMsg('');
    setAdvancedMatching({ payer, shipping });
    try {
      const designSummary = buildDesignSummary(items);
      const comments = [shipping.comments, designSummary].filter(Boolean).join(' || ');
      const fullShipping = { ...shipping, comments: comments || undefined, cost: shippingCost };

      if (method === 'transferencia') {
        const { orderId } = await createTransferOrder({ items, payer, shipping: fullShipping });
        if (!orderId) throw new Error('Respuesta inválida del backend');
        clear();
        navigate(`/pago-transferencia?ref=${encodeURIComponent(orderId)}`);
        return;
      }

      const { init_point } = await createPreference({ items, payer, shipping: fullShipping });
      if (!init_point) throw new Error('Respuesta inválida del backend');
      window.location.href = init_point;
    } catch (err) {
      console.error(err);
      setErrorMsg(
        method === 'transferencia'
          ? 'No pudimos registrar tu pedido. Probá de nuevo en unos segundos.'
          : 'No pudimos iniciar el pago. Revisá que el backend esté corriendo y que estén configuradas las credenciales de Mercado Pago.'
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
              onShippingChange={onShippingChange}
              onPaymentMethodChange={onPaymentMethodChange}
              submitting={submitting}
              errorMsg={errorMsg}
            />
          </div>

          <aside className="card-glass p-6 h-fit lg:sticky lg:top-24">
            <h3 className="font-display font-extrabold text-xl mb-4">Tu pedido</h3>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3">
                  <img src={it.image} alt={it.name} className="w-14 h-14 rounded-xl object-contain bg-white/5 p-0.5" />
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
            {isPickup ? (
              <div className="flex justify-between text-white/70 text-sm mb-3">
                <span>Retiro en Rosario</span>
                <span className="text-emerald-400 font-semibold">Gratis</span>
              </div>
            ) : (
              <div className="flex justify-between text-white/70 text-sm mb-3">
                <span>Envío</span>
                <span className={shippingCost === 0 ? 'text-emerald-400 font-semibold' : ''}>
                  {shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-display font-extrabold text-lg">
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>

            <div className="mt-5 space-y-2 text-xs text-white/50">
              {isTransfer ? (
                <div>🏦 Pagás por transferencia bancaria — datos en el formulario.</div>
              ) : (
                <div>💳 Pagás con Mercado Pago (tarjetas, dinero en cuenta, efectivo).</div>
              )}
              <div>🏷️ Desde 10 calcos sueltos, 10% off pagando por transferencia.</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
