import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { trackPurchase } from '../lib/analytics.js';
import { CUSTOM_SPEC_STORAGE_KEY } from '../config/pricing.js';
import { contact } from '../config/site.js';
import { useSeo } from '../lib/seo.js';

/** Arma el mensaje de WhatsApp pre-cargado con la spec del/los personalizado(s). */
function buildWhatsappMessage(spec, orderId) {
  const nombre = (spec.nombre || '').trim();
  const ref = orderId && orderId !== 'unknown' ? ` ${orderId}` : '';
  const lines = [nombre ? `Hola! Soy ${nombre}, pedido${ref}.` : `Hola! Te escribo por mi pedido${ref}.`];
  let algunoSubido = false;
  spec.items.forEach((it, i) => {
    lines.push(spec.items.length > 1 ? `— Calco ${i + 1}:` : 'Configuración:');
    lines.push(`• Material: ${it.material}`);
    lines.push(`• Tamaño: ${it.tamano}`);
    lines.push(`• Corte: ${it.corte}`);
    lines.push(`• Cantidad: ${it.cantidad}`);
    const files = it.archivos || [];
    if (files.length) lines.push(`• Diseños: ${files.map((f) => f.nombre).join(', ')}`);
    if (files.some((f) => f.subido)) algunoSubido = true;
    if (it.instrucciones) lines.push(`• Notas: ${it.instrucciones}`);
  });
  lines.push(algunoSubido ? 'Ya subí mis diseños con el pedido. 🎨' : 'Te adjunto mis diseños. 🎨');
  return encodeURIComponent(lines.join('\n'));
}

export default function PaymentSuccess() {
  const { items, subtotal, clear } = useCart();
  const [params] = useSearchParams();
  const orderId = params.get('external_reference') || params.get('preference_id') || 'unknown';
  const [customSpec, setCustomSpec] = useState(null);

  useSeo({ title: 'Pago recibido', description: 'Tu pago fue aprobado. Gracias por comprar en EPICALCOS.' });

  useEffect(() => {
    if (items.length > 0) {
      // Disparamos antes de limpiar el carrito para no perder los items del evento
      trackPurchase({ orderId, items, total: subtotal, shipping: 0 });
    }
    // Recuperamos la spec de los personalizados (sobrevive al redirect de MP) para el CTA de WhatsApp.
    try {
      const raw = sessionStorage.getItem(CUSTOM_SPEC_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.items?.length) setCustomSpec(parsed);
      }
    } catch {
      /* ignore */
    }
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const waHref = customSpec
    ? `${contact.whatsappUrl}?text=${buildWhatsappMessage(customSpec, orderId)}`
    : null;

  return (
    <div className="hero-gradient min-h-screen grid place-items-center">
      <div className="container-app py-20">
        <div className="card-glass p-10 max-w-xl mx-auto text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl">Pago recibido</h1>

          {customSpec ? (
            <>
              <p className="text-white/70 mt-3">
                ¡Gracias! Ya registramos tu pedido. Para arrancar, <strong>mandanos tu diseño por WhatsApp</strong> con
                un toque — el mensaje ya lleva toda tu configuración cargada.
              </p>
              <div className="mt-6 rounded-xl p-4 border border-white/10 bg-white/5 text-left text-sm">
                <div className="font-semibold text-white mb-2">Tu configuración</div>
                <ul className="space-y-2">
                  {customSpec.items.map((it, i) => (
                    <li key={i} className="text-white/70">
                      {it.material} · {it.tamano} · corte {it.corte} · <strong>x{it.cantidad}</strong>
                      {it.archivos?.length > 0 && (
                        <span className="text-white/40"> · {it.archivos.length} diseño{it.archivos.length > 1 ? 's' : ''}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <a href={waHref} target="_blank" rel="noreferrer" className="btn-primary">
                  📎 Enviar mi diseño por WhatsApp
                </a>
                <Link to="/" className="btn-secondary">Volver al inicio</Link>
              </div>
              <p className="text-white/40 text-xs mt-4">
                Revisamos tu archivo y te mandamos la vista previa antes de producir. No producimos nada sin tu OK.
              </p>
            </>
          ) : (
            <>
              <p className="text-white/70 mt-3">
                Gracias por comprar en EPICALCOS. Ya recibimos tu pedido y te vamos a contactar por WhatsApp para
                coordinar producción y entrega.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/" className="btn-secondary">Volver al inicio</Link>
                <Link to="/productos" className="btn-primary">Ver más productos</Link>
              </div>
            </>
          )}

          {orderId !== 'unknown' && (
            <p className="text-white/40 text-xs mt-5 font-mono">N° de pedido: {orderId}</p>
          )}
        </div>
      </div>
    </div>
  );
}
