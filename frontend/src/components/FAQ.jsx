import { useState } from 'react';
import { shipping } from '../config/site.js';
import { formatPrice } from '../lib/formato.js';

const faqs = [
  {
    tag: 'general',
    q: '¿Cuál es el pedido mínimo?',
    a: 'No hay pedido mínimo: podés llevar un solo calco, del catálogo o con tu propio diseño. Si querés más cantidad, están los packs y el mayorista con descuento.'
  },
  {
    tag: 'general',
    q: '¿Son resistentes al agua?',
    a: 'Sí, trabajamos con vinilo premium resistente al agua. Podés pegarlos en termo, mate, botellas y objetos de uso diario.'
  },
  {
    tag: 'general',
    q: '¿Resisten el sol?',
    a: 'Sí, están pensadas para uso cotidiano y exposición normal al sol. Para autos y motos también van perfectos.'
  },
  {
    tag: 'general',
    q: '¿Hacen diseños personalizados?',
    a: 'Sí. En Personalizados elegís tamaño y corte, subís tu diseño (logo, frase o foto) y comprás desde una unidad. Lo producimos con el tamaño, el corte y el archivo que elegiste, sin vueltas.'
  },
  {
    tag: 'general',
    q: '¿Cómo pago?',
    a: 'Elegís el medio en el checkout: Mercado Pago (tarjeta de crédito, débito, dinero en cuenta, Rapipago o Pago Fácil) o transferencia bancaria directa. Pagando por transferencia, desde 10 calcos totales (podés combinar tamaños) tenés 10% off.'
  },
  {
    tag: 'general',
    q: '¿Cómo funciona exactamente el 10% OFF?',
    a: 'Se activa solo cuando llegás a 10 calcos en el carrito —podés mezclar diseños, categorías y tamaños— Y elegís pagar por transferencia bancaria. Con Mercado Pago el precio es el de vidriera, sin descuento. Lo vas a ver aplicado en el resumen del checkout antes de confirmar nada.'
  },
  {
    tag: 'general',
    q: '¿Qué tamaños hay y cuál me conviene?',
    a: 'Tres: 4, 6 y 9 cm. El de 4 cm va para celular, llavero y objetos chicos. El de 6 cm es el más elegido y el que mejor queda en termo, notebook, botella y mate. El de 9 cm es para auto, casco, vidriera y objetos grandes. En cada ficha de producto hay una comparación a escala para que los veas.'
  },
  {
    tag: 'general',
    q: '¿Puedo repetir el mismo diseño varias veces?',
    a: 'Sí, todas las veces que quieras. En la ficha de cada calco elegís la cantidad, y en el armador de packs podés poner el número exacto de copias de cada diseño. Las repeticiones cuentan igual para el descuento desde 10 calcos.'
  },
  {
    tag: 'general',
    q: '¿Se pueden poner en el termo?',
    a: 'Sí, es de los usos más comunes. El vinilo aguanta el agua y el sol, así que podés lavar el termo a mano sin problema. Lo único que no recomendamos es el lavavajillas. El tamaño que mejor le va es el de 6 cm.'
  },
  {
    tag: 'general',
    q: '¿Puedo elegir diseños distintos en el mismo pedido?',
    a: 'Sí. Podés mezclar todos los diseños, categorías y tamaños que quieras en un mismo pedido, sin cantidad mínima por diseño. Todo suma para el descuento por volumen: lo que se cuenta son las calcos totales, no cuántas llevás de cada una.'
  },
  {
    tag: 'general',
    q: '¿Dónde puedo pegarlas?',
    a: 'En cualquier superficie lisa y no porosa: termo, mate, botella, notebook, celular, casco, auto, moto, valija, cuaderno, heladera, vidriera. Sobre tela, madera sin sellar o paredes con textura no agarran bien. Para el auto y la moto conviene el tamaño de 9 cm.'
  },
  {
    tag: 'general',
    q: '¿Cómo aplico una calco para que quede bien?',
    a: 'Limpiá y secá bien la superficie (si podés, pasale alcohol y esperá que evapore). Despegá la calco desde una esquina, apoyala primero de un lado y andá bajándola con el dedo hacia el otro para que no queden burbujas. Presioná unos segundos desde el centro hacia afuera. Dejala 24 horas antes de mojarla: el adhesivo termina de curar en ese tiempo.'
  },
  {
    tag: 'personalizados',
    q: '¿Cómo les envío mi diseño?',
    a: 'En Personalizados elegís tamaño y corte y subís el archivo ahí mismo: arrastrás o tocás para elegirlo, y se sube junto con tu pedido. Aceptamos PNG, JPG, PDF, SVG y AI. Si preferís, también podés mandarlo por WhatsApp después de pagar.'
  },
  {
    tag: 'personalizados',
    q: '¿Qué pasa si mi archivo tiene mala calidad?',
    a: 'No lo imprimimos. Miramos cada diseño antes de producir y, si la resolución no da o hay algo raro con el corte, te escribimos por WhatsApp para resolverlo antes de que se imprima nada. No hace falta que nos mandes el archivo perfecto.'
  },
  {
    tag: 'personalizados',
    q: '¿Qué formatos aceptan?',
    a: 'PNG, JPG, PDF, SVG y AI. Si tenés el vectorial (SVG, AI o PDF), mejor: el corte sale más preciso. Si tu foto pesa mucho, no te preocupes — la optimizamos sola al subirla.'
  },
  {
    tag: 'general',
    q: '¿Cuánto tarda la producción?',
    a: 'En Rosario, 2 a 3 días hábiles desde la confirmación del pago. Al resto del país, 5 a 7 días hábiles incluyendo el tiempo del correo.'
  },
  {
    tag: 'general',
    q: '¿Hacen envíos?',
    // Costos y umbrales SIEMPRE del config: esta respuesta ya se había quedado
    // vieja una vez y contradecía al checkout.
    a:
      `Sí. En Rosario por motomensajería: ${formatPrice(shipping.costRosario)}, gratis desde ` +
      `${formatPrice(shipping.freeShippingThresholdRosario)}. Ciudades próximas (Funes, Granadero ` +
      `Baigorria, Villa Gobernador Gálvez): ${formatPrice(shipping.costNearby)}. Al resto del país por ` +
      `Correo Argentino: ${formatPrice(shipping.costInterior)} — y gratis a todo el país desde ` +
      `${formatPrice(shipping.freeShippingThresholdNational)}. También podés retirar en mano sin costo, ` +
      'coordinamos por WhatsApp.'
  },
  {
    tag: 'general',
    q: '¿Puedo cambiar o devolver el pedido?',
    a: 'Por tratarse de productos personalizados de uso único, no aceptamos cambios ni devoluciones. Si hay un desperfecto de fábrica, mandanos foto/video y lo solucionamos.'
  },
  {
    tag: 'general',
    q: '¿Qué pasa después de pagar?',
    a: 'Con Mercado Pago recibimos el aviso automático. Con transferencia bancaria, necesitamos que nos envíes el comprobante por WhatsApp al 341 680-6675 para confirmar el pedido. En los dos casos te escribimos por WhatsApp para coordinar diseño (si corresponde), producción y entrega.'
  },
  {
    tag: 'mayorista',
    q: '¿Cuál es el pedido mínimo para mayorista?',
    a: 'El Pack Mayorista parte de 100 calcos con 50% de descuento. Para pedidos más grandes o negocio personalizado, cotizamos por WhatsApp sin compromiso.'
  },
  {
    tag: 'mayorista',
    q: '¿Aceptan archivo con mi logo en cualquier formato?',
    a: 'Sí. Aceptamos PNG, JPG, SVG, AI y PDF. Si el archivo tiene fondo transparente, mejor. Si no, te ayudamos a adaptarlo antes de producir.'
  },
  {
    tag: 'mayorista',
    q: '¿Cuánto tarda un pedido de 100+ calcos?',
    a: 'La producción de 100 calcos toma entre 3 y 5 días hábiles. Para volúmenes mayores coordinamos tiempos con anticipación.'
  },
  {
    tag: 'mayorista',
    q: '¿Hacen descuento por recompra para negocios?',
    a: 'Sí, los clientes que repiten pedido tienen condiciones especiales. Hablanos por WhatsApp y te armamos una propuesta a medida.'
  }
];

