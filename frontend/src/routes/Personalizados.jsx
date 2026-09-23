import { useEffect } from 'react';
import { useSeo, abs } from '../lib/seo.js';
import { trackPersonalizedView, trackViewItem } from '../lib/analytics.js';
import { priceForSize } from '../config/pricing.js';
import { META_LINE_SKU } from '../config/metaCatalog.js';
import { SEO, TAMANO_MAS_ELEGIDO } from '../config/personalizadosLanding.js';
import { FOTOS } from '../data/personalizadosFotos.js';
import { jsonLdPersonalizados } from '../lib/personalizadosEstatico.js';
import HeroConfigurador from '../components/personalizados/HeroConfigurador.jsx';
import BarraFijaMovil from '../components/personalizados/BarraFijaMovil.jsx';
import BarraConfianza from '../components/personalizados/secciones/BarraConfianza.jsx';
import Testimonios from '../components/personalizados/secciones/Testimonios.jsx';
import Editorial from '../components/personalizados/secciones/Editorial.jsx';
import Beneficios from '../components/personalizados/secciones/Beneficios.jsx';
import Proceso from '../components/personalizados/secciones/Proceso.jsx';
import Precios from '../components/personalizados/secciones/Precios.jsx';
import Faq from '../components/personalizados/secciones/Faq.jsx';
import CtaFinal from '../components/personalizados/secciones/CtaFinal.jsx';
import { DeImagenACalco, QuePodesConvertir, Galeria, Calidad } from '../components/personalizados/secciones/SeccionesConFotos.jsx';

/**
 * /personalizados — "Hacelo calco" (spec 023): landing + configurador.
 *
 *   deseo → acción → visualización → configuración → confianza → prueba → compra
 *
 * Las secciones con fotos (de imagen a calco, qué podés convertir, galería,
 * calidad) se montan solas cuando hay fotos reales en
 * `data/personalizadosFotos.js`; hoy no hay y no están (P-1). Mientras no haya
 * tríos de "de imagen a calco", el testimonio —la única foto real— ocupa ese
 * lugar (D-17).
 *
 * ⚠️ El HTML que reciben los buscadores lo genera `scripts/prerender.mjs` con
 * los mismos datos (`lib/personalizadosEstatico.js`). Si se agrega o saca una
 * sección acá, se refleja allá.
 */
const JSON_LD = jsonLdPersonalizados();

export default function Personalizados() {
  useSeo({ title: SEO.title, description: SEO.description, image: abs(SEO.imagen), jsonLd: JSON_LD });

  // `view_item` además del evento propio: el funnel documentado arranca ahí, y
  // Meta necesita el `ViewContent` con el SKU del catálogo (006574) para el
  // remarketing de personalizados. Antes de la spec 023 no se disparaba.
  useEffect(() => {
    trackPersonalizedView();
    trackViewItem({
      id: 'personalizados',
      name: SEO.h1,
      categoryLabel: 'Personalizados',
      price: priceForSize(TAMANO_MAS_ELEGIDO),
      catalogSku: META_LINE_SKU.personalizados
    });
  }, []);

  const hayTrios = FOTOS.deImagenACalco.length > 0;

  return (
    <div className="page-gradient">
      <HeroConfigurador />
      <BarraConfianza />
      {!hayTrios && <Testimonios />}
      <DeImagenACalco />
      <QuePodesConvertir />
      <Editorial />
      <Beneficios />
      <Galeria />
      <Proceso />
      <Calidad />
      <Precios />
      {hayTrios && <Testimonios />}
      <Faq />
      <CtaFinal />
      <BarraFijaMovil />
    </div>
  );
}
