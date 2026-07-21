import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import CheckoutForm from '../components/CheckoutForm.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { createPreference, createTransferOrder } from '../services/paymentService.js';
import { calculateShipping } from '../config/site.js';
import { findCoupon, WELCOME_COUPON_STORAGE_KEY, CUSTOM_SPEC_STORAGE_KEY } from '../config/pricing.js';
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
    } else if (it.type === 'custom' && it.meta) {
      const m = it.meta;
      const files = m.archivos || [];
      let arch;
      if (files.length === 0) {
        arch = 'diseños: se envían por WhatsApp';
      } else if (files.some((f) => f.url)) {
        // Con URL de Cloudinary: los diseños llegan al CRM/mail como links.
        arch = `diseños (${files.length}): ${files.map((f) => f.url || `${f.nombre} (por WhatsApp)`).join(' , ')}`;
      } else {
        arch = `diseños (${files.length}): ${files.map((f) => f.nombre).join(', ')} — se envían por WhatsApp`;
      }
      const notas = m.instrucciones ? ` | notas: ${m.instrucciones}` : '';
      parts.push(
        `Personalizado (${m.materialLabel}, ${m.tamanoLabel}, corte ${m.corteLabel}, x${m.cantidad}) | ${arch}${notas}`
      );
    } else if (it.type === 'fixed' && it.meta?.archivos?.length) {
      // Producto de precio fijo con fotos adjuntas (ej. Polaroid).
      const files = it.meta.archivos;
      const arch = files.some((f) => f.url)
        ? `fotos (${files.length}): ${files.map((f) => f.url || `${f.nombre} (por WhatsApp)`).join(' , ')}`
        : `fotos (${files.length}): ${files.map((f) => f.nombre).join(', ')} — se envían por WhatsApp`;
      parts.push(`${it.name} | ${arch}`);
    }
  }
  return parts.length ? `PEDIDO: ${parts.join(' ; ')}` : '';
}

/**
 * Guarda la especificación de los ítems con diseño/fotos (+ nombre del comprador) en
 * sessionStorage para que /pago-exitoso arme el CTA de WhatsApp pre-cargado. Cubre los
 * personalizados (`custom`) y los productos fijos con fotos adjuntas (`fixed`, ej.
 * Polaroid). El blob del archivo NO se serializa; el cliente lo adjunta en WhatsApp.
 * Sobrevive al redirect a Mercado Pago (mismo tab).
 */
function stashDesignSpec(items, payerName) {
  try {
    const spec = [];
    for (const it of items) {
      if (it.type === 'custom' && it.meta) {
        spec.push({
          tipo: 'custom',
          material: it.meta.materialLabel,
          tamano: it.meta.tamanoLabel,
          corte: it.meta.corteLabel,
          cantidad: it.meta.cantidad,
          archivos: (it.meta.archivos || []).map((f) => ({ nombre: f.nombre, subido: Boolean(f.url) })),
          instrucciones: it.meta.instrucciones || null
        });
      } else if (it.type === 'fixed' && it.meta?.archivos?.length) {
        spec.push({
          tipo: 'fixed',
          nombre: it.name,
          cantidad: it.quantity,
          archivos: it.meta.archivos.map((f) => ({ nombre: f.nombre, subido: Boolean(f.url) }))
        });
      }
    }
    if (spec.length) {
      sessionStorage.setItem(CUSTOM_SPEC_STORAGE_KEY, JSON.stringify({ nombre: payerName || '', items: spec }));
    } else {
      sessionStorage.removeItem(CUSTOM_SPEC_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export default function Checkout() {
  const { pricedItems, clear } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [ship, setShip] = useState({ method: 'envio', city: 'Rosario', province: 'Santa Fe' });
  const [paymentMethod, setPaymentMethod] = useState('mercadopago');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const isPickup = ship.method === 'retiro';
  const isTransfer = paymentMethod === 'transferencia';

  // Si vino del popup de bienvenida, lo aplicamos solo automáticamente.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WELCOME_COUPON_STORAGE_KEY);
      if (stored && findCoupon(stored)) {
        setCouponInput(stored);
        setAppliedCoupon(stored.trim().toUpperCase());
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyCoupon = () => {
    const coupon = findCoupon(couponInput);
    if (!coupon) {
      setAppliedCoupon('');
      setCouponError(couponInput.trim() ? 'Ese cupón no existe o venció.' : '');
      return;
    }
    setAppliedCoupon(couponInput.trim().toUpperCase());
    setCouponError('');
  };

  const removeCoupon = () => {
    setAppliedCoupon('');
    setCouponInput('');
    setCouponError('');
  };

  // Precios reales según el medio de pago y el cupón aplicado: a los calcos
  // sueltos se les aplica el MAYOR entre el 10% por transferencia y el cupón
  // (ver CartContext.pricedItems) — nunca se suman.
  const items = pricedItems(paymentMethod, appliedCoupon);
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

      // Guardá la spec (personalizados + fotos de fijos) para el CTA de WhatsApp en /pago-exitoso.
      stashDesignSpec(items, payer?.name);

      if (method === 'transferencia') {
        const { orderId } = await createTransferOrder({ items, payer, shipping: fullShipping, couponCode: appliedCoupon });
        if (!orderId) throw new Error('Respuesta inválida del backend');
        clear();
        navigate(`/pago-transferencia?ref=${encodeURIComponent(orderId)}`);
        return;
      }

      const { init_point } = await createPreference({ items, payer, shipping: fullShipping, couponCode: appliedCoupon });
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

            <div className="mb-3">
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-2 text-sm rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2">
                  <span className="text-emerald-400">🎟️ Cupón <strong>{appliedCoupon}</strong> aplicado</span>
                  <button type="button" onClick={removeCoupon} className="text-white/50 hover:text-white text-xs">Quitar</button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Código de descuento"
                      className="input-dark !py-2 text-sm flex-1"
                    />
                    <button type="button" onClick={applyCoupon} className="btn-secondary !py-2 !px-3 text-sm shrink-0">
                      Aplicar
                    </button>
                  </div>
                  {couponError && <div className="text-xs text-brand-pink mt-1.5">{couponError}</div>}
                </div>
              )}
            </div>

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
