import { useRef } from 'react';
import { TESTIMONIALS as testimonios } from '../data/testimonials.js';
import { trackTestimonialInteraction } from '../lib/analytics.js';

/**
 * Prueba social del Home — 3 testimonios REALES de clientes.
 *
 * Antes la card era una `card-glass` con la foto adentro del padding, el texto
 * abajo y el nombre al pie: la foto quedaba en poco más de la mitad del alto,
 * peleando de igual a igual con un párrafo. Pero lo que convence acá es la foto
 * (el calco puesto), no la frase — la frase confirma, la foto prueba. Ahora la
 * imagen va a sangre y se queda con ~80 % de la card.
 *
 * En mobile es un carrusel con swipe en vez de tres cards apiladas: apiladas
 * son tres pantallas de scroll y la tercera no la ve nadie.
 *
 * ⚠️ SIN ESTRELLAS. El brief del rediseño pedía ★★★★★ en cada card, y no se
 * ponen: EPICALCOS no tiene sistema de reseñas, así que un rating dibujado
 * sería inventado. Es la misma razón por la que el JSON-LD no emite
 * `AggregateRating` (ver `data/testimonials.js`).
 *
 * Los datos viven en `data/testimonials.js` para poder reusarlos en la versión
 * compacta (`components/SocialProof.jsx`), que va cerca de los CTA.
 */
export default function Testimonials() {
  const medido = useRef(false);

  // Un swipe en el carrusel es la única interacción real que tiene esta
  // sección; se mide UNA vez para saber si la prueba social se mira o se pasa
  // de largo. Sin `once`, un scroll de dos segundos manda 40 eventos.
  const onScroll = () => {
    if (medido.current) return;
    medido.current = true;
    trackTestimonialInteraction('carrusel_home', 'swipe');
  };

  return (
    <section className="seccion">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">Clientes que ya personalizaron</h2>
        </div>

        <div className="carrusel-snap sm:grid-cols-3" onScroll={onScroll}>
          {testimonios.map((t) => (
            <figure
              key={t.name}
              className="card-glass overflow-hidden flex flex-col p-0"
            >
              {t.image ? (
                <img
                  src={t.image}
                  alt={`Calco aplicado — testimonio de ${t.name}`}
                  loading="lazy"
                  decoding="async"
                  width={800}
                  height={1000}
                  className="w-full aspect-[4/5] object-cover"
                />
              ) : (
                <div className="w-full aspect-[4/5] bg-white/5 flex items-center justify-center text-white/20 text-sm">
                  📸 Foto del calco aplicado
                </div>
              )}
              <div className="p-4">
                <blockquote className="text-sm text-white/85 leading-snug">“{t.text}”</blockquote>
                <figcaption className="text-xs text-white/45 mt-2">
                  {t.name} · {t.label}
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
