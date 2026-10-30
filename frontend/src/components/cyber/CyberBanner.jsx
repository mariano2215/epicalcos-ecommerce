import { Link } from 'react-router-dom';
import { PromoCountdown } from '../PromoBanner.jsx';
import { CYBER_END_MS, isCyberPreview } from '../../config/pricing.js';
import { EPICYBER_COPY } from '../../config/epicyber.js';
import { useCyberActive } from '../../lib/promo.js';

/** Negro, fucsia, naranja y amarillo: la paleta de marca, sin imagen que esperar. */
export const FONDO_CYBER = {
  backgroundImage:
    'radial-gradient(circle at 12% 18%, rgba(255,216,77,.22), transparent 42%), radial-gradient(circle at 88% 12%, rgba(255,90,31,.34), transparent 46%), radial-gradient(circle at 60% 110%, rgba(255,27,141,.42), transparent 56%), linear-gradient(#0b0b0b, #0b0b0b)'
};

/**
 * El banner de la campaña en el Home (spec 036).
 *
 * Va en el chunk principal, a diferencia de las secciones de abajo: es texto, no
 * espera ninguna imagen, y cargarlo aparte haría saltar el Home al aparecer. Con
 * la campaña apagada no renderiza nada.
 */
export default function CyberBanner({ soloTitulo = false }) {
  const activa = useCyberActive();
  if (!activa) return null;
  const { titulo, subtitulo, texto, cta } = EPICYBER_COPY.banner;

  return (
    <section aria-label={titulo} className="container-app pt-4 md:pt-6">
      <div
        className="rounded-3xl border border-brand-fuchsia/40 px-4 py-5 md:px-10 md:py-10 text-center"
        style={FONDO_CYBER}
      >
        {/* En 375 px el título entra en una línea y el subtítulo en dos: cada
            renglón de acá es un pack que baja del primer scroll. */}
        <h2 className="font-display font-black text-3xl md:text-7xl leading-none text-brand-yellow">
          {titulo}
        </h2>
        <p className="mt-2 font-display font-extrabold text-sm md:text-2xl">{subtitulo}</p>
        <p className="mt-1 text-xs md:text-base text-white/75 max-w-xl mx-auto">{texto}</p>
        <div className="mt-3 flex flex-col md:flex-row items-center justify-center gap-3">
          <PromoCountdown endMs={CYBER_END_MS} />
          {/* En /epicyber las ofertas ya están abajo: el botón no llevaría a ningún lado. */}
          {!soloTitulo && (
            <Link to="/epicyber" className="btn-primary w-full md:w-auto">
              {cta}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Aviso permanente de la vista previa: nadie tiene que poder confundirla con la
 * tienda real ni pensar que esos precios ya están publicados.
 */
export function CyberAvisoPreview() {
  if (!isCyberPreview()) return null;
  return (
    <div
      role="status"
      className="fixed bottom-0 inset-x-0 z-40 bg-brand-yellow text-black text-[11px] md:text-sm font-semibold pl-4 pr-24 py-1.5 flex items-center gap-3"
    >
      {/* `pr-24`: a la derecha flota el botón de WhatsApp. */}
      <span>VISTA PREVIA · Sin aprobar · No se puede pagar</span>
      <a href="/?epicyber=off" className="underline underline-offset-2 whitespace-nowrap">
        Salir
      </a>
    </div>
  );
}
