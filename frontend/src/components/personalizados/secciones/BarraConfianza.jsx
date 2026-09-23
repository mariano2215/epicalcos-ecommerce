import { CONFIANZA } from '../../../config/personalizadosLanding.js';

/**
 * Barra de confianza compacta, justo después del hero (RF-L1). Los números son
 * los mismos de la Home (`brandStats`, `shipping.production`): escritos acá a
 * mano, algún día dirían otra cosa. En mobile 2×2 y bajita: no le puede robar
 * la pantalla al configurador que está arriba.
 */
export default function BarraConfianza() {
  return (
    <section aria-label="EPICALCOS en números" className="container-app pb-10">
      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {CONFIANZA.map((c) => (
          <li key={c.valor} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
            <div className="font-display font-extrabold text-base sm:text-2xl leading-tight">{c.valor}</div>
            <div className="text-[11px] sm:text-xs text-white/60 mt-0.5">{c.label}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
