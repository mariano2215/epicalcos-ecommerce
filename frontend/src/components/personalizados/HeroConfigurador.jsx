import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { usePromoActive } from '../../lib/promo.js';
import { precioEfectivoTanda, convieneNegocio } from '../../lib/precioPersonalizados.js';
import { estadoCta } from '../../lib/borradorPersonalizado.js';
import { trackPersonalizedConfigurationComplete } from '../../lib/analytics.js';
import { HERO, CTA, PROCESO } from '../../config/personalizadosLanding.js';
import Breadcrumbs from '../Breadcrumbs.jsx';
import ZonaSubida from './ZonaSubida.jsx';
import SelectorTamano from './SelectorTamano.jsx';
import SelectorMaterial from './SelectorMaterial.jsx';
import SelectorCantidad from './SelectorCantidad.jsx';
import OpcionesExtra from './OpcionesExtra.jsx';
import BotonCta from './BotonCta.jsx';
import { useBorrador } from './useBorrador.js';
import { IDS } from './acciones.js';

/** Cuánto queda el "✓ Tu calco está en el carrito" antes de volver a "Subir". */
const CONFIRMACION_MS = 4000;

/**
 * El hero ES el configurador (spec 023, RF-C1): lo primero que se puede hacer en
 * la página es subir algo tuyo. Hasta la spec 023 la subida era el paso 3 de 4,
 * bloqueada detrás del tamaño y del corte.
 *
 * Tres bloques, un solo orden de lectura:
 *   A · texto (claim + H1)   B · subida y vista previa   C · configuración + CTA
 * Mobile: A → B → C, en una columna. Desktop: B a la izquierda (sticky, así la
 * vista previa acompaña mientras se configura) y A + C a la derecha.
 *
 * ⚠️ UN SOLO H1 (RF-S5): el claim se ve más grande, pero es un <p>. El H1 dice
 * lo que un buscador tiene que leer.
 */
export default function HeroConfigurador() {
  const [estado, store] = useBorrador();
  const { items } = useCart();
  const promoActiva = usePromoActive();

  const disenos = Math.max(1, estado.disenos.length);
  const unidades = disenos * estado.copias;
  const cotizacion = useMemo(
    () => precioEfectivoTanda({ tamano: estado.tamano, copias: estado.copias, disenos, promoActiva, material: estado.material }),
    [estado.tamano, estado.copias, disenos, promoActiva, estado.material]
  );
  // El cartel "¿Son para tu negocio?" es un link a /negocio para cuando el
  // configurador NO puede topear solo (más de un diseño, u otro tamaño que no
  // sea el de Negocio): si `cotizacion.esNegocio` ya topeó el precio acá mismo,
  // mostrar el cartel además sería redundante — el total de arriba ya lo tiene.
  // Con holográfico tampoco: /negocio no lo ofrece, y el pack ya es de 100.
  const conviene =
    convieneNegocio({ tamano: estado.tamano, copias: estado.copias, promoActiva }) &&
    !cotizacion.esNegocio &&
    !cotizacion.esHolografico;
  const cta = estadoCta(estado);
  const enCarrito = items.filter((i) => i.type === 'custom').length;

  // `personalized_configuration_complete`: una vez por tanda, la primera vez que
  // hay diseño subido y tamaño (el paso intermedio del funnel).
  const tandaMedida = useRef(-1);
  useEffect(() => {
    if (cta.tipo !== 'agregar' || tandaMedida.current === estado.tanda) return;
    tandaMedida.current = estado.tanda;
    trackPersonalizedConfigurationComplete({
      size: estado.tamano,
      quantity: estado.copias,
      designs: estado.disenos.length,
      value: cotizacion.total,
      material: estado.material
    });
  }, [cta.tipo, estado.tanda, estado.tamano, estado.copias, estado.disenos.length, cotizacion.total, estado.material]);

  // La confirmación se va sola; la tanda nueva arranca con la config de la anterior.
  useEffect(() => {
    if (!estado.agregado) return undefined;
    const t = setTimeout(() => store.limpiarAgregado(), CONFIRMACION_MS);
    return () => clearTimeout(t);
  }, [estado.agregado, store]);

  return (
    <section className="container-app pt-4 pb-10 lg:pt-8 lg:pb-16">
      <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías', to: '/categorias' }, { name: 'Personalizados' }]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[auto_1fr] gap-x-10 gap-y-6">
        {/* A · texto */}
        <div className="lg:col-start-2 lg:row-start-1">
          <p className="font-display font-black text-[2.25rem] sm:text-6xl leading-[0.95] gradient-text">{HERO.claim}</p>
          <h1 className="font-display font-extrabold text-lg sm:text-2xl leading-tight mt-3">{HERO.h1}</h1>
          <p className="text-white/80 mt-3 text-base sm:text-lg leading-snug">{HERO.bajada}</p>
          <p className="text-white/55 mt-2 text-sm">{HERO.texto}</p>
        </div>

        {/* B · subida y vista previa */}
        <div className="lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 lg:self-start min-w-0">
          <ZonaSubida estado={estado} store={store} tamano={estado.tamano} />
        </div>

        {/* C · configuración */}
        <div className="lg:col-start-2 lg:row-start-2 min-w-0 space-y-5">
          <SelectorTamano valor={estado.tamano} material={estado.material} onElegir={(id) => store.setTamano(id)} />
          <SelectorMaterial valor={estado.material} onElegir={(id) => store.setMaterial(id)} />
          <SelectorCantidad
            copias={estado.copias}
            disenos={estado.disenos.length}
            tamano={estado.tamano}
            cotizacion={cotizacion}
            promoActiva={promoActiva}
            conviene={conviene}
            onCopias={(n) => store.setCopias(n)}
          />
          <OpcionesExtra
            corte={estado.corte}
            instrucciones={estado.instrucciones}
            onCorte={(c) => store.setCorte(c)}
            onInstrucciones={(t) => store.setInstrucciones(t)}
          />
          <div>
            <BotonCta id={IDS.ctaHero} estado={estado} total={cotizacion.total} origen="hero" />
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-sm">
              {enCarrito > 0 ? (
                <Link to="/carrito" className="text-white/70 hover:text-white underline decoration-white/30 underline-offset-2 min-h-[44px] inline-flex items-center">
                  Ya tenés {enCarrito} personalizada{enCarrito === 1 ? '' : 's'} en el carrito · Ver carrito
                </Link>
              ) : (
                <span />
              )}
              <a href={`#${PROCESO.id}`} className="text-white/60 hover:text-white underline decoration-white/30 underline-offset-2 min-h-[44px] inline-flex items-center">
                {CTA.comoFunciona}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
