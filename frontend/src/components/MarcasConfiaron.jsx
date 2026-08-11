import { useState } from 'react';
import Reveal from './Reveal.jsx';

/**
 * Tira de logos de clientes. La imagen viene con fondo gris oscuro plano y logos
 * blancos, así que se integra al sitio con `mix-blend-screen`: el gris se disuelve
 * contra el fondo oscuro de la página y sólo quedan los logos.
 *
 * Los degradados de máscara van separados a propósito — el vertical en el wrapper y
 * el horizontal en la <img> — para desvanecer los cuatro bordes sin depender de
 * `mask-composite`. El blend va en el wrapper (no en la <img>) porque la máscara crea
 * un contexto de apilamiento y, si estuviera en el hijo, mezclaría contra el wrapper
 * transparente en vez de contra la página.
 */
const SRC = '/images/marcas-clientes.webp';

const FADE_Y = 'linear-gradient(to bottom, transparent 0%, #000 7%, #000 93%, transparent 100%)';
const FADE_X = 'linear-gradient(to right, transparent 0%, #000 4%, #000 96%, transparent 100%)';

/**
 * El `contrast` empuja el gris del fondo (#2b2b2b) prácticamente a negro sin tocar los
 * logos blancos; combinado con `screen` el rectángulo desaparece y sólo quedan los logos.
 */
const PUNCH = 'contrast(1.4) brightness(1.05)';

export default function MarcasConfiaron() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <section className="py-10">
      <div className="container-app">
        <Reveal className="text-center">
          <span className="badge badge-soft mb-2">Clientes</span>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl">
            Marcas que ya confiaron en nosotros
          </h2>
          <p className="text-white/60 mt-2 text-sm md:text-base">
            Bares, tiendas, gimnasios y emprendimientos que ya imprimieron sus calcos con nosotros.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div
            className="mt-6 mix-blend-screen"
            style={{ WebkitMaskImage: FADE_Y, maskImage: FADE_Y }}
          >
            <img
              src={SRC}
              alt="Logos de marcas que ya compraron calcos en EPICALCOS"
              /* `lazy`: esta sección vive muy por debajo del fold y era la ÚNICA
                 imagen del sitio que se pedía con prioridad — competía por ancho
                 de banda con el hero justo durante el LCP.
                 El `onError` sigue funcionando: `lazy` no cancela la descarga,
                 la difiere hasta que la sección se acerca al viewport, que es
                 exactamente cuando importa saber si la imagen falló. */
              loading="lazy"
              decoding="async"
              /* Tamaño intrínseco del archivo: reserva el alto antes de bajarla
                 y el bloque no salta cuando entra (CLS). */
              width={2000}
              height={710}
              onError={() => setFailed(true)}
              className="w-full h-auto max-w-4xl mx-auto"
              style={{ WebkitMaskImage: FADE_X, maskImage: FADE_X, filter: PUNCH }}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
