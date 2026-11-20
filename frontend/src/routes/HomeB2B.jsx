import HeroNegocio from '../components/negocios/HeroNegocio.jsx';
import BarraConfianza from '../components/negocios/BarraConfianza.jsx';
import Cotizador from '../components/negocios/Cotizador.jsx';
import EscalaVolumen from '../components/negocios/EscalaVolumen.jsx';
import UsosNegocio from '../components/negocios/UsosNegocio.jsx';
import ComoFunciona from '../components/negocios/ComoFunciona.jsx';
import PedidosGrandes from '../components/negocios/PedidosGrandes.jsx';
import CaminoTienda from '../components/negocios/CaminoTienda.jsx';
import PreguntasNegocio from '../components/negocios/PreguntasNegocio.jsx';
import CtaFinalNegocio from '../components/negocios/CtaFinalNegocio.jsx';
import MarcasConfiaron from '../components/MarcasConfiaron.jsx';
import Testimonials from '../components/Testimonials.jsx';
import { HOME_B2B } from '../config/negocios.js';

/**
 * Variante B2B del Home (spec 031 Fase 3, spec 034 §7.3) — experimento
 * `home_b2b`, APAGADO. Se ve con `?exp_home_b2b=b2b`.
 *
 *   tu marca + precio → confianza → quiénes ya compraron → cotizador →
 *   escala → para qué → qué dicen → cómo funciona → pedidos grandes →
 *   ¿para vos? la tienda → preguntas → cerrar
 *
 * El copy del hero es el que propuso Mariano el 17/10/2026 ("Tu marca merece
 * calcos que se destaquen"). El precio dice el de 100 Y el de 1.000, cada uno
 * con su cantidad: "desde $371" al lado de "desde 100 unidades" haría creer
 * que 100 calcos salen a eso (RF-11).
 *
 * Se baja LAZY (031 D-8): el chunk del Home viaja en todas las rutas y la
 * variante de control no tiene por qué pagar el cotizador.
 *
 * El H1 dice "calcos" (piso de SEO de la spec 015). El `<title>` y la
 * descripción son los del Home de hoy mientras no haya ganador (031 RF-SEO7):
 * el HTML inicial es uno solo para las dos variantes.
 */
export default function HomeB2B() {
  return (
    <div className="page-gradient">
      <HeroNegocio
        pagina="home_b2b"
        copy={HOME_B2B}
        secundario={{ to: '/categorias', cta: 'tienda' }}
      />
      <BarraConfianza />
      <MarcasConfiaron />
      <section className="container-app pb-10">
        <Cotizador pagina="home_b2b" />
      </section>
      <EscalaVolumen id="precios" />
      <UsosNegocio />
      <Testimonials />
      <ComoFunciona />
      <PedidosGrandes pagina="home_b2b" />
      <CaminoTienda />
      <PreguntasNegocio pagina="home_b2b" conJsonLd />
      <CtaFinalNegocio pagina="home_b2b" />
    </div>
  );
}
