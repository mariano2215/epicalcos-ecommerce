import Reveal from '../Reveal.jsx';
import { USOS } from '../../config/negocios.js';

/**
 * Para qué las usan los negocios, por rubro (spec 031 RF-U1, spec 034 D-11;
 * en el pedido, *UseCaseCard*). El que llega de un anuncio para gimnasios
 * tiene que verse en la página en el primer scroll.
 *
 * SIN FOTOS a propósito: no hay fotos reales de calcos aplicadas en negocios
 * (BUSINESS-TODOS N-6) y la regla de Mariano es no poner ninguna otra — ni
 * stock, ni mockups, ni renders. El día que lleguen, se cargan en
 * `data/negociosFotos.js` y la card las suma.
 */
export default function UsosNegocio() {
  return (
    <section className="seccion">
      <div className="container-app">
        <div className="seccion-encabezado text-center max-w-3xl mx-auto">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">{USOS.titulo}</h2>
        </div>
        <ul className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {USOS.items.map((u, i) => (
            <Reveal key={u.id} as="li" delay={i * 50} className="card-glass p-4 md:p-6 h-full">
              <span className="text-3xl leading-none" aria-hidden>{u.icono}</span>
              <h3 className="font-display font-extrabold text-lg mt-3">{u.t}</h3>
              <p className="text-sm text-white/65 mt-1.5 leading-snug">{u.d}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
