import { useState } from 'react';

const faqs = [
  {
    tag: 'general',
    q: '¿Cuál es el pedido mínimo?',
    a: 'El pedido mínimo es de 10 calcos. Todos nuestros packs ya cumplen ese mínimo, así que con cualquier pack vas a estar listo.'
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
    a: 'Sí. Comprás el pack personalizado y después coordinamos por WhatsApp el diseño, logo, frase o referencia que quieras imprimir. Te enviamos vista previa antes de producir.'
  },
  {
    tag: 'general',
    q: '¿Cómo pago?',
    a: 'Pagás online de forma segura con Mercado Pago: tarjeta de crédito, débito, dinero en cuenta, Rapipago o Pago Fácil. También aceptamos transferencia bancaria coordinada por WhatsApp.'
  },
  {
    tag: 'general',
    q: '¿Cuánto tarda la producción?',
    a: 'En Rosario, 2 a 3 días hábiles desde la confirmación del pago. Al resto del país, 7 a 10 días hábiles incluyendo el tiempo del correo.'
  },
  {
    tag: 'general',
    q: '¿Hacen envíos?',
    a: 'Sí. En Rosario: $3.500, gratis desde $50.000. Al resto del país: $8.000. También podés retirar en mano sin costo, coordinamos por WhatsApp.'
  },
  {
    tag: 'general',
    q: '¿Puedo cambiar o devolver el pedido?',
    a: 'Por tratarse de productos personalizados de uso único, no aceptamos cambios ni devoluciones. Si hay un desperfecto de fábrica, mandanos foto/video y lo solucionamos.'
  },
  {
    tag: 'general',
    q: '¿Qué pasa después de pagar?',
    a: 'Recibimos el aviso de Mercado Pago, te escribimos por WhatsApp al número que dejaste en el checkout para coordinar diseño (si corresponde), producción y entrega.'
  },
  {
    tag: 'mayorista',
    q: '¿Cuál es el pedido mínimo para mayorista?',
    a: 'El Pack Mayorista parte de 100 calcos con 25% de descuento. Para pedidos más grandes o negocio personalizado, cotizamos por WhatsApp sin compromiso.'
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
  { key: 'mayorista', label: 'Mayorista' }
];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  const [tab, setTab] = useState('all');

  const visible = tab === 'all' ? faqs : faqs.filter((f) => f.tag === tab);

  return (
    <section id="faq" className="py-20">
      <div className="container-app">
        <div className="text-center mb-10">
          <span className="badge badge-soft mb-3">Preguntas frecuentes</span>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl">Lo que suelen preguntar</h2>
        </div>

        {/* Tabs de filtro */}
        <div className="flex justify-center gap-2 mb-8">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setOpen(-1); }}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
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
