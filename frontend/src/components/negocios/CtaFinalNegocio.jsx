import { Link } from 'react-router-dom';
import BotonCotizar from '../BotonCotizar.jsx';
import { CTA_FINAL, WHATSAPP } from '../../config/negocios.js';

/**
 * Cierre de las páginas de negocio (spec 031, RF-Z1). El que llegó hasta acá es
 * el más interesado de todos: tiene que encontrar la acción sin volver a subir.
 *
 * Mismos dos CTAs que el hero y con el mismo nombre (RF-CTA1): un botón que en
 * cada sección se llama distinto obliga a preguntarse si lleva a otro lado.
 */
export default function CtaFinalNegocio({ pagina = 'negocio' }) {
  return (
    <section className="seccion">
      <div className="container-app">
        <div
          className="card-glass p-8 md:p-12 text-center"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, rgba(58,134,255,.35), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,27,141,.35), transparent 50%), rgba(32,32,32,.82)'
          }}
        >
          <h2 className="font-display font-black text-3xl md:text-5xl leading-[1.05]">{CTA_FINAL.h2}</h2>
          <p className="text-white/75 mt-4 text-base md:text-lg">{CTA_FINAL.bajada}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <BotonCotizar
              origen={`${pagina}_cta_final`}
              label={CTA_FINAL.ctaPrimario}
              mensaje={WHATSAPP.negocio}
              className="btn-primary min-h-[48px] w-full sm:w-auto"
            />
            <Link to="/negocio#precios" className="btn-secondary min-h-[48px]">
              {CTA_FINAL.ctaSecundario}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
