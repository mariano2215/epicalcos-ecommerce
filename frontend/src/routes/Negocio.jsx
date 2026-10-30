import Breadcrumbs from '../components/Breadcrumbs.jsx';
import MarcasConfiaron from '../components/MarcasConfiaron.jsx';
import { CyberAvisoPagina } from '../components/cyber/CyberAvisos.jsx';
import NegocioForm from '../components/NegocioForm.jsx';
import HeroNegocio from '../components/negocios/HeroNegocio.jsx';
import BarraConfianza from '../components/negocios/BarraConfianza.jsx';
import Cotizador from '../components/negocios/Cotizador.jsx';
import EscalaVolumen from '../components/negocios/EscalaVolumen.jsx';
import UsosNegocio from '../components/negocios/UsosNegocio.jsx';
import ComoFunciona from '../components/negocios/ComoFunciona.jsx';
import Materiales from '../components/negocios/Materiales.jsx';
import PreguntasNegocio from '../components/negocios/PreguntasNegocio.jsx';
import PedidosGrandes from '../components/negocios/PedidosGrandes.jsx';
import CtaFinalNegocio from '../components/negocios/CtaFinalNegocio.jsx';
import { useSeo, abs } from '../lib/seo.js';
import { jsonLdNegocio } from '../lib/negociosEstatico.js';
import { SEO, COTIZADOR } from '../config/negocios.js';
import { FOTO_HERO } from '../data/negociosFotos.js';

/**
 * /negocio — calcos para negocios (spec 031 Fases 1–3, spec 034).
 *
 *   qué es y cuánto sale → por qué confiar → quiénes ya compraron →
 *   cuánto sale MI pedido (cotizador) → la escala → para qué lo usan →
 *   cómo sigue → materiales → dudas → pedidos grandes → cerrar
 *
 * El cotizador va ANTES de los usos y los materiales: el que llega de un
 * anuncio de negocio viene a saber cuánto le sale; el resto es para el que
 * todavía duda, y lo encuentra bajando. Las marcas siguen yendo antes de la
 * compra: el que no conoce la marca necesita ver quiénes ya compraron antes de
 * encargar 100 calcos de su logo.
 *
 * Desde la spec 034 el bloque de compra es el cotizador (100 · 6 cm · vinilo
 * blanco cuesta lo mismo que la Promo Negocio, y el holográfico lo mismo que
 * Negocio + tornasolado). Con `COTIZADOR.activo = false` vuelve el formulario
 * de la Promo Negocio, que queda en el repo para eso.
 *
 * Anclas que apuntan otras páginas — NO renombrar: `#cotizar` y `#cotizador`
 * (botón Cotizar, heros, CTA final), `#precios` (la escala), `#como-funciona`
 * (footer) y `#preguntas`.
 */
export default function Negocio() {
  useSeo({
    title: SEO.negocio.title,
    description: SEO.negocio.description,
    image: abs(FOTO_HERO.src),
    // El mismo @graph que lleva el HTML prerenderizado: al montar, React lo
    // reemplaza en vez de duplicarlo.
    jsonLd: jsonLdNegocio()
  });

  return (
    <div className="page-gradient min-h-screen">
      {/* Las migas, solo desde sm: en el celular le comían al hero los 50 px
          que hacen que "Cotizar mis calcos" entre sin scrollear (RF-H7), y ahí
          el logo del header ya lleva al inicio. */}
      <div className="container-app pt-6 hidden sm:block">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Calcos para negocios' }]} />
      </div>

      <CyberAvisoPagina qty={100} texto="con tu logo o tus diseños" />
      <HeroNegocio />
      <BarraConfianza />
      <MarcasConfiaron />

      {/* `pb-10` y no `py-10`: la sección de marcas ya trae su propio espacio
          abajo, y con los dos el bloque de compra quedaba flotando. */}
      <section id="cotizar" className="container-app pb-10 scroll-mt-24">
        {COTIZADOR.activo ? (
          <Cotizador pagina="negocio" />
        ) : (
          <div id="precios" className="scroll-mt-24">
            <NegocioForm conFoto={false} />
          </div>
        )}
      </section>

      {COTIZADOR.activo && <EscalaVolumen id="precios" />}
      <UsosNegocio />
      <ComoFunciona />
      <Materiales />
      <PreguntasNegocio pagina="negocio" />
      <PedidosGrandes pagina="negocio" />
      <CtaFinalNegocio />
    </div>
  );
}
