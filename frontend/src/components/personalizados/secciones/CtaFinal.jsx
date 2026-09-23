import { CTA_FINAL } from '../../../config/personalizadosLanding.js';
import { IDS, abrirSelector } from '../acciones.js';

/**
 * Cierre de la página (RF-L16). "Hacer mi calco" vuelve al configurador y abre
 * el selector en el mismo gesto: el que llegó hasta acá es el más interesado de
 * todos y no tiene por qué scrollear todo para arriba. El `id` lo usa la barra
 * fija para irse cuando aparece este bloque.
 */
export default function CtaFinal() {
  return (
    <section id={IDS.ctaFinal} className="seccion">
      <div className="container-app max-w-3xl text-center">
        <h2 className="font-display font-extrabold text-3xl md:text-5xl leading-[1.05]">{CTA_FINAL.titulo}</h2>
        <p className="text-white/70 mt-4 text-base md:text-lg">{CTA_FINAL.bajada}</p>
        <button type="button" onClick={() => abrirSelector('cta_final')} className="btn-primary mt-8">
          {CTA_FINAL.cta}
        </button>
        <p className="text-xs text-white/50 mt-3">{CTA_FINAL.nota}</p>
      </div>
    </section>
  );
}
