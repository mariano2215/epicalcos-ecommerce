import { Link } from 'react-router-dom';
import { HERO, WHATSAPP } from '../../config/negocios.js';
import { COTIZAR_HREF } from '../../config/site.js';
import { FOTO_HERO } from '../../data/negociosFotos.js';
import { hrefWhatsapp } from '../../lib/whatsapp.js';
import { trackHeroCta, trackWhatsappClick } from '../../lib/analytics.js';

/**
 * Hero de negocio (spec 031, RF-H1…H7; en el pedido, *WholesaleHero*).
 *
 * En cinco segundos tiene que quedar dicho: qué es (calcos), para quién
 * (negocios), con qué (tu logo), desde cuánto (100) y cuánto sale. Por eso el
 * precio va en el hero y no tres secciones más abajo: el que llega desde un
 * anuncio decide ahí si sigue bajando.
 *
 * MOBILE PRIMERO: texto, precio y CTA van ANTES de la foto en el orden del
 * documento. A 375 × 667 el H1, el precio y "Cotizar mis calcos" entran sin
 * scrollear (RF-H7); la foto aparece abajo. En pantallas anchas pasa a la
 * derecha.
 *
 * La foto es REAL (`data/negociosFotos.js`): una tirada de calcos con logo. Sin
 * etiquetas flotantes de "packaging" o "merch": esta foto no muestra eso, y
 * ponerlas sería prometer un uso que la imagen no prueba.
 *
 * CTAs (RF-CTA1): "Cotizar mis calcos" lleva al bloque de compra de la página.
 * El segundo es WhatsApp y no "Ver precios" porque, hasta que exista la escala
 * (Fase 2), los precios están en ese MISMO bloque: dos botones al mismo lugar
 * es uno de más.
 */
export default function HeroNegocio({ pagina = 'negocio' }) {
  return (
    <section className="pt-6 sm:pt-4 pb-10 md:pt-10 md:pb-16">
      <div className="container-app grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-center">
        <div>
          <span className="badge badge-new">{HERO.eyebrow}</span>
          <h1 className="font-display font-black text-4xl sm:text-5xl xl:text-6xl leading-[1.02] mt-4">
            {HERO.h1}
          </h1>
          <p className="text-white/75 mt-4 text-base md:text-lg max-w-xl">{HERO.bajada}</p>

          <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-display font-extrabold text-2xl md:text-3xl gradient-text">
              {HERO.precio.principal}
            </span>
            <span className="text-white/55 text-sm">{HERO.precio.referencia}</span>
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              to={COTIZAR_HREF}
              onClick={() => trackHeroCta({ pagina, cta: 'cotizar' })}
              className="btn-primary min-h-[48px]"
            >
              {HERO.ctaPrimario}
            </Link>
            <a
              href={hrefWhatsapp(WHATSAPP.negocio)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackHeroCta({ pagina, cta: 'whatsapp' });
                trackWhatsappClick(`${pagina}_hero`);
              }}
              className="btn-secondary min-h-[48px]"
            >
              {HERO.ctaWhatsapp}
            </a>
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
