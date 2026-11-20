import { Link } from 'react-router-dom';
import BotonCotizar from '../BotonCotizar.jsx';
import { HERO, WHATSAPP, COTIZADOR } from '../../config/negocios.js';
import { FOTO_HERO } from '../../data/negociosFotos.js';
import { trackHeroCta } from '../../lib/analytics.js';

/**
 * Hero de negocio (spec 031, RF-H1…H7; en el pedido, *WholesaleHero*). Lo usan
 * /negocio y la variante B2B del Home (spec 034), cada uno con su copy.
 *
 * En cinco segundos tiene que quedar dicho: qué es (calcos), para quién
 * (negocios), con qué (tu logo), desde cuánto (100) y cuánto sale. Por eso el
 * precio va en el hero y no tres secciones más abajo: el que llega desde un
 * anuncio decide ahí si sigue bajando.
 *
 * MOBILE PRIMERO: texto, precio y CTA van ANTES de la foto en el orden del
 * documento. A 375 × 667 el H1, el precio y el CTA entran sin scrollear
 * (RF-H7); la foto aparece abajo. En pantallas anchas pasa a la derecha.
 *
 * La foto es REAL (`data/negociosFotos.js`): una tirada de calcos con logo. Sin
 * etiquetas flotantes de "packaging" o "merch": esta foto no muestra eso, y
 * ponerlas sería prometer un uso que la imagen no prueba.
 *
 * CTA primario (spec 034, RF-7): con el cotizador en la página, BAJA AL
 * COTIZADOR. Entre el 5/10 y la spec 034 desplegaba WhatsApp o "Dejar mis
 * datos" (enmienda E-1): sin precio online, era lo único que había. El
 * cotizador ya ofrece las dos salidas al lado del precio. Con el cotizador
 * apagado (`COTIZADOR.activo`), vuelve el comportamiento de E-1.
 */
export default function HeroNegocio({ pagina = 'negocio', copy = HERO, secundario = { to: '/negocio#precios', cta: 'precios' } }) {
  const conCotizador = COTIZADOR.activo;

  // El Link cambia el hash y `ScrollToHash` baja; pero si el hash YA es
  // #cotizador (segundo toque), el router no se entera y no pasaría nada.
  const bajarAlCotizador = () => {
    trackHeroCta({ pagina, cta: 'cotizar' });
    document.getElementById('cotizador')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="pt-6 sm:pt-4 pb-10 md:pt-10 md:pb-16">
      <div className="container-app grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-center">
        <div>
          <span className="badge badge-new">{copy.eyebrow}</span>
          <h1 className="font-display font-black text-4xl sm:text-5xl xl:text-6xl leading-[1.02] mt-4">
            {copy.h1}
          </h1>
          <p className="text-white/75 mt-4 text-base md:text-lg max-w-xl">{copy.bajada}</p>

          <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-display font-extrabold text-2xl md:text-3xl gradient-text">
              {copy.precio.principal}
            </span>
            <span className="text-white/55 text-sm">{copy.precio.referencia}</span>
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {conCotizador ? (
              <Link to="#cotizador" onClick={bajarAlCotizador} className="btn-primary min-h-[48px] w-full sm:w-auto">
                {copy.ctaPrimario}
              </Link>
            ) : (
              <BotonCotizar
                origen={`${pagina}_hero`}
                label={copy.ctaPrimario}
                mensaje={WHATSAPP.negocio}
                conPrecio={false}
                alAbrir={() => trackHeroCta({ pagina, cta: 'cotizar' })}
                className="btn-primary min-h-[48px] w-full sm:w-auto"
              />
            )}
            <Link
              to={secundario.to}
              onClick={() => trackHeroCta({ pagina, cta: secundario.cta })}
              className="btn-secondary min-h-[48px]"
            >
              {copy.ctaSecundario}
            </Link>
          </div>
        </div>

        <figure className="relative">
          {/* LCP de la página: carga ya, con prioridad, y con su tamaño
              declarado para que el texto de arriba no salte. Minúscula a
              propósito: React 18 no conoce `fetchPriority` (ver Hero.jsx). */}
          <img
            src={FOTO_HERO.src}
            alt={FOTO_HERO.alt}
            width={FOTO_HERO.width}
            height={FOTO_HERO.height}
            fetchpriority="high"
            decoding="async"
            className="w-full h-auto aspect-[4/3] object-cover rounded-3xl border border-white/10"
          />
          <figcaption className="badge absolute top-4 left-4 bg-black/60 text-white backdrop-blur-sm border border-white/15">
            {HERO.fotoEtiqueta}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
