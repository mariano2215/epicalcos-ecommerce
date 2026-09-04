import { Link } from 'react-router-dom';
import StickerField from './StickerField.jsx';
import { isSectionHidden } from '../config/site.js';
import { trackCustomStickerClick } from '../lib/analytics.js';

/**
 * El hero: UNA idea, un elemento dominante, dos salidas.
 *
 * QUÉ HABÍA ACÁ HASTA EL 4/9/2026, todo junto y arriba del fold: un badge de
 * "calcos premium", una card de promo (o de envío gratis) con precio y CTA
 * propios, un titular que rotaba entre 5 frases con animación permanente, un H1
 * distinto y más chico que ese titular, un párrafo de propuesta, una tira de 4
 * badges de confianza, un buscador y 14 calcos flotando de fondo. Ocho
 * elementos compitiendo: ninguno ganaba, y en un celular de 375 px la persona
 * que venía de un anuncio de Instagram tenía que decidir qué mirar antes de
 * entender qué se vendía.
 *
 * Ahora: figura y fondo. La figura es el H1. El fondo es el degradado con las
 * calcos, bajado a 8 piezas y menos opacidad justamente para que sea fondo.
 * Debajo, una línea de subtítulo y exactamente DOS caminos — el catálogo y los
 * personalizados—, que son las dos únicas cosas que alguien puede querer hacer
 * al llegar.
 *
 * Lo que se fue no se perdió, se mudó a donde se lee:
 *   · la promo / el envío gratis → la barra superior y `OfertaPrincipal`
 *   · los badges de confianza    → `Beneficios` y `MetricasConfianza`
 *   · el buscador                → su propia sección, cuatro veces más grande
 *
 * ⚠️ SEO: el H1 pasó a ser el titular grande. Antes era un H1 chico y aparte
 * ("Calcos y stickers personalizados") porque el titular grande rotaba 5 frases
 * y no podía ser un heading; sin titular rotante esa razón ya no existe. El
 * término principal ("calcos") sigue en el H1, y "stickers personalizados"
 * quedó en el subtítulo, en el `title` y en la meta description (`lib/seo.js`,
 * que NO se tocó).
 *
 * ⚠️ `eagerFirst` se mantiene: la primera calco del campo sigue siendo la única
 * imagen arriba del fold de todo el Home y es la que define el LCP.
 */
export default function Hero() {
  const personalizadosVisible = !isSectionHidden('personalizados');

  return (
    <section className="hero-gradient relative">
      <div className="hero-aurora" aria-hidden="true" />
      <StickerField count={8} opacity={0.22} eagerFirst />

      <div className="container-app pt-16 pb-14 md:pt-28 md:pb-24 text-center relative z-10">
        <h1 className="font-display font-black text-[2rem] leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl max-w-4xl mx-auto">
          Calcos para todo <span className="gradient-text">lo que te gusta</span>
        </h1>

        <p className="mt-5 max-w-xl mx-auto text-white/75 text-base md:text-lg leading-snug">
          Miles de diseños para personalizar tu termo, mate, notebook o botella. Y si querés el
          tuyo, hacemos stickers personalizados con tu propio diseño.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/categorias" className="btn-primary w-full sm:w-auto">
            Ver todos los diseños
          </Link>
          {personalizadosVisible && (
            <Link
              to="/personalizados"
              onClick={() => trackCustomStickerClick('hero')}
              className="btn-secondary w-full sm:w-auto"
            >
              Hacer mis propias calcos
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
