import Reveal from './Reveal.jsx';
import { UGC } from '../data/ugc.js';
import { contact } from '../config/site.js';
import { trackInstagramClick } from '../lib/analytics.js';

/**
 * "Así quedan en la vida real".
 *
 * Toda la prueba social de la Home era texto: tres frases entrecomilladas con
 * una foto chica al costado. Pero lo que convence de un calco no es leer que
 * quedó lindo — es verlo puesto en un termo, en la puerta de un local, en un
 * mate. Esta sección es la única de la página donde el producto se muestra
 * usado, sin nada escrito encima.
 *
 * Todas las cards tienen el MISMO recorte cuadrado a propósito: las fotos
 * originales van de 640×640 a 800×1639, y una grilla con cuatro proporciones
 * distintas se lee como cuatro cosas distintas en vez de como una galería.
 */
export default function GaleriaUGC() {
  return (
    <section className="seccion">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">Así quedan en la vida real</h2>
          <p className="text-white/65 mt-3 text-sm md:text-base">
            Fotos de clientes y de nuestros pedidos. Ni un render.
          </p>
        </div>

        <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-4">
          {UGC.map((f, i) => (
            <Reveal key={f.src} delay={i * 60}>
              <img
                src={f.src}
                alt={f.alt}
                loading="lazy"
                decoding="async"
                width={640}
                height={640}
                className="w-full aspect-square object-cover rounded-2xl border border-white/10"
              />
            </Reveal>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href={contact.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackInstagramClick('home_ugc')}
            className="btn-secondary"
          >
            Ver más en Instagram
          </a>
        </div>
      </div>
    </section>
  );
}
