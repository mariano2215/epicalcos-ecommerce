import { contact, shipping } from '../config/site.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { useSeo } from '../lib/seo.js';
import FormularioContacto from '../components/contacto/FormularioContacto.jsx';
import CardWhatsapp from '../components/contacto/CardWhatsapp.jsx';
import CardInstagram from '../components/contacto/CardInstagram.jsx';

/**
 * /contacto (spec 012).
 *
 * Antes eran tres cards iguales que solo abrían un enlace: la página no recibía
 * nada. Ahora el mail se deja acá adentro (el formulario ES la card de mail, la
 * de antes abría un `mailto:` que en el navegador embebido de Instagram muchas
 * veces no abre nada) y WhatsApp sale con el mensaje ya escrito.
 *
 * EL ORDEN NO ES CASUAL: en mobile WhatsApp va PRIMERO porque es el canal que
 * convierte, y la mayoría del tráfico llega desde un anuncio de Instagram, en
 * celular. En desktop hay lugar para las dos cosas a la vez, así que el
 * formulario toma la columna grande y los dos canales quedan al costado.
 */
export default function Contact() {
  useSeo({
    title: 'Contacto',
    description:
      'Dejanos tu consulta y te respondemos en el día, o escribinos por WhatsApp. Consultas, diseños personalizados y pedidos para negocios.'
  });

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-12 md:py-16">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Contacto' }]} />

        <div className="max-w-2xl mx-auto text-center">
          <span className="badge badge-soft mb-3">Hablemos</span>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl">Contacto</h1>
          <p className="text-white/80 mt-4">
            Consultas, diseños personalizados o pedidos para tu negocio. Elegí por dónde te
            queda más cómodo: te respondemos <strong className="text-white">en el día</strong>.
          </p>
          <p className="text-white/40 text-sm mt-2">
            De lunes a sábado. Producción: {shipping.production}. Entrega: {shipping.deliveryRosario} en
            Rosario, {shipping.deliveryInterior} al resto del país.
          </p>
        </div>

        {/* Mobile: columna simple, y el `order` manda — WhatsApp, formulario,
            Instagram. Desktop: el formulario toma las 7 columnas de la izquierda
            y ocupa las dos filas; los dos canales se apilan en las 5 de la
            derecha.

            ⚠️ CADA CARD SE RENDERIZA UNA SOLA VEZ. La versión anterior de este
            layout montaba <CardInstagram /> dos veces —una con `hidden lg:block`
            y otra con `lg:hidden`— y eso deja las dos en el DOM: seis imágenes,
            dos <h2>Instagram</h2> y todos los links duplicados para un lector de
            pantalla y para Google. Ubicar con `col-start`/`row-start` resuelve lo
            mismo sin duplicar nada. */}
        <div className="mt-10 flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start max-w-5xl mx-auto">
          <div className="order-2 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:col-span-7">
            <FormularioContacto />
          </div>
          <div className="order-1 lg:col-start-8 lg:row-start-1 lg:col-span-5">
            <CardWhatsapp />
          </div>
          {/* En mobile Instagram va último: es el canal que menos convierte de
              los tres y no tiene por qué empujar al formulario hacia abajo. */}
          <div className="order-3 lg:col-start-8 lg:row-start-2 lg:col-span-5">
            <CardInstagram />
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-10 max-w-xl mx-auto">
          Para finalizar una compra, elegí tus productos en la tienda y pagá online con Mercado Pago.
          WhatsApp es solo para consultas, diseños personalizados y coordinación de envío/retiro.
          También podés escribirnos directo a{' '}
          <a href={`mailto:${contact.email}`} className="text-white/60 hover:text-white underline">
            {contact.email}
          </a>.
        </p>
      </div>
    </div>
  );
}
