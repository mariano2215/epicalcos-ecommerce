import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CyberBanner from '../components/cyber/CyberBanner.jsx';
import HeroSelector from '../components/HeroSelector.jsx';
import BuscadorSeccion from '../components/BuscadorSeccion.jsx';
import RecentCategories from '../components/RecentCategories.jsx';
import FeaturedStickers from '../components/FeaturedStickers.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import AntesDespues from '../components/AntesDespues.jsx';
import MetricasConfianza from '../components/MetricasConfianza.jsx';
import Beneficios from '../components/Beneficios.jsx';
import OfertaPrincipal from '../components/OfertaPrincipal.jsx';
import Testimonials from '../components/Testimonials.jsx';
import GaleriaUGC from '../components/GaleriaUGC.jsx';
import MarcasConfiaron from '../components/MarcasConfiaron.jsx';
import HowToBuy from '../components/HowToBuy.jsx';
import FAQ from '../components/FAQ.jsx';
import CtaFinal from '../components/CtaFinal.jsx';
import Reveal from '../components/Reveal.jsx';
import { CATEGORIES } from '../data/categories.js';
import { CATEGORY_COUNT } from '../data/catalogStats.js';
import { useSeo } from '../lib/seo.js';
import { useReducedMotion } from '../lib/motion.js';
import { useExperiment } from '../lib/experiments.js';
import { usePacksCyber } from '../lib/promo.js';
import { separarPacks } from '../config/epicyber.js';

/**
 * Variante B2B del Home (spec 034): chunk aparte. Con `home_b2b` apagado nadie
 * la baja, y el Home de control no carga el cotizador (031 D-8).
 */
const HomeB2B = lazy(() => import('./HomeB2B.jsx'));

// Lazy: el Home es eager por LCP y estas secciones solo existen una semana.
const seccionesCyber = () => import('../components/cyber/CyberSecciones.jsx');
const CyberPacksChicos = lazy(() => seccionesCyber().then((m) => ({ default: m.CyberPacksChicos })));
const CyberMayoristas = lazy(() => seccionesCyber().then((m) => ({ default: m.CyberMayoristas })));

const FEATURED_SLUGS = ['argentina', 'anime', 'disney', 'escudos-futbol', 'harry-potter', 'marvel', 'memes', 'los-simpsons', 'taylor-swift', 'frases'];

/**
 * La Home, en un recorrido descendente y con UNA idea por sección:
 *
 *   deseo → descubrimiento → producto → confianza → oferta → prueba → acción
 *
 * El orden no es decorativo. Hasta el 4/9/2026 la página abría con ocho
 * elementos compitiendo arriba del fold y después alternaba catálogo, servicios,
 * promos y prueba social sin un hilo: cada sección volvía a pedirle a la persona
 * que decidiera de qué se trataba esto. Ahora cada bloque responde una sola
 * pregunta y se la pasa al siguiente.
 *
 * Ver `specs/014-rediseno-home-gestalt/`.
 *
 * DESDE EL 5/10/2026 (spec 031, enmienda E-1) el Home arranca con un SELECTOR
 * —¿cómo querés comprar? POR MENOR / POR MAYOR— en lugar del hero del termo.
 * Con eso se fue también `IntentSelector` ("¿Qué querés hacer?", tres cards):
 * hacía la misma pregunta una pantalla más abajo. El componente queda en el
 * repo por si se lo quiere volver a montar.
 *
 * DESDE LA SPEC 034 hay un A/B del Home entero (`home_b2b`, apagado): este
 * componente elige la variante y el de abajo (`HomeControl`) es el Home de
 * siempre, sin un cambio. El título y la descripción son los mismos para las
 * dos (031 RF-SEO7: el HTML inicial es uno solo).
 */
export default function Home() {
  const variante = useExperiment('home_b2b');
  useSeo({ title: undefined, description: undefined });

  if (variante === 'b2b') {
    return (
      <Suspense fallback={<div className="min-h-[80vh]" aria-busy="true" />}>
        <HomeB2B />
      </Suspense>
    );
  }
  return <HomeControl />;
}

