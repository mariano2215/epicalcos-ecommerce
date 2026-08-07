import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import CheckoutForm from '../components/CheckoutForm.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import SuggestedStickers from '../components/SuggestedStickers.jsx';
import { createPreference, createTransferOrder } from '../services/paymentService.js';
import { calculateShipping, freeShippingThresholdFor } from '../config/site.js';
import { findCoupon, couponBundle, WELCOME_COUPON_STORAGE_KEY, CUSTOM_SPEC_STORAGE_KEY } from '../config/pricing.js';
import { trackBeginCheckout, trackAddShippingInfo } from '../lib/analytics.js';
import { setAdvancedMatching } from '../lib/advancedMatching.js';
import { useSeo } from '../lib/seo.js';
import { buildDesignSummary, groupCustomItems } from '../lib/resumenPedido.js';

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
    // Personalizados agrupados por especificación: una entrada por tamaño+corte,
    // no una por diseño (ver groupCustomItems).
    for (const g of groupCustomItems(items)) {
      spec.push({
        tipo: 'custom',
        tamano: g.tamanoLabel,
        corte: g.corteLabel,
        cantidad: g.unidades,
        archivos: g.archivos.map((f) => ({ nombre: f.nombre, subido: Boolean(f.url) })),
        instrucciones: g.instrucciones
      });
    }
    for (const it of items) {
      if ((it.type === 'fixed' || it.type === 'negocio') && it.meta?.archivos?.length) {
        // `fixed` y `negocio` comparten forma: nombre + adjuntos (fotos, diseños, logo).
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
  const { pricedItems, clear, promoActive } = useCart();
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
  // Cupón de bundle (2x1): no se acumula con ningún % — ni transferencia, ni volumen.
  const appliedBundle = couponBundle(appliedCoupon);
  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const listSubtotal = items.reduce((a, i) => a + i.basePrice * i.quantity, 0);
  const discount = listSubtotal - subtotal;
  const discountLabel = (() => {
    if (appliedBundle) return `${appliedCoupon} · ${appliedBundle.buy}x${appliedBundle.pay}`;
    const parts = [];
    if (promoActive) parts.push('3x2');
    if (appliedCoupon) parts.push(appliedCoupon);
    if (isTransfer && !appliedCoupon) parts.push('10% transf.');
    return parts.length ? parts.join(' + ') : 'Descuento';
  })();
  const shippingCost = calculateShipping({
    method: ship.method,
    subtotal,
    city: ship.city,
    province: ship.province
  });
  const total = subtotal + shippingCost;
  // Cuánto falta para el envío gratis de ESE destino ($50.000 Rosario, $75.000 el resto).
  const freeShippingGap = freeShippingThresholdFor(ship.city, ship.province) - subtotal;

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
    // Tracking best-effort: si el píxel falla (típico en el navegador embebido de
    // Instagram) el pedido tiene que seguir igual. Sin esta guarda la promesa
    // quedaba rechazada acá afuera y el botón se colgaba en "Procesando…".
    try {
      setAdvancedMatching({ payer, shipping });
    } catch (err) {
      console.warn('[checkout] tracking falló, sigo con el pedido:', err);
    }
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
      // El código (status HTTP + error del backend, o "red" si la request no
      // llegó) va en el mensaje: sin esto, una captura de pantalla del cliente
      // no alcanza para saber si falló la validación, el backend o la conexión.
      const code = err?.code ? ` [${err.code}]` : '';
      setErrorMsg(
        method === 'transferencia'
          ? `No pudimos registrar tu pedido. Probá de nuevo en unos segundos o escribinos por WhatsApp.${code}`
          : `No pudimos iniciar el pago. Probá de nuevo o escribinos por WhatsApp.${code}`
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
              percentBlocked={Boolean(appliedBundle)}
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
                    <div className="text-white/50">x{it.quantity} · {formatPrice(it.basePrice)}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatPrice(it.basePrice * it.quantity)}</div>
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
              <span>Subtotal</span><span>{formatPrice(listSubtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400 text-sm mb-1.5">
                <span>🎉 {discountLabel}</span><span>−{formatPrice(discount)}</span>
              </div>
            )}
            {isPickup ? (
              <div className="flex justify-between text-white/70 text-sm mb-3">
                <span>Retiro en Rosario</span>
                <span className="text-emerald-400 font-semibold">Gratis</span>
              </div>
            ) : (
              <div className="mb-3">
                <div className="flex justify-between text-white/70 text-sm">
                  <span>Envío</span>
                  <span className={shippingCost === 0 ? 'text-emerald-400 font-semibold' : ''}>
                    {shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}
                  </span>
                </div>
                {shippingCost > 0 && freeShippingGap > 0 && (
                  <div className="text-xs text-white/50 mt-1">
                    Sumá {formatPrice(freeShippingGap)} y el envío te sale gratis.
                  </div>
                )}
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
              {promoActive && !appliedBundle && (
                <div className="text-emerald-400">🎉 Promo 3x2 en calcos y personalizados: cada 3, la más barata gratis.</div>
              )}
              {appliedBundle ? (
                <div className="text-emerald-400">
                  🎟️ Cupón {appliedBundle.buy}x{appliedBundle.pay} en calcos y personalizados: cada {appliedBundle.buy},
                  la más barata gratis. No se combina con el 10% por transferencia ni con el 10% desde 10 calcos.
                </div>
              ) : (
                <div>🏷️ Desde 10 calcos sueltos, 10% off pagando por transferencia.</div>
              )}
            </div>
          </aside>
        </div>

        {/* Upsell: calcos al azar de las categorías que ya tiene en el carrito */}
        <SuggestedStickers />
      </div>
    </div>
  );
}
