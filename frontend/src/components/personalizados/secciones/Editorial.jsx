import { EDITORIAL } from '../../../config/personalizadosLanding.js';
import { abrirSelector } from '../acciones.js';

/**
 * Bloque editorial (RF-L6): lo que diferencia al personalizado del catálogo.
 * Solo texto a propósito — es la sección que no necesita fotos para decir lo
 * suyo. El claim va como <p>: el H1 de la página es uno solo (RF-S5).
 */
export default function Editorial() {
  return (
    <section className="seccion">
      <div className="container-app max-w-3xl text-center">
        <h2 className="font-display font-extrabold text-3xl md:text-5xl leading-[1.05]">{EDITORIAL.titulo}</h2>
        <p className="text-white/65 mt-4 text-base md:text-lg">{EDITORIAL.bajada}</p>
        <ul className="flex flex-wrap justify-center gap-2 mt-8">
          {EDITORIAL.lista.map((x) => (
            <li key={x} className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/85">
              {x}
            </li>
          ))}
        </ul>
        <p className="font-display font-black text-4xl md:text-6xl mt-10 gradient-text">{EDITORIAL.cierre}</p>
        <button type="button" onClick={() => abrirSelector('editorial')} className="btn-primary mt-6">
          {EDITORIAL.cta}
        </button>
      </div>
    </section>
  );
}
