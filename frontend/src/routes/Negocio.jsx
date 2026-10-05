import Breadcrumbs from '../components/Breadcrumbs.jsx';
import MarcasConfiaron from '../components/MarcasConfiaron.jsx';
import NegocioForm from '../components/NegocioForm.jsx';
import HeroNegocio from '../components/negocios/HeroNegocio.jsx';
import BarraConfianza from '../components/negocios/BarraConfianza.jsx';
import ComoFunciona from '../components/negocios/ComoFunciona.jsx';
import CtaFinalNegocio from '../components/negocios/CtaFinalNegocio.jsx';
import { useSeo, abs } from '../lib/seo.js';
import { SEO } from '../config/negocios.js';
import { FOTO_HERO } from '../data/negociosFotos.js';

/**
 * /negocio — calcos para negocios (spec 031, Fase 1).
 *
 *   qué es y cuánto sale → por qué confiar → quiénes ya compraron →
 *   comprar → cómo sigue → cerrar
 *
 * Hasta el 5/10/2026 la página era el formulario de la Promo Negocio con el
 * ticker de marcas arriba. Las marcas siguen yendo ANTES del formulario (el
 * que llega de un anuncio sin conocer la marca necesita ver quiénes ya
 * compraron antes de encargar 100 calcos de su logo), pero ahora las precede un
 * hero que dice qué es esto y cuánto sale.
 *
 * El bloque de compra sigue siendo la Promo Negocio de siempre: el cotizador
 * con cantidades, tamaños y materiales llega en la Fase 2 y ocupa este mismo
 * lugar. Por eso las anclas `#cotizar` (botón "Cotizar" del header y CTAs) y
 * `#precios` (nav) apuntan acá desde ya: cuando cambie el contenido, los links
 * siguen sirviendo.
 */
export default function Negocio() {
  useSeo({ title: SEO.negocio.title, description: SEO.negocio.description, image: abs(FOTO_HERO.src) });

  return (
    <div className="page-gradient min-h-screen">
      {/* Las migas, solo desde sm: en el celular le comían al hero los 50 px
          que hacen que "Cotizar mis calcos" entre sin scrollear (RF-H7), y ahí
          el logo del header ya lleva al inicio. */}
      <div className="container-app pt-6 hidden sm:block">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Calcos para negocios' }]} />
      </div>

      <HeroNegocio />
      <BarraConfianza />
      <MarcasConfiaron />

      {/* `pb-10` y no `py-10`: la sección de marcas ya trae su propio espacio
          abajo, y con los dos el formulario quedaba flotando. */}
      <section id="cotizar" className="container-app pb-10 scroll-mt-24">
        <div id="precios" className="scroll-mt-24">
          <NegocioForm conFoto={false} />
        </div>
      </section>

      <ComoFunciona />
      <CtaFinalNegocio />
    </div>
  );
}