function HomeControl() {
  const [catalog, setCatalog] = useState({});
  const [rotation, setRotation] = useState(0);
  const featuredRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const { chicos, mayoristas } = separarPacks(usePacksCyber());

  // El buscador va siempre en su sección. Hasta el 5/10/2026 lo decidía el
  // experimento `hero_buscador` (cerrado desde la spec 028): el hero nuevo no
  // tiene buscador, así que leerlo podía dejar el Home sin ninguno.

  // portadas.json dice qué diseños de cada categoría tienen fondo gris uniforme:
  // son los únicos que sirven de portada (ver lib/portadas.js). Va en paralelo y
  // mezclado en el mismo estado para que las cards no se pinten dos veces.
  useEffect(() => {
    Promise.all([
      fetch('/data/catalog.json').then((r) => (r.ok ? r.json() : [])),
      fetch('/data/portadas.json')
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}))
    ])
      .then(([list, portadas]) => {
        const map = {};
        for (const c of list) {
          map[c.slug] = { count: c.count, cover: c.cover, portadas: portadas[c.slug] };
        }
        setCatalog(map);
      })
      .catch(() => setCatalog({}));
  }, []);

  // Cada vez que las categorías destacadas vuelven a entrar en viewport mostramos
  // otra tanda de portadas: la primera vista se queda con la portada base y a
  // partir de ahí cada scroll de vuelta rota los diseños.
  useEffect(() => {
    const el = featuredRef.current;
    if (!el || reducedMotion || typeof IntersectionObserver === 'undefined') return;
    let visible = false;
    let seen = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (seen && !visible) setRotation((r) => r + 1);
            seen = true;
            visible = true;
          } else {
            visible = false;
          }
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  const featured = CATEGORIES.filter((c) => FEATURED_SLUGS.includes(c.slug) && catalog[c.slug]).slice(0, 10);

  return (
    <>
      {/* ── EPICYBER (spec 036) ──────────────────────────────────────────── */}
      {/* Sin campaña no renderiza nada y las secciones no se descargan. */}
      <CyberBanner />
      {chicos.length > 0 && (
        <Suspense fallback={<div className="min-h-[440px]" />}>
          <CyberPacksChicos soloPrioritarios />
        </Suspense>
      )}

      {/* ── ELECCIÓN ─────────────────────────────────────────────────────── */}
      <HeroSelector />

      {/* ── DESCUBRIMIENTO ───────────────────────────────────────────────── */}
      {/* Con más de 60 categorías el buscador es el mecanismo de navegación
          real del sitio. */}
      <BuscadorSeccion />

      {/* Solo para quien ya estuvo mirando: con 61 categorías, volver a la que
          estabas viendo cuesta. No se renderiza nada si no hay historial. */}
      <RecentCategories />

      {/* ── PRODUCTO ─────────────────────────────────────────────────────── */}
      <FeaturedStickers />

      {/* Categorías destacadas — el id lo usa WelcomePopup para dispararse al
          llegar acá con el scroll. NO renombrar. */}
      <section ref={featuredRef} id="categorias-destacadas" className="seccion scroll-mt-24">
        <div className="container-app">
          <div className="seccion-encabezado text-center">
            <h2 className="font-display font-extrabold text-3xl md:text-5xl">
              Encontrá lo que te representa
            </h2>
          </div>

          {featured.length === 0 ? (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {CATEGORIES.slice(0, 10).map((c, i) => (
                <Reveal key={c.slug} delay={i * 60} className="h-full">
                  <Link to={`/categoria/${c.slug}`} className="card-glass card-glass-hover p-5 h-full block">
                    <div className="text-4xl mb-2 text-center" aria-hidden>{c.emoji}</div>
                    <div className="font-semibold text-sm">{c.name}</div>
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {featured.map((c, i) => (
                <Reveal key={c.slug} delay={i * 60} className="h-full">
                  <CategoryCard
                    slug={c.slug}
                    name={c.name}
                    emoji={c.emoji}
                    cover={catalog[c.slug]?.cover}
                    count={catalog[c.slug]?.count}
                    portadas={catalog[c.slug]?.portadas}
                    rotation={rotation}
                    posicion={i + 1}
                  />
                </Reveal>
              ))}
            </div>
          )}

          {/* Las 61 juntas no se miran: se saltean. Diez y una puerta. */}
          <div className="mt-10 text-center">
            <Link to="/categorias" className="btn-secondary">
              Ver las {CATEGORY_COUNT} categorías
            </Link>
          </div>
        </div>
      </section>

      {/* ── CONFIANZA ────────────────────────────────────────────────────── */}
      <AntesDespues />
      <MetricasConfianza />
      <Beneficios />

      {/* ── OFERTA ───────────────────────────────────────────────────────── */}
      {/* Una sola oferta dominante: durante EPICYBER, la de campaña. Si no, el
          Home diría "100 calcos a $52.999" debajo de una oferta más barata. */}
      {mayoristas.length > 0 ? (
        <Suspense fallback={<div className="min-h-[440px]" />}>
          <CyberMayoristas soloPrioritarios />
        </Suspense>
      ) : (
        <OfertaPrincipal />
      )}

      {/* ── PRUEBA ───────────────────────────────────────────────────────── */}
      <Testimonials />
      <GaleriaUGC />
      <MarcasConfiaron />

      {/* ── ACCIÓN ───────────────────────────────────────────────────────── */}
      <HowToBuy />
      <FAQ />
      <CtaFinal />
    </>
  );
}
