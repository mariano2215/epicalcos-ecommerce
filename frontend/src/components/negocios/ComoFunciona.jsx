import Reveal from '../Reveal.jsx';
import { PASOS } from '../../config/negocios.js';

/**
 * "Cómo funciona" para negocios (spec 031, RF-P1; en el pedido, *HowItWorks*):
 * cuatro pasos en forma de línea de tiempo.
 *
 * El paso 3 es la MUESTRA GRATIS: una vista previa digital por WhatsApp antes
 * de producir, que Mariano sumó el 5/10/2026 para los pedidos de 100 o más.
 * Hasta ese día la regla era la contraria (no se mandaba prueba y no se decía),
 * y sigue siéndolo para los pedidos chicos: este bloque vive solo en páginas de
 * negocio, nunca en la tienda ni en /personalizados.
 *
 * `id="como-funciona"`: lo apuntan el footer ("Cómo funciona") y, desde la
 * Fase 2, el resto del sitio. NO renombrar.
 */
export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="seccion scroll-mt-24">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">{PASOS.titulo}</h2>
        </div>
        <ol className="grid gap-3 md:grid-cols-4">
          {PASOS.items.map((p, i) => (
            <Reveal key={p.t} as="li" delay={i * 60} className="card-glass p-5 md:p-6 relative h-full">
              <span
                className="font-display font-black text-3xl gradient-text leading-none"
                aria-hidden
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-display font-extrabold text-lg leading-tight mt-3">{p.t}</h3>
              <p className="text-sm text-white/65 mt-2 leading-snug">{p.d}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
