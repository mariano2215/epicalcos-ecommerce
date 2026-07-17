import Reveal from './Reveal.jsx';

/**
 * Bloque de prueba social — 3 testimonios reales.
 * Reemplazá name, text e image con los datos reales cuando los tengas.
 * image: URL de foto del calco aplicado (subila a /public/testimonials/ o usá un link directo).
 */
const testimonials = [
  {
    name: 'Martin C.',
    text: 'Me encantó la calidad, esta calco de Gokú es genial',
    image: '/testimonials/anime-1.png',
    label: 'Calcos anime'
  },
  {
    name: 'Sofía M.',
    text: 'Tenia que hacer un sticker para la puerta de mi local de mascotas y me quedó re lindo',
    image: '/testimonials/logo-1.png',
    label: 'Logo personalizado'
  },
  {
    name: 'Giuliana S.',
    text: 'Lo lindo que es tomar mates con un termo así de decorado',
    image: '/testimonials/personalizados-1.png',
    label: 'Termo personalizado'
  }
];

export default function Testimonials() {
  return (
    <section className="py-12">
      <div className="container-app">
        <div className="text-center mb-8">
          <span className="badge badge-soft mb-3">Lo que dicen</span>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl">Clientes que ya personalizaron</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 100} className="card-glass p-6 flex flex-col gap-4">
              {t.image ? (
                <img
                  src={t.image}
                  alt={`Calco aplicado — testimonio de ${t.name}`}
                  className="w-full h-36 object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-36 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 text-sm">
                  📸 Foto del calco aplicado
                </div>
              )}
              <p className="text-white/80 text-sm leading-relaxed flex-1">"{t.text}"</p>
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-white/40 text-xs">{t.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
