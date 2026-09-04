import { Link } from 'react-router-dom';
import Reveal from './Reveal.jsx';
import { isSectionHidden } from '../config/site.js';
import { ANTES_DESPUES } from '../data/ugc.js';

/**
 * "Tu termo, pero más vos" — la sección que explica el producto sin explicarlo.
 *
 * La Home nunca mostraba el producto PUESTO. Mostraba calcos sueltas sobre un
 * fondo: recortes flotando en el hero, cuadraditos en la grilla, portadas en las
 * categorías. Un calco suelto no se entiende — un termo cubierto de calcos, sí.
 *
 * LA IMAGEN es la pieza de marca de EPICALCOS: un mismo termo partido al medio,
 * liso de un lado y cubierto de calcos del otro. Que sea EL MISMO objeto es todo
 * el punto — dos termos distintos lado a lado se leen como dos productos, no
 * como una transformación.
 *
 * ⚠️ SE MUESTRA ENTERA, sin recortar. La versión anterior (un posteo de
 * Instagram) llegaba con el "ANTES"/"DESPUÉS" cortado por el encuadre cuadrado,
 * así que había que recortar esa franja con `object-bottom` y volver a poner los
 * rótulos en HTML. Esta los trae completos: recortarla les comería el logo o las
 * letras, y agregarles rótulos encima los duplicaría. Los datos y el `alt`
 * están en `data/ugc.js`.
 */
export default function AntesDespues() {
  const personalizadosVisible = !isSectionHidden('personalizados');

  return (
    <section className="seccion">
      <div className="container-app">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <Reveal className="rounded-3xl overflow-hidden border border-white/10">
            <img
              src={ANTES_DESPUES.src}
              alt={ANTES_DESPUES.alt}
              loading="lazy"
              decoding="async"
              width={ANTES_DESPUES.width}
              height={ANTES_DESPUES.height}
              className="w-full h-auto"
            />
          </Reveal>

          <Reveal delay={120}>
            {/* ⚠️ ESTE TÍTULO ERA "Tu termo. Pero más vos." y se cambió en la
                spec 015: esa frase pasó a ser una de las dos variantes del H1
                del hero, y la mitad del tráfico la habría leído dos veces en la
                misma página —arriba y acá— dejando a esta sección sin golpe
                propio. Se cambió para TODO el mundo y no sólo para esa variante:
                un texto que cambia según la celda del experimento es una segunda
                variable y ensucia el resultado.

                El {' '} antes del <br> tampoco sobra: sin él `textContent` da
                "De lisoa inconfundible." —un <br> no aporta espacio— y eso es
                exactamente lo que leen un lector de pantalla y un buscador. */}
            <h2 className="font-display font-extrabold text-3xl md:text-5xl leading-[1.05]">
              De liso{' '}
              <br />
              a inconfundible.
            </h2>
            <p className="text-white/70 mt-4 text-base md:text-lg leading-snug max-w-md">
              Elegí entre miles de diseños y combiná todo lo que te gusta en el mismo objeto.
              Nadie más va a tener ese termo.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link to="/categorias" className="btn-primary">
                Ver diseños
              </Link>
              {personalizadosVisible && (
                <Link to="/personalizados" className="btn-secondary">
                  Subir el mío
                </Link>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
