import Reveal from './Reveal.jsx';
import { brandStats } from '../config/brandStats.js';
import { shipping } from '../config/site.js';

/**
 * Los números del negocio, en grande y quietos.
 *
 * Hasta el 4/9/2026 "+120.000 calcos" y "+5.000 clientes" existían UNA sola vez
 * en toda la Home: adentro de la marquesina de anuncios, en 12 px, moviéndose y
 * entre otras cinco frases. La prueba social más fuerte que tiene EPICALCOS
 * estaba escondida dentro de un elemento decorativo — y encima en movimiento,
 * que es exactamente la condición en la que un número no se lee.
 *
 * Acá no hay animación de ningún tipo (más allá del reveal de entrada): un
 * número que se mueve no se puede leer, y estos tres son el argumento.
 *
 * ⚠️ Los tres salen del config. `brandStats` son datos REALES del negocio y
 * `shipping.production` es el mismo plazo que promete el checkout y el mail de
 * confirmación. Escribirlos acá a mano sería garantizar que algún día digan una
 * cosa distinta que el resto del sitio.
 */
const METRICAS = [
  { valor: brandStats.calcosVendidas.value, label: brandStats.calcosVendidas.label },
  { valor: brandStats.clientes.value, label: brandStats.clientes.label },
  { valor: shipping.production.replace(' hábiles', ''), label: 'de producción' }
];

export default function MetricasConfianza() {
  return (
    <section className="seccion">
      <div className="container-app">
        <div className="grid gap-8 sm:gap-6 sm:grid-cols-3 text-center">
          {METRICAS.map((m, i) => (
            <Reveal key={m.label} delay={i * 90}>
              <div className="metrica__numero">{m.valor}</div>
              <div className="metrica__label">{m.label}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
