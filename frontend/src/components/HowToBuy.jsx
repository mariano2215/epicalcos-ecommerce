import Reveal from './Reveal.jsx';
import { shipping } from '../config/site.js';
import { SIZES } from '../config/pricing.js';

/** "4, 6 o 9 cm", derivado de SIZES — no escrito a mano. */
const TAMANOS = SIZES.map((s) => s.label.replace(' cm', '')).join(', ').replace(/, ([^,]*)$/, ' o $1');

/**
 * Cómo comprar, en cuatro verbos.
 *
 * Los pasos decían la instrucción completa ("Seleccioná las calcos y el
 * tamaño", "Andá al carrito y completá tus datos"): correcto, pero es un
 * manual. Acá el trabajo no es explicar el checkout —el checkout se explica
 * solo— sino sacarle a alguien la sensación de que comprar va a ser un lío.
 * Cuatro verbos en mayúscula y una línea abajo hacen eso; cuatro oraciones, no.
 *
 * ⚠️ Los plazos y los tamaños salen del config: este bloque ya se había quedado
 * viejo una vez y contradecía al checkout.
 */
const PASOS = [
  {
    n: '1',
    icon: '🔎',
    t: 'Elegí',
    d: 'Buscá entre miles de diseños — o subí el tuyo.'
  },
  {
    n: '2',
    icon: '🛒',
    t: 'Agregá',
    d: `Elegí el tamaño (${TAMANOS} cm) y la cantidad.`
  },
  {
    n: '3',
    icon: '🔒',
    t: 'Comprá',
    d: 'Pagás online con Mercado Pago o por transferencia.'
  },
  {
    n: '4',
    icon: '✨',
    t: 'Pegá',
    d: `Producción ${shipping.production}. Te llegan y personalizás lo que quieras.`
  }
];

export default function HowToBuy() {
  return (
    <section className="seccion">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">¿Cómo funciona?</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASOS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90} className="card-glass p-6 relative h-full">
              <div className="absolute top-3 right-4 font-display font-extrabold text-4xl text-white/10" aria-hidden>
                {s.n}
              </div>
              <div className="text-4xl mb-4" aria-hidden>{s.icon}</div>
              <h3 className="font-display font-extrabold text-lg leading-tight">{s.t}</h3>
              <p className="text-white/60 text-sm mt-2 leading-snug">{s.d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
