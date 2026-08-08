import Reveal from './Reveal.jsx';
import { TESTIMONIALS as testimonials } from '../data/testimonials.js';

/**
 * Bloque grande de prueba social del Home — 3 testimonios reales.
 * Los datos viven en data/testimonials.js para poder reusarlos en la versión
 * compacta (components/SocialProof.jsx), que va cerca de los CTA.
 */
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
                  className="w-full aspect-[4/5] object-cover rounded-xl"
                />
              ) : (
                <div className="w-full aspect-[4/5] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 text-sm">
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
