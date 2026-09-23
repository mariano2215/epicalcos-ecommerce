import { useState } from 'react';
import { FAQ, FAQ_TITULO } from '../../../config/personalizadosLanding.js';

/**
 * FAQ propia de personalizados (RF-L15). Las preguntas y respuestas viven en
 * `personalizadosLanding.js` porque el HTML estático que se genera para los
 * buscadores las repite tal cual (y el JSON-LD `FAQPage` sale de ahí también):
 * lo que lee Google y lo que lee el cliente no pueden diferir.
 */
export default function Faq() {
  const [abierta, setAbierta] = useState(-1);
  return (
    <section className="seccion">
      <div className="container-app max-w-3xl">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">{FAQ_TITULO}</h2>
        </div>
        <div className="space-y-3">
          {FAQ.map((f, i) => {
            const open = abierta === i;
            const idRespuesta = `faq-personalizados-${i}`;
            return (
              <div key={f.q} className="card-glass overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAbierta(open ? -1 : i)}
                  aria-expanded={open}
                  aria-controls={idRespuesta}
                  className="w-full min-h-[44px] p-5 flex items-center justify-between gap-4 text-left"
                >
                  <span className="font-semibold">{f.q}</span>
                  <span className={`text-xl transition-transform ${open ? 'rotate-45' : ''}`} aria-hidden="true">
                    +
                  </span>
                </button>
                <div id={idRespuesta} hidden={!open} className="px-5 pb-5 text-white/70">
                  {f.a}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
