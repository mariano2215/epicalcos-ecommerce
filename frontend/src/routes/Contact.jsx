import { contact, shipping } from '../config/site.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { useSeo } from '../lib/seo.js';

export default function Contact() {
  useSeo({
    title: 'Contacto',
    description: 'Escribinos por WhatsApp, email o Instagram. Consultas, diseños personalizados, pedidos especiales.'
  });

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-16">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Contacto' }]} />

        <div className="max-w-2xl mx-auto text-center">
          <span className="badge badge-soft mb-3">Hablemos</span>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl">Contacto</h1>
          <p className="text-white/70 mt-4">
            Para consultas, diseños personalizados o pedidos especiales, escribinos por cualquiera de estos canales.
          </p>
          <p className="text-white/40 text-sm mt-2">
            Respondemos de lunes a sábado. Producción: {shipping.productionDaysRosario} en Rosario, {shipping.productionDaysInterior} al resto del país.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-10 max-w-3xl mx-auto">
          <a
            href={contact.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="card-glass card-glass-hover p-6 text-center"
          >
            <div className="text-3xl mb-2">💬</div>
            <div className="font-semibold">WhatsApp</div>
            <div className="text-white/60 text-sm mt-1">{contact.whatsappDisplay}</div>
            <div className="text-white/40 text-xs mt-1">Consultas y diseños</div>
          </a>
          <a
            href={`mailto:${contact.email}`}
            className="card-glass card-glass-hover p-6 text-center"
          >
            <div className="text-3xl mb-2">✉️</div>
            <div className="font-semibold">Email</div>
            <div className="text-white/60 text-sm mt-1 break-all">{contact.email}</div>
          </a>
          <a
            href={contact.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="card-glass card-glass-hover p-6 text-center"
          >
            <div className="text-3xl mb-2">📸</div>
            <div className="font-semibold">Instagram</div>
            <div className="text-white/60 text-sm mt-1">{contact.instagram}</div>
          </a>
        </div>

        <p className="text-center text-white/40 text-xs mt-10 max-w-xl mx-auto">
          Para finalizar una compra, elegí tus productos en la tienda y pagá online con Mercado Pago.
          WhatsApp es solo para consultas, diseños personalizados y coordinación de envío/retiro.
        </p>
      </div>
    </div>
  );
}
