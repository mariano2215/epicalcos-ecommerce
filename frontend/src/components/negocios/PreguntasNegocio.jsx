import { PREGUNTAS } from '../../config/negocios.js';
import { faqPageJsonLd } from '../../lib/negociosEstatico.js';
import { trackFaqOpen } from '../../lib/analytics.js';

/**
 * Preguntas de negocio (spec 031 RF-F1…F3). Cada respuesta sale de un dato del
 * config o de una decisión de Mariano ya tomada; las que dependen de algo que
 * todavía no respondió (recompra, ajuste de logos, reparto entre diseños) no
 * están (ver `config/negocios.js`).
 *
 * `<details>` nativo: abre y cierra con teclado y lector de pantalla sin una
 * línea de JS, y el texto queda en el DOM para Google aunque esté cerrado.
 *
 * `conJsonLd`: en /negocio el `FAQPage` va en el `@graph` de la página
 * (`jsonLdNegocio()`, el mismo que lleva el HTML prerenderizado); acá solo se
 * pide donde la página no tiene uno propio (el Home B2B). Dos `FAQPage` en la
 * misma URL es un error en el informe de datos estructurados.
 */
export default function PreguntasNegocio({ pagina = 'negocio', conJsonLd = false }) {
  return (
    <section id="preguntas" className="seccion scroll-mt-24">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">{PREGUNTAS.titulo}</h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {PREGUNTAS.items.map((p) => (
            <details
              key={p.id}
              className="card-glass overflow-hidden group"
              onToggle={(e) => {
                if (e.currentTarget.open) trackFaqOpen({ pregunta_id: p.id, pagina });
              }}
            >
              <summary className="p-5 min-h-[56px] flex items-center justify-between gap-4 cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
                <span>{p.q}</span>
                <span className="text-xl transition-transform group-open:rotate-45 shrink-0" aria-hidden>
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-white/70">{p.a}</p>
            </details>
          ))}
        </div>
        {conJsonLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd()) }} />
        )}
      </div>
    </section>
  );
}
