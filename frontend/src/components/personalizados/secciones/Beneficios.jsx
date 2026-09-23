import { BENEFICIOS } from '../../../config/personalizadosLanding.js';
import Reveal from '../../Reveal.jsx';

/**
 * Cuatro beneficios en cards (RF-L7). No reusa el `Beneficios` del Home a
 * propósito: allá el cuarto es "Miles de diseños", que en esta página no aplica
 * (acá el diseño lo trae el cliente). Mismo formato, otro contenido.
 */
export default function Beneficios() {
  return (
    <section className="seccion">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">{BENEFICIOS.titulo}</h2>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {BENEFICIOS.items.map((b, i) => (
            <Reveal key={b.titulo} delay={i * 80} className="h-full">
              <div className="card-glass p-5 sm:p-6 h-full">
                <div className="text-3xl sm:text-4xl mb-3" aria-hidden="true">
                  {b.icon}
                </div>
                <h3 className="font-display font-extrabold text-base sm:text-lg leading-tight">{b.titulo}</h3>
                <p className="text-sm text-white/60 mt-2 leading-snug">{b.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
