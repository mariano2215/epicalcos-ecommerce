import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { trackViewCart } from '../lib/analytics.js';
import { useSeo } from '../lib/seo.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import FreeShippingProgress from '../components/FreeShippingProgress.jsx';
import ShippingInfo from '../components/ShippingInfo.jsx';
import SocialProof from '../components/SocialProof.jsx';
import SuggestedStickers from '../components/SuggestedStickers.jsx';
import { BULK_THRESHOLD } from '../config/pricing.js';

// `custom` = una línea por diseño personalizado: la cantidad son las copias de
// ESE diseño, así que se edita como cualquier calco del catálogo.
const EDITABLE = new Set(['sticker', 'fixed', 'custom']);

export default function Cart() {
  const {
    items, setQty, removeItem, subtotal, physicalSubtotal, clear, bulkEligible, unitsToBulk, bulkSavings,
    promoActive, promoSavings, digitalOnly
  } = useCart();
  const navigate = useNavigate();

  useSeo({ title: 'Carrito', description: 'Revisá tu pedido antes de pagar con Mercado Pago.' });

  useEffect(() => {
    if (items.length > 0) trackViewCart(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <div className="page-gradient min-h-screen">
        <div className="container-app py-20 text-center">
          <div className="text-6xl mb-3">🛒</div>
          <h1 className="font-display font-extrabold text-3xl">Tu carrito está vacío</h1>
          <p className="text-white/60 mt-3">Sumá tus calcos favoritos y volvé acá para finalizar.</p>
          <Link to="/categorias" className="btn-primary mt-6 inline-flex">Ver categorías</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Carrito' }]} />
        <h1 className="font-display font-extrabold text-3xl md:text-4xl">Tu carrito</h1>

        {/* Banner de la promo 3x2 (o del descuento por volumen fuera de la promo).
            Con un carrito 100 % digital no va ninguno: la línea es de precio fijo
            y "sumá 10 calcos y tenés 10% off" ahí se lee como que el descuento
            le aplicaría al archivo, que es justo lo que no pasa. */}
        {digitalOnly ? null : promoActive ? (
          <div className="mt-4 rounded-xl p-3 text-sm border border-brand-fuchsia/30 bg-brand-fuchsia/10 text-white/85">
            🎉 <strong>Promo 3x2 en todas las calcos</strong> — cada 3 (catálogo o personalizados), la más barata gratis.
          </div>
        ) : bulkEligible ? (
          <div className="mt-4 rounded-xl p-3 text-sm border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            🎉 Ya llegaste a 10 calcos: pagando por <strong>transferencia bancaria</strong> ahorrás {formatPrice(bulkSavings)} (10% off).
          </div>
        ) : unitsToBulk > 0 ? (
          <div className="mt-4 rounded-xl p-3 text-sm border border-white/10 bg-white/5 text-white/70">
            Sumá {unitsToBulk} calco{unitsToBulk === 1 ? '' : 's'} más y obtené <strong className="text-white">10% off</strong> en los calcos sueltos pagando por transferencia.
          </div>
        ) : null}

        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-4">
            {items.map((it) => (
              <div key={it.id} className="card-glass p-4 flex gap-4">
                <img src={it.image} alt={it.name} className="w-24 h-24 object-contain bg-white/5 rounded-2xl p-1" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {it.categoryLabel && (
                        <div className="text-xs text-white/50 uppercase tracking-wider">{it.categoryLabel}</div>
                      )}
                      <h3 className="font-semibold">{it.name}</h3>
                      {(it.meta?.items?.length > 0 || it.meta?.customCount > 0) && (
                        <div className="text-xs text-white/50 mt-1">
                          {it.meta.items?.length > 0 && `${it.meta.items.length} diseño(s) del catálogo`}
                          {it.meta.items?.length > 0 && it.meta.customCount > 0 ? ' + ' : ''}
                          {it.meta.customCount > 0 ? `${it.meta.customCount} propio(s)` : ''}
                        </div>
                      )}
                      {it.type === 'digital' && (
                        <div className="text-xs text-emerald-400 mt-1">📩 Te llega por mail — sin envío</div>
                      )}
                      {/* El nombre de una línea `custom` ya trae el archivo: alcanza con el estado de la subida. */}
                      {it.type === 'custom' && it.meta?.archivos?.length === 1 ? (
                        <div className="text-xs text-white/50 mt-1">
                          {it.meta.archivos[0].url ? '📎 Diseño subido ✓' : '📎 Diseño: lo mandás por WhatsApp'}
                        </div>
                      ) : it.meta?.archivos?.length > 0 ? (
                        <div className="text-xs text-white/50 mt-1">
                          📎 {it.meta.archivos.length} archivo{it.meta.archivos.length > 1 ? 's' : ''} adjunto{it.meta.archivos.length > 1 ? 's' : ''}
                        </div>
                      ) : null}
                    </div>
                    <button onClick={() => removeItem(it.id)} className="text-white/40 hover:text-white" aria-label="Quitar">✕</button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {EDITABLE.has(it.type) ? (
                      <div className="flex items-center gap-2">
                        <button className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10" onClick={() => setQty(it.id, it.quantity - 1)} aria-label="Restar">–</button>
                        <span className="w-10 text-center font-semibold">{it.quantity}</span>
                        <button className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10" onClick={() => setQty(it.id, it.quantity + 1)} aria-label="Sumar">+</button>
                      </div>
                    ) : (
                      // Packs/negocio de cantidad fija (meta.qty): la línea es 1 pack, pero
                      // lo que le importa al cliente es cuántas calcos se lleva. Un archivo
                      // digital no tiene cantidad: se compra una vez y se descarga.
                      <span className="text-sm text-white/60">
                        {it.type === 'digital'
                          ? 'Archivos digitales'
                          : it.meta?.qty
                            ? `${it.meta.qty * it.quantity} calcos`
                            : `${it.quantity} unidad${it.quantity === 1 ? '' : 'es'}`}
                      </span>
                    )}
                    <span className="font-display font-extrabold">{formatPrice(it.price * it.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between gap-3">
              <button onClick={clear} className="btn-ghost">Vaciar carrito</button>
              <Link to="/categorias" className="btn-ghost text-sm">← Seguir comprando</Link>
            </div>

            {/* Prueba social al lado de la decisión de seguir o pagar. */}
            <SocialProof index={0} />
          </div>

          <aside className="card-glass p-6 h-fit lg:sticky lg:top-24">
            <h3 className="font-display font-extrabold text-xl mb-4">Resumen</h3>
            <div className="flex justify-between text-white/70 mb-2">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            {/* La promo 3x2 SÍ se descuenta del total: no depende del medio de
                pago. El 10 % por transferencia, en cambio, es condicional —
                mostrarlo como una resta arriba de un total que no lo restaba
                daba un resumen que no cerraba. Ahora el Total es lo que se paga
                con Mercado Pago y la alternativa va abajo, con su condición. */}
            {promoActive && promoSavings > 0 && (
              <div className="flex justify-between text-emerald-400 text-sm mb-2">
                <span>🎉 Promo 3x2</span><span>-{formatPrice(promoSavings)}</span>
              </div>
            )}
            <div className="flex justify-between text-white/70 mb-2">
              <span>Envío</span>
              {digitalOnly ? (
                <span className="text-emerald-400 font-semibold">Sin envío — llega por mail</span>
              ) : (
                <span className="text-white/50">Se calcula en el checkout</span>
              )}
            </div>
            <div className="border-t border-white/10 my-3" />
            <div className="flex justify-between font-display font-extrabold text-lg">
              <span>Total</span><span>{formatPrice(promoActive ? subtotal - promoSavings : subtotal)}</span>
            </div>
            {bulkSavings > 0 && (
              <div className="mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
                <div className="flex justify-between text-sm text-emerald-400 font-semibold">
                  <span>Con transferencia</span>
                  <span>{formatPrice((promoActive ? subtotal - promoSavings : subtotal) - bulkSavings)}</span>
                </div>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">
                  Ahorrás {formatPrice(bulkSavings)} (10% off). Elegís el medio de pago en el checkout.
                </p>
              </div>
            )}
            {promoActive && (
              <p className="text-xs text-white/50 mt-2">
                El 10% por transferencia y tu cupón (si tenés uno) se suman en el checkout (tope 10%).
              </p>
            )}

            {/* Cuánto falta para el envío gratis: hasta ahora esto solo existía
                en el checkout, con los datos ya cargados y el pedido cerrado.
                Va sobre el subtotal FÍSICO — los archivos digitales no viajan en
                la caja, así que no acercan a nadie al envío gratis. Con un
                carrito 100 % digital no hay envío del que hablar. */}
            {!digitalOnly && <FreeShippingProgress subtotal={physicalSubtotal} className="mt-4" />}

            <button onClick={() => navigate('/checkout')} className="btn-primary w-full mt-4">
              Ir al checkout →
            </button>

            {/* Los medios de pago y el 10% por transferencia, ANTES de entrar al
                checkout: el beneficio estaba escondido detrás de una tarjeta que
                se ve recién al final del formulario. */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Podés pagar con</div>
              <ul className="space-y-1.5 text-sm text-white/70">
                <li className="flex items-start gap-2">
                  <span aria-hidden>💳</span>
                  <span>Mercado Pago — tarjetas, dinero en cuenta, Rapipago o Pago Fácil.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden>🏦</span>
                  <span>
                    Transferencia bancaria —{' '}
                    <strong className="text-emerald-400">10% off desde {BULK_THRESHOLD} calcos</strong>.
                  </span>
                </li>
              </ul>
            </div>

            {/* Cuándo llega, sin tener que llegar al checkout para enterarse.
                Un pedido de solo archivos no tiene producción ni correo: los
                plazos de ShippingInfo no aplican y confundirían. */}
            {digitalOnly ? (
              <div className="mt-4 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/70">
                📩 Son archivos digitales: te llegan por mail a la casilla que dejes en el checkout,
                apenas se acredita el pago.
              </div>
            ) : (
              <ShippingInfo subtotal={physicalSubtotal} className="mt-4 !bg-transparent !border-white/10" />
            )}
          </aside>
        </div>

        {/* Cross-sell: el mismo componente que ya estaba en /checkout. Sumar
            acá no cuesta envío extra, y es el momento en que todavía está
            eligiendo. */}
        <SuggestedStickers />
      </div>
    </div>
  );
}
