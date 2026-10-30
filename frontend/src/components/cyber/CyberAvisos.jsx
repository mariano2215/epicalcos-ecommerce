import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart, formatPrice } from '../../context/CartContext.jsx';
import { CYBER } from '../../config/pricing.js';
import { porCalco, sugerenciaCyber } from '../../config/epicyber.js';
import { usePacksCyber } from '../../lib/promo.js';
import { trackSelectPromotion } from '../../lib/analytics.js';

/**
 * Upsell del carrito (spec 036). Un texto y un link, sin popups: el que no quiere
 * lo ignora y sigue. La sugerencia y la diferencia salen de `sugerenciaCyber`,
 * con los precios que el carrito ya muestra.
 *
 * El link lleva la `semilla`: el armador abre con esos diseños y al confirmar
 * reemplaza las líneas, así pasarse de pack no obliga a elegir todo de nuevo.
 */
export function CyberUpsellCarrito({ onNavegar, className = '' }) {
  const { items } = useCart();
  const packs = usePacksCyber();
  const s = useMemo(() => sugerenciaCyber(items, packs), [items, packs]);
  if (!s) return null;

  return (
    <div className={`rounded-xl border border-brand-fuchsia/30 bg-brand-fuchsia/10 px-3 py-2.5 text-sm ${className}`}>
      <div className="font-semibold">⚡ {s.texto}</div>
      <div className="text-xs text-white/60 mt-0.5">
        Sumá más unidades y pagá menos por calco: {formatPrice(porCalco(s.pack))} c/u.
      </div>
      <Link
        to={`/epicyber?n=${s.pack.qty}`}
        state={{ semilla: s.semilla }}
        onClick={() => {
          trackSelectPromotion({ ubicacion: 'carrito_upsell', pack: s.pack });
          onNavegar?.();
        }}
        className="mt-1 inline-flex items-center min-h-[44px] text-sm font-semibold text-brand-yellow underline underline-offset-2"
      >
        Pasarme al pack de {s.pack.qty}
      </Link>
    </div>
  );
}

/** Una línea en la ficha del producto: el 9 cm no entra en la campaña. */
export function CyberAvisoProducto({ size }) {
  const [pack] = usePacksCyber();
  if (!pack || !CYBER.sizes.includes(size)) return null;
  return (
    <Link
      to={`/epicyber?n=${pack.qty}`}
      onClick={() => trackSelectPromotion({ ubicacion: 'producto', pack })}
      className="mt-3 flex items-center min-h-[44px] rounded-xl border border-brand-fuchsia/30 bg-brand-fuchsia/10 px-3 py-2 text-sm"
    >
      <span>
        ⚡ <strong>EPICYBER:</strong> {pack.qty} calcos a {formatPrice(pack.price)}.{' '}
        <span className="underline underline-offset-2">Ver packs</span>
      </span>
    </Link>
  );
}

/**
 * Aviso de página. /negocio y /personalizados venden lo suyo a su precio de
 * siempre: sin este aviso, alguien pagaría más que en la oferta del Home sin
 * enterarse de que existe.
 */
export function CyberAvisoPagina({ qty, texto }) {
  const packs = usePacksCyber();
  const pack = packs.find((p) => p.qty === qty);
  if (!pack) return null;
  return (
    <div className="container-app pt-4">
      <Link
        to={`/epicyber?n=${pack.qty}`}
        onClick={() => trackSelectPromotion({ ubicacion: 'aviso_pagina', pack })}
        className="block rounded-2xl border border-brand-fuchsia/40 bg-brand-fuchsia/10 px-4 py-3 text-sm min-h-[44px]"
      >
        ⚡ <strong>EPICYBER WEEK:</strong> {pack.qty} calcos a {formatPrice(pack.price)}, {texto}.{' '}
        <span className="font-semibold text-brand-yellow underline underline-offset-2">Personalizar mi pedido</span>
      </Link>
    </div>
  );
}
