import BuscadorCalcos from './BuscadorCalcos.jsx';

/**
 * El último bloque antes del footer: la misma pregunta del principio, ahora que
 * ya vio el producto, las fotos reales y los números.
 *
 * Antes la Home terminaba en la FAQ. Alguien que llegaba hasta el final —o sea,
 * el que MÁS interés tiene de todos— se quedaba sin ninguna acción a mano:
 * tenía que scrollear todo para arriba de vuelta. Cerrar con el buscador
 * convierte ese scroll en una búsqueda.
 *
 * Es el mismo componente de la sección de arriba, con otro `origen` para poder
 * separarlos en GA4 y saber si el cierre trabaja.
 */
export default function CtaFinal() {
  return (
    <section className="seccion">
      <div className="container-app max-w-3xl text-center">
        <h2 className="font-display font-extrabold text-3xl md:text-5xl leading-[1.05]">
          Hay una calco para eso que te gusta.
        </h2>
        <p className="text-white/70 mt-4 text-base md:text-lg">
          Buscala y hacé más tuyas tus cosas.
        </p>

        <BuscadorCalcos
          className="mt-8"
          size="lg"
          origen="cta_final"
          placeholder="¿Qué estás buscando?"
        />
      </div>
    </section>
  );
}
