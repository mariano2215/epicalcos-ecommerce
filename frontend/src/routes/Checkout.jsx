import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import CheckoutForm from '../components/CheckoutForm.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import SuggestedStickers from '../components/SuggestedStickers.jsx';
import { createPreference, createTransferOrder } from '../services/paymentService.js';
import { trackCart } from '../services/cartRecovery.js';
import { calculateShipping, freeShippingThresholdFor } from '../config/site.js';
import {
  findCoupon,
  couponBundle,
  couponAnulaTodo,
  esPromoArgentina,
  PROMO_ARGENTINA,
  CUSTOM_SPEC_STORAGE_KEY
} from '../config/pricing.js';
import {
  trackBeginCheckout,
  trackAddShippingInfo,
  trackAddPaymentInfo,
  trackCuponVencido,
  trackCuponAplicadoEnPromo
} from '../lib/analytics.js';
import { leerCupon, olvidarCupon } from '../lib/cuponVentana.js';
import CuponCountdown from '../components/CuponCountdown.jsx';
import { stashPurchase } from '../lib/purchaseTracking.js';
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
  const { pricedItems, clear, promoActive, promo2x1Active, algunaPromoNxM, digitalOnly } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Un pedido de solo archivos imprimibles no se entrega: arranca (y se queda)
  // en 'digital', y el formulario ni siquiera muestra la sección de entrega.
  const [ship, setShip] = useState({
    method: digitalOnly ? 'digital' : 'envio',
    city: 'Rosario',
    province: 'Santa Fe'
  });
  const [paymentMethod, setPaymentMethod] = useState('mercadopago');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  /**
   * Instante en que el popup entregó el cupón (spec 017). Es lo que define la
   * ventana de 10 minutos: viaja en el payload y lo revalida el servidor.
   * `null` = el código no vino del popup (lo tipeó, o vino por URL) y entonces
   * no tiene ventana.
   */
  const [couponIssuedAt, setCouponIssuedAt] = useState(null);
  const [cuponVencidoAviso, setCuponVencidoAviso] = useState(false);
  const [couponError, setCouponError] = useState('');
  /**
   * El campo de cupón arranca COLAPSADO detrás de un link.
   *
   * Un input "Código de descuento" vacío y siempre visible manda al cliente a
   * abrir otra pestaña a buscar un código que hoy no existe (ninguno se publica,
   * ver COUPONS en config/pricing.js) — y muchos no vuelven. El que sí tiene un
   * código lo busca igual: un click no lo frena.
   *
   * Arranca ABIERTO cuando ya hay un cupón en juego: por URL (?cupon=…) o el del
   * popup de bienvenida guardado en localStorage. Ahí esconderlo sería esconder
   * un descuento que el cliente ya se ganó.
   */
  const [couponOpen, setCouponOpen] = useState(false);
  const couponInputRef = useRef(null);
  const enfocarCupon = useRef(false);
  const [searchParams] = useSearchParams();
  const isPickup = ship.method === 'retiro';
  const isTransfer = paymentMethod === 'transferencia';

  // Cupón precargado: primero el de la URL (alguien mandó ese link a propósito),
  // si no el del popup de bienvenida. Los dos se aplican solos.
  useEffect(() => {
    const fromUrl = (searchParams.get('cupon') || searchParams.get('coupon') || '').trim();
    // El guardado ahora es `{ code, emitidoEn }` — `leerCupon` entiende también el
    // formato viejo (string suelto) para no romperle el cupón a quien ya lo tenía.
    const guardado = leerCupon();
    const code = fromUrl || guardado?.code || '';
    if (!code) return;
    // La ventana solo corre para el que vino del popup: un código de la URL no
    // tiene emisión y por lo tanto no vence a los 10 minutos.
    if (!fromUrl && guardado?.emitidoEn) setCouponIssuedAt(guardado.emitidoEn);

    const coupon = findCoupon(code);
    // El de localStorage solo se muestra si sigue vivo: un código vencido ahí
    // guardado no es algo que el cliente haya pedido ver.
    if (!coupon && !fromUrl) return;

    setCouponInput(code);
    setCouponOpen(true);
    if (coupon) setAppliedCoupon(code.toUpperCase());
    else setCouponError('Ese cupón no existe o venció.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Foco en el input solo cuando lo abrió el cliente: al abrirlo por un cupón
  // de la URL, robarle el foco le mueve el scroll apenas entra al checkout.
  useEffect(() => {
    if (!couponOpen || !enfocarCupon.current) return;
    enfocarCupon.current = false;
    couponInputRef.current?.focus();
  }, [couponOpen]);

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
    setCouponIssuedAt(null);
    // Vuelve a colapsarse: quien saca su cupón no está por escribir otro, y un
    // input vacío ahí es justo lo que este bloque evita.
    setCouponOpen(false);
  };

  /**
   * Se cerró la ventana de 10 minutos con el checkout abierto (spec 017).
   *
   * ⚠️ NO se toca NADA del formulario. El nombre, el mail, el teléfono y la
   * dirección que la persona ya tipeó quedan donde están: es el riesgo declarado
   * en requirements §12 — el total sube solo a mitad del formulario, y lo único
   * que hace tolerable ese momento es que no le borremos el trabajo encima.
   *
   * Tampoco se cierra el bloque del cupón de golpe: se deja un aviso explícito
   * en su lugar, así el cambio de total tiene una explicación a la vista.
   */
  const vencerCupon = useCallback(() => {
    trackCuponVencido(appliedCoupon, 'checkout');
    setAppliedCoupon('');
    setCouponInput('');
    setCouponIssuedAt(null);
    setCuponVencidoAviso(true);
    setCouponOpen(false);
    // Se olvida del storage para que no se reofrezca en la próxima pantalla ya
    // vencido: el servidor tampoco lo aceptaría.
    olvidarCupon();
  }, [appliedCoupon]);

  // Precios reales según el medio de pago y el cupón aplicado. Un cupón de %
  // normal (EPICA10) se SUMA al 10% por transferencia; uno de bundle o uno
  // `exclusivo` (EPI50) no se acumula con nada. Ver CartContext.pricedItems.
  const items = pricedItems(paymentMethod, appliedCoupon, couponIssuedAt);
  // Cupón de bundle (2x1): no se acumula con ningún % — ni transferencia, ni volumen.
  const appliedBundle = couponBundle(appliedCoupon);
  // Cupón exclusivo (EPI50): su % es el descuento final y tampoco se acumula.
  // Se separa del bundle porque el aviso que se muestra es distinto: acá hay un
  // % que nombrar, en el bundle hay un N x M.
  const cuponExclusivo = !appliedBundle && couponAnulaTodo(appliedCoupon)
    ? findCoupon(appliedCoupon)
    : null;
  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const listSubtotal = items.reduce((a, i) => a + i.basePrice * i.quantity, 0);
  const discount = listSubtotal - subtotal;
  // ¿El carrito tiene alguna línea que entre en la promo por categoría? Se
  // pregunta por el id, igual que el servidor.
  const tienePromoCategoria = items.some((i) => esPromoArgentina(i.id));
  const discountLabel = (() => {
    if (appliedBundle) return `${appliedCoupon} · ${appliedBundle.buy}x${appliedBundle.pay}`;
    const parts = [];
    if (promoActive) parts.push('3x2');
    // La promo por categoría se nombra: es la que más descuenta y sin esto la
    // línea decía "Descuento" a secas, sin explicar de dónde salía el 50 %.
    // El texto sale del config, no escrito a mano.
    if (tienePromoCategoria) parts.push(PROMO_ARGENTINA.titulo);
    if (appliedCoupon) parts.push(appliedCoupon);
    if (isTransfer && !appliedCoupon) parts.push('10% transf.');
    return parts.length ? parts.join(' + ') : 'Descuento';
  })();
  // Los archivos digitales no viajan: se descuentan del subtotal que decide el
  // envío (y su umbral gratis). Espejado en el servidor con `physicalTotal`
  // (netlify/functions/lib/pricing.js), que es el que realmente cobra.
  const digitalSubtotal = items.reduce((a, i) => (i.type === 'digital' ? a + i.price * i.quantity : a), 0);
  const physicalSubtotal = subtotal - digitalSubtotal;
  const shippingCost = calculateShipping({
    method: ship.method,
    subtotal: physicalSubtotal,
    city: ship.city,
    province: ship.province
  });
  const total = subtotal + shippingCost;
  // Cuánto falta para el envío gratis de ESE destino (ver los umbrales en config/site.js).
  const freeShippingGap = freeShippingThresholdFor(ship.city, ship.province) - physicalSubtotal;

  useSeo({ title: 'Checkout', description: 'Completá tus datos para pagar online con Mercado Pago o por transferencia bancaria.' });

  // Una sola vez por visita al checkout: sin el ref, el doble efecto de
  // StrictMode duplica el begin_checkout y arruina la tasa carrito → checkout.
  const beginCheckoutEnviado = useRef(false);
  useEffect(() => {
    if (items.length > 0 && !beginCheckoutEnviado.current) {
      beginCheckoutEnviado.current = true;
      trackBeginCheckout(items);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onShippingChange = useCallback((next) => {
    setShip(next);
  }, []);

  const onPaymentMethodChange = useCallback((next) => {
    setPaymentMethod(next);
  }, []);

  /**
   * Mail válido escrito en el checkout → se registra el carrito por si no
   * termina de comprar (ver services/cartRecovery.js). Se manda el carrito con
   * los precios REALES del medio de pago elegido, que es lo que va a ver en el
   * recordatorio. El backend es no-op salvo que la recuperación esté prendida.
   */
  const onEmailValid = useCallback(
    (email, name) => trackCart({ email, name, items: pricedItems(paymentMethod, appliedCoupon, couponIssuedAt) }),
    [pricedItems, paymentMethod, appliedCoupon, couponIssuedAt]
  );

  // `add_shipping_info` y `add_payment_info` solo cuando el cliente ELIGE algo.
  // El efecto también corre al montar, y disparándolo ahí los dos eventos
  // existían siempre con el valor por defecto: no medían ninguna decisión.
  //
  // El guard compara contra el ÚLTIMO VALOR trackeado, no contra un "es el
  // primer render". Un flag booleano no alcanza: StrictMode monta, desmonta y
  // vuelve a montar sobre el mismo fiber, el ref sobrevive a ese ciclo y la
  // segunda corrida se hace pasar por un cambio real. Comparando el valor, ni
  // el doble efecto ni un re-render disparan de más.
  const ultimoEnvio = useRef(ship.method);
  useEffect(() => {
    if (ultimoEnvio.current === ship.method) return;
    ultimoEnvio.current = ship.method;
    trackAddShippingInfo(items, ship.method);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ship.method]);

  /**
   * El cupón se está usando ENCIMA de una promo N x M — que es lo que la spec
   * 017 habilitó y lo que hay que poder costear después.
   *
   * Se dispara una sola vez por combinación cupón+promo: sin el ref, cada
   * re-render del checkout (y hay uno por cada tecla del formulario) mandaría
   * un evento.
   */
  const cuponEnPromoReportado = useRef('');
  useEffect(() => {
    if (!appliedCoupon || !algunaPromoNxM) return;
    const clave = `${appliedCoupon}:${promoActive ? '3x2' : ''}${promo2x1Active ? '2x1' : ''}`;
    if (cuponEnPromoReportado.current === clave) return;
    cuponEnPromoReportado.current = clave;
    trackCuponAplicadoEnPromo(appliedCoupon, promoActive && promo2x1Active ? '3x2+2x1' : promoActive ? '3x2' : '2x1');
  }, [appliedCoupon, algunaPromoNxM, promoActive, promo2x1Active]);

  const ultimoPago = useRef(paymentMethod);
  useEffect(() => {
    if (ultimoPago.current === paymentMethod) return;
    ultimoPago.current = paymentMethod;
    trackAddPaymentInfo(items, paymentMethod, appliedCoupon || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod]);

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

      // El pedido con los precios REALES (ya con 3x2/cupón/transferencia) viaja
      // a la pantalla de gracias por sessionStorage: el CartContext solo conoce
      // el precio de lista y no sobrevive al redirect a Mercado Pago.
      const stash = (orderId) =>
        stashPurchase({
          orderId,
          items,
          itemsTotal: subtotal,
          shippingCost,
          total,
          coupon: appliedCoupon || null,
          paymentMethod: method
        });

      if (method === 'transferencia') {
        const { orderId } = await createTransferOrder({ items, payer, shipping: fullShipping, couponCode: appliedCoupon, couponIssuedAt });
        if (!orderId) throw new Error('Respuesta inválida del backend');
        stash(orderId);
        clear();
        navigate(`/pago-transferencia?ref=${encodeURIComponent(orderId)}`);
        return;
      }

      const { init_point, external_reference } = await createPreference({ items, payer, shipping: fullShipping, couponCode: appliedCoupon, couponIssuedAt });
      if (!init_point) throw new Error('Respuesta inválida del backend');
      stash(external_reference);
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
        <p className="text-white/80 mt-2">Revisá tu pedido y completá tus datos para pagar online.</p>

        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <CheckoutForm
              onSubmit={handleSubmit}
              onShippingChange={onShippingChange}
              onPaymentMethodChange={onPaymentMethodChange}
              onEmailValid={onEmailValid}
              submitting={submitting}
              errorMsg={errorMsg}
              percentBlocked={couponAnulaTodo(appliedCoupon)}
              digitalOnly={digitalOnly}
            />
          </div>

          <aside className="card-glass p-6 h-fit lg:sticky lg:top-24">
            <h3 className="font-display font-extrabold text-xl mb-4">Tu pedido</h3>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3">
                  <img
                    src={it.image}
                    alt={it.name}
                    loading="lazy"
                    decoding="async"
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-xl object-contain bg-white/5 p-0.5"
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-semibold leading-snug">{it.name}</div>
                    <div className="text-white/50">x{it.quantity} · {formatPrice(it.basePrice)}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatPrice(it.basePrice * it.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 my-4" />

            {/* Los archivos imprimibles son precio fijo: ningún cupón los toca
                (lo rechaza el servidor). Mostrar el campo sería invitar a
                probar códigos que no van a hacer nada. */}
            <div className={`mb-3 ${digitalOnly ? 'hidden' : ''}`}>
              {appliedCoupon ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-sm rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2">
                    <span className="text-emerald-400">🎟️ Cupón <strong>{appliedCoupon}</strong> aplicado</span>
                    <button type="button" onClick={removeCoupon} className="text-white/50 hover:text-white text-xs">Quitar</button>
                  </div>
                  {/* El contador se ve DESDE QUE ENTRA al checkout, no aparece
                      recién al vencer: una ventana que se cierra de sorpresa,
                      con el formulario a medio llenar, se lee como un error del
                      sitio. Sólo renderiza si el cupón tiene ventana. */}
                  <CuponCountdown
                    cupon={{ code: appliedCoupon, emitidoEn: couponIssuedAt }}
                    onVencido={vencerCupon}
                    className="mt-2"
                  />
                </>
              ) : cuponVencidoAviso ? (
                <div className="text-sm rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-white/70">
                  ⌛ Se cerró la ventana de tu 10% OFF y lo sacamos del total.
                  <span className="block text-white/45 text-xs mt-0.5">
                    Tus datos quedaron como estaban — podés seguir con la compra.
                  </span>
                </div>
              ) : couponOpen ? (
                <div>
                  <div className="flex gap-2">
                    <input
                      ref={couponInputRef}
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                      placeholder="Código de descuento"
                      aria-label="Código de descuento"
                      className="input-dark !py-2 text-sm flex-1"
                    />
                    <button type="button" onClick={applyCoupon} className="btn-secondary !py-2 !px-3 text-sm shrink-0">
                      Aplicar
                    </button>
                  </div>
                  {couponError && <div className="text-xs text-brand-pink mt-1.5">{couponError}</div>}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    enfocarCupon.current = true;
                    setCouponOpen(true);
                  }}
                  aria-expanded={false}
                  className="text-sm text-white/50 hover:text-white underline decoration-white/25 hover:decoration-white"
                >
                  ¿Tenés un código de descuento?
                </button>
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
            {digitalOnly ? (
              <div className="flex justify-between text-white/70 text-sm mb-3">
                <span>Entrega por mail</span>
                <span className="text-emerald-400 font-semibold">Sin envío</span>
              </div>
            ) : isPickup ? (
              <div className="flex justify-between text-white/70 text-sm mb-3">
                <span>Retiro en Rosario</span>
                <span className="text-emerald-400 font-semibold">Gratis</span>
              </div>
            ) : (
              <div className="mb-3">
                <div className="flex justify-between text-white/70 text-sm">
                  <span>Envío</span>
                  {/* "$ 0" se lee como un error de cálculo: si el pedido cruzó el
                      umbral, se dice "Gratis". */}
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
              {/* Con un pedido 100 % digital no corre ninguna promo: la línea
                  es de precio fijo. En vez de prometer descuentos que el
                  servidor va a rechazar, se explica cómo llega el archivo. */}
              {digitalOnly ? (
                <div className="text-emerald-400">
                  📩 Te mandamos los archivos al mail que dejes acá arriba, apenas se acredita el pago.
                </div>
              ) : (
                <>
                  {promoActive && !appliedBundle && !cuponExclusivo && (
                    <div className="text-emerald-400">
                      🎉 Promo 3x2 en calcos y personalizados: cada 3, la más barata gratis.
                      Se combina con el 10% por transferencia y con tu cupón.
                    </div>
                  )}
                  {promo2x1Active && !appliedBundle && !cuponExclusivo && (
                    <div className="text-emerald-400">
                      🎉 2x1 en anime, Argentina, Disney y frases: cada 2, la más barata gratis.
                    </div>
                  )}
                  {/* ⚠️ Acá había el aviso contrario ("el cupón no se combina con
                      la promo 3x2"). La spec 017 revirtió esa regla: ahora SÍ se
                      acumula, con tope del 20 %. */}
                  {appliedBundle ? (
                    <div className="text-emerald-400">
                      🎟️ Cupón {appliedBundle.buy}x{appliedBundle.pay} en calcos y personalizados: cada {appliedBundle.buy},
                      la más barata gratis. No se combina con el 10% por transferencia ni con el 10% desde 10 calcos.
                    </div>
                  ) : cuponExclusivo ? (
                    /* El % sale del config, no escrito a mano: si mañana cambia,
                       el cartel no puede quedar prometiendo otra cosa. */
                    <div className="text-emerald-400">
                      🎟️ Cupón {appliedCoupon}: {Math.round(cuponExclusivo.discount * 100)}% off en calcos y
                      personalizados. No se combina con el 10% por transferencia ni con el 10% desde 10 calcos.
                    </div>
                  ) : (
                    <div>🏷️ Desde 10 calcos sueltos, 10% off pagando por transferencia.</div>
                  )}
                </>
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
