import { Link } from 'react-router-dom';
import Reveal from './Reveal.jsx';
import { isSectionHidden } from '../config/site.js';

/**
 * "Tu termo, pero más vos" — la sección que explica el producto sin explicarlo.
 *
 * La Home nunca mostraba el producto PUESTO. Mostraba calcos sueltas sobre un
 * fondo: recortes flotando en el hero, cuadraditos en la grilla, portadas en las
 * categorías. Un calco suelto no se entiende — un termo cubierto de calcos, sí.
 *
 * ⚠️ La foto es REAL, del Instagram de EPICALCOS (el mismo posteo que se ve en
 * /contacto). No hay pares antes/después en el repo y no se inventa uno: no se
 * arma un slider con un mockup, porque un antes/después falso es exactamente la
 * clase de prueba que destruye la confianza que viene a construir.
 *
 * ⚠️ EL ENCUADRE: el archivo trae "ANTES" y "DESPUÉS" impresos arriba, pero
 * cortados por el recorte cuadrado de Instagram (se lee "ANTES" / "DESPUÉ").
 * Por eso la franja de texto se recorta con `object-bottom` y los rótulos se
 * ponen en HTML: se leen enteros, escalan en mobile y los lee un lector de
 * pantalla. Si algún día se sube una foto sin texto quemado, sacar el recorte.
 */
export default function AntesDespues() {
  const personalizadosVisible = !isSectionHidden('personalizados');

  return (
    <section className="seccion">
      <div className="container-app">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <Reveal className="relative rounded-3xl overflow-hidden border border-white/10">
            <img
              src="/images/instagram/DaTgGq3xNBQ.webp"
              alt="El mismo termo dos veces: liso a la izquierda, cubierto de calcos de montañas, Messi, Bariloche y frases a la derecha"
              loading="lazy"
              decoding="async"
              width={640}
              height={640}
              className="w-full aspect-[5/4] object-cover object-bottom"
            />
            <span className="antes-despues__rotulo antes-despues__rotulo--antes">Antes</span>
            <span className="antes-despues__rotulo antes-despues__rotulo--despues">Después</span>
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
