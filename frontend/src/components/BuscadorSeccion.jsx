import BuscadorCalcos from './BuscadorCalcos.jsx';
import { CATEGORY_COUNT } from '../data/catalogStats.js';

/**
 * El buscador como sección propia, inmediatamente después del hero.
 *
 * En una tienda de 5 productos, buscar es una comodidad. Acá el catálogo tiene
 * {CATEGORY_COUNT} categorías y miles de diseños: buscar ES la navegación. Como
 * input chico al final del hero pasaba desapercibido; con su propio título,
 * su propio espacio y los chips diciendo qué se puede pedir, deja de ser un
 * campo de texto y pasa a ser una invitación.
 *
 * Los chips no son filtros: son ejemplos. Responden la pregunta que se hace
 * cualquiera frente a un buscador vacío —"¿qué tienen?"— sin obligar a
 * escribir nada.
 */
export default function BuscadorSeccion() {
  return (
    <section className="seccion">
      <div className="container-app max-w-3xl text-center">
        <h2 className="font-display font-extrabold text-3xl md:text-5xl">¿Qué te gusta?</h2>
        <p className="text-white/65 mt-3 text-sm md:text-base">
          Escribí una serie, un club, un personaje o una frase. Hay diseños en {CATEGORY_COUNT} categorías.
        </p>

        <BuscadorCalcos className="mt-7" size="lg" chips origen="home_seccion" />
      </div>
    </section>
  );
}
