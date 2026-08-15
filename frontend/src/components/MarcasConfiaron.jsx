import Reveal from './Reveal.jsx';
import { MARCAS } from '../data/marcas.js';

/**
 * Pasarela infinita con los logos de clientes, cada uno en un círculo.
 *
 * Antes esto era UNA imagen con todos los logos en blanco sobre gris, integrada
 * con `mix-blend-screen`. El problema no era técnico: para sumar una marca había
 * que rehacer el archivo entero en un editor, así que la prueba social quedaba
 * congelada. Ahora cada logo es su propio archivo y la lista vive en
 * data/marcas.js, que genera scripts/build-marcas.mjs.
 *
 * Los logos van a color y con su propio fondo (son capturas de perfil de cada
 * marca) en vez de blanco sobre transparente: recortarlos a monocromo era
 * borrarles la identidad, y en una tira de 24 el color es lo que hace que se
 * reconozcan al pasar.
 *
 * La tira sale del `container-app` a propósito — cruza el ancho completo de la
 * pantalla y se desvanece en los dos extremos, así el movimiento se lee como
 * continuo y no como una caja que se mueve.
 */

/**
 * Dos copias idénticas de la lista. La animación desplaza la pista -50%, o sea
 * exactamente el ancho de una copia: cuando termina, la segunda quedó donde
 * estaba la primera y el salto al frame 0 es invisible. Con una sola copia se
 * vería el vacío entrando por la derecha.
 */
const COPIAS = [0, 1];

export default function MarcasConfiaron() {
  return (
    <section className="py-10">
      <div className="container-app">
        <Reveal className="text-center">
          <span className="badge badge-soft mb-2">Clientes</span>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl">
            Marcas que ya confiaron en nosotros
          </h2>
          <p className="text-white/80 mt-2 text-sm md:text-base">
            Bares, tiendas, gimnasios y emprendimientos que ya imprimieron sus calcos con nosotros.
          </p>
        </Reveal>
      </div>

      <Reveal delay={100} className="mt-8">
        <div className="marcas-ticker">
          <div className="marcas-ticker__pista">
            {COPIAS.map((copia) => (
              <ul
                key={copia}
                className="marcas-ticker__grupo"
                /* La segunda copia es puro relleno visual: si no se oculta, un
                   lector de pantalla lee las 24 marcas dos veces. */
                aria-hidden={copia === 1 ? 'true' : undefined}
              >
                {MARCAS.map((marca) => (
                  <li key={marca.slug} className="marcas-ticker__item">
                    <img
                      src={`/images/marcas/${marca.slug}.webp`}
                      alt={copia === 0 ? marca.nombre : ''}
                      /* Sección muy por debajo del fold en las dos páginas que la
                         usan: 24 imágenes acá no pueden competir con el LCP. */
                      loading="lazy"
                      decoding="async"
                      width={96}
                      height={96}
                      /* El anillo no es decoración: siete de estos logos vienen
                         con fondo casi negro y sin él se derriten contra el
                         fondo de la página — se ve el logo flotando, no un
                         círculo. */
                      className="w-[72px] h-[72px] md:w-24 md:h-24 rounded-full object-cover ring-1 ring-white/20 bg-white/5"
                    />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
