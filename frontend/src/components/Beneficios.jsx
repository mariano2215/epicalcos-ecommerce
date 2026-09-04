import Reveal from './Reveal.jsx';
import { beneficios } from '../config/brandStats.js';

/**
 * Por qué comprar acá — cuatro razones, cada una con su propio aire.
 *
 * Estos mismos argumentos existían como una tira de píldoras de 12 px dentro
 * del hero (`TrustBadges`), compitiendo con otras siete cosas. Una ventaja
 * escrita en 12 px al lado de un precio, un buscador y una promo no la lee
 * nadie: se ve como decoración.
 *
 * `TrustBadges` NO desaparece: sigue siendo la versión chica para poner al lado
 * de un CTA (ficha de producto, /personalizados). Esta es la versión que se lee,
 * y las dos salen de `config/brandStats.js`.
 */
export default function Beneficios() {
  return (
    <section className="seccion">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">Por qué son épicas</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {beneficios.map((b, i) => (
            <Reveal key={b.titulo} delay={i * 80} className="h-full">
              <div className="card-glass p-6 h-full">
                <div className="text-4xl mb-4" aria-hidden>{b.icon}</div>
                <h3 className="font-display font-extrabold text-lg leading-tight">{b.titulo}</h3>
                <p className="text-sm text-white/60 mt-2 leading-snug">{b.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
