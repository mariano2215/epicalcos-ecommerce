import { TESTIMONIALS } from '../../../data/testimonials.js';
import { TESTIMONIO } from '../../../config/personalizadosLanding.js';
import Reveal from '../../Reveal.jsx';

/**
 * Testimonios de diseños PROPIOS del cliente (RF-L14): solo los marcados
 * `personalizado` en `data/testimonials.js`. Hoy es uno —el logo "Pet Friendly"
 * en la puerta del local de Sofía—, que además es la única foto real de un
 * personalizado que tiene el sitio.
 *
 * Sin estrellas: no hay sistema de reseñas, y cinco estrellas dibujadas a mano
 * serían un rating inventado (tampoco se emite `AggregateRating`).
 *
 * `lazy` a propósito: en el configurador anterior esta foto iba arriba de todo,
 * con `fetchpriority="high"`, y era el LCP de la página. Ahora arriba está el
 * configurador; la foto va debajo del fold y no compite con él.
 */
export default function Testimonios() {
  const lista = TESTIMONIALS.filter((t) => t.personalizado);
  if (!lista.length) return null;
  return (
    <section className="seccion !pt-4">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">{TESTIMONIO.titulo}</h2>
        </div>
        <div className="space-y-4 max-w-4xl mx-auto">
          {lista.map((t) => (
            <Reveal key={t.name}>
              <figure className="card-glass overflow-hidden grid sm:grid-cols-[minmax(0,340px)_1fr] sm:items-stretch">
                <img
                  src={t.image}
                  alt={`Calco personalizada aplicada — testimonio de ${t.name}`}
                  loading="lazy"
                  decoding="async"
                  width={800}
                  height={743}
                  className="w-full h-64 sm:h-full object-cover"
                />
                <div className="p-6 flex flex-col justify-center">
                  <blockquote className="text-lg text-white/90 leading-snug">“{t.text}”</blockquote>
                  <figcaption className="text-sm text-white/55 mt-3">
                    {t.name} · {t.label}
                  </figcaption>
                </div>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
