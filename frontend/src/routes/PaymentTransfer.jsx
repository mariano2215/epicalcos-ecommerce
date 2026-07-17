import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { bankTransfer, contact } from '../config/site.js';
import { useSeo } from '../lib/seo.js';

export default function PaymentTransfer() {
  const { clear } = useCart();
  const [params] = useSearchParams();
  const orderId = params.get('ref') || 'sin-referencia';

  useSeo({ title: 'Pedido registrado', description: 'Tu pedido quedó registrado, pendiente de transferencia.' });

  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const whatsappMsg = encodeURIComponent(`Hola! Te envío el comprobante de mi pedido ${orderId}.`);

  return (
    <div className="hero-gradient min-h-screen grid place-items-center">
      <div className="container-app py-20">
        <div className="card-glass p-10 max-w-xl mx-auto text-center">
          <div className="text-6xl mb-4">📥</div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl">¡Registramos tu pedido!</h1>
          <p className="text-white/70 mt-3">
            Ya te mandamos un mail con el resumen. Ahora hacé la transferencia y envianos el comprobante
            para que pasemos tu pedido a producción.
          </p>
          {orderId !== 'sin-referencia' && (
            <p className="text-white/40 text-xs mt-3 font-mono">N° de pedido: {orderId}</p>
          )}

          <div className="mt-8 rounded-xl p-5 border border-white/10 bg-white/5 text-left text-sm">
            <div className="font-semibold text-white mb-3">Datos para transferir</div>
            <dl className="space-y-2">
              <div className="flex justify-between gap-3"><dt className="text-white/50">CVU</dt><dd className="font-mono text-white">{bankTransfer.cvu}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-white/50">Alias</dt><dd className="font-mono text-white">{bankTransfer.alias}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-white/50">Titular</dt><dd className="text-white text-right">{bankTransfer.titular}</dd></div>
            </dl>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`${contact.whatsappUrl}?text=${whatsappMsg}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              📤 Enviar comprobante por WhatsApp
            </a>
            <Link to="/" className="btn-secondary">Volver al inicio</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
