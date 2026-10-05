import { CONFIANZA } from '../../config/negocios.js';

/**
 * Los cuatro datos que tiene que tener a la vista un negocio antes de seguir
 * bajando (spec 031, RF-T1; en el pedido, *TrustBar*): desde cuánto, la muestra
 * gratis, cuánto tarda y quiénes ya compraron.
 *
 * Todos son verificables y salen del config (`config/negocios.js`): el plazo de
 * `shipping.produccionVolumen`, la cantidad de marcas de la lista de logos. Si
 * mañana se suma una marca al ticker, este número sube solo.
 *
 * Es una lista y no una grilla de cards: son datos para escanear, no cuatro
 * cosas para leer de a una. Dos columnas en el celular, cuatro desde tablet.
 */
export default function BarraConfianza() {
  return (
    <section aria-label="Por qué pedir tus calcos acá" className="pb-6">
      <div className="container-app">
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CONFIANZA.map((d) => (
            <li key={d.label} className="card-glass p-4 md:p-5 flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5" aria-hidden>{d.icono}</span>
              <span className="min-w-0">
                <span className="block font-display font-extrabold text-base md:text-lg leading-tight">{d.valor}</span>
                <span className="block text-xs md:text-sm text-white/60 mt-1 leading-snug">{d.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