const TABS = [
  { key: 'all', label: 'Todas' },
  { key: 'general', label: 'General' },
  { key: 'personalizados', label: 'Personalizados' },
  { key: 'mayorista', label: 'Mayorista' }
];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  const [tab, setTab] = useState('all');

  const visible = tab === 'all' ? faqs : faqs.filter((f) => f.tag === tab);

  return (
    <section id="faq" className="seccion scroll-mt-24">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">Lo que suelen preguntar</h2>
        </div>

        {/* Tabs de filtro.
            `flex-wrap`: los cuatro en una sola línea miden 396 px y desbordaban
            la página a 375 px — la Home entera tenía scroll horizontal por estos
            cuatro botones. */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setOpen(-1); }}
              className={`px-4 min-h-[44px] inline-flex items-center justify-center rounded-full text-sm border transition-colors ${
                tab === t.key
                  ? 'border-brand-fuchsia bg-brand-fuchsia/15 text-white'
                  : 'border-white/10 text-white/60 hover:border-white/25'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {visible.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="card-glass overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full p-5 flex items-center justify-between text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold">{f.q}</span>
                  <span className={`text-xl transition-transform ${isOpen ? 'rotate-45' : ''}`} aria-hidden>+</span>
                </button>
                {isOpen && <div className="px-5 pb-5 text-white/70">{f.a}</div>}
              </div>
            );
          })}
        </div>

        {/* JSON-LD FAQPage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a }
              }))
            })
          }}
        />
      </div>
    </section>
  );
}
