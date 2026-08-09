import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import AnnouncementBar from '../components/AnnouncementBar.jsx';
import Benefits from '../components/Benefits.jsx';
import FeaturedStickers from '../components/FeaturedStickers.jsx';
import Testimonials from '../components/Testimonials.jsx';
import MarcasConfiaron from '../components/MarcasConfiaron.jsx';
import HowToBuy from '../components/HowToBuy.jsx';
import IntentSelector from '../components/IntentSelector.jsx';
import RecentCategories from '../components/RecentCategories.jsx';
import FAQ from '../components/FAQ.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import Reveal from '../components/Reveal.jsx';
import { CATEGORIES, SPECIALS } from '../data/categories.js';
import { useSeo } from '../lib/seo.js';
import { useReducedMotion } from '../lib/motion.js';
import { usePromoActive, useMayoristaPromoActive } from '../lib/promo.js';

const FEATURED_SLUGS = ['anime', 'futbol', 'disney', 'pokemon', 'memes', 'gamer', 'superheroes', 'cute', 'autos-y-motos', 'musica'];
const SERVICE_SLUGS = ['mayorista', 'archivos-imprimibles', 'tatuajes', 'polaroid'];

export default function Home() {
  const [catalog, setCatalog] = useState({});
  const [rotation, setRotation] = useState(0);
  const featuredRef = useRef(null);
  const reducedMotion = useReducedMotion();
  // ¿Hay un banner de promo ocupando el header? (ver Header.jsx). Los dos hooks se
  // llaman siempre: con `||` el segundo quedaría condicionado y rompería las reglas de hooks.
  const promo3x2Activa = usePromoActive();
  const promoMayoristaActiva = useMayoristaPromoActive();
  const promoEnHeader = promo3x2Activa || promoMayoristaActiva;

  useSeo({ title: undefined, description: undefined });

  useEffect(() => {
    fetch('/data/catalog.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const map = {};
        for (const c of list) map[c.slug] = { count: c.count, cover: c.cover };
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
  const services = SPECIALS.filter((s) => SERVICE_SLUGS.includes(s.slug));
  // SPECIALS ya viene sin las secciones despublicadas: el grid se adapta para no dejar huecos.
  const servicesCols = services.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4';

  return (
    <>
      <Hero />

      {/* Ticker de anuncios en MOBILE, arriba de "Los más vendidos": mientras corre
          una promo, el banner con la cuenta regresiva le ocupa el lugar en el header
          del celular. Cuando la promo vence, el ticker vuelve solo al header (en
          todas las páginas) y acá deja de renderizarse para no duplicarlo. */}
      {promoEnHeader && (
        <div className="sm:hidden">
          <AnnouncementBar />
        </div>
      )}

      {/* Bifurcación por intención antes del catálogo: el que venía a mandar su
          logo o a comprar para su negocio tenía que deducir solo que existía
          una página para eso. */}
      <IntentSelector />

      {/* Solo para quien ya estuvo mirando: con 99 categorías, volver a la que
          estabas viendo cuesta. No se renderiza nada si no hay historial. */}
      <RecentCategories />

      <FeaturedStickers />

      {/* Servicios. `personalizados` y `negocio` ya tienen su entrada en el
          IntentSelector de arriba, así que acá quedan solo los packs y los
          productos especiales — nada duplicado en la misma página. */}
      <section className="py-10">
        <div className="container-app">
          <div className="mb-6">
            <span className="badge badge-soft mb-2">Además del catálogo</span>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl">Packs y servicios</h2>
          </div>
          <div className={`grid gap-3 grid-cols-2 ${servicesCols}`}>
            {services.map((s, i) => (
              <Reveal key={s.slug} delay={i * 80} className="h-full">
                <Link to={s.to} className="card-glass card-glass-hover p-5 flex flex-col justify-between min-h-[150px] h-full relative overflow-hidden">
                  <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${s.accent}`} />
                  <div className="relative text-5xl text-center">{s.emoji}</div>
                  <div className="relative">
                    <div className="font-display font-extrabold leading-tight">{s.name}</div>
                    <div className="text-xs text-white/60 mt-1">{s.blurb}</div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Categorías destacadas — id usado por WelcomePopup para dispararse al llegar acá con el scroll */}
      <section ref={featuredRef} id="categorias-destacadas" className="py-10 scroll-mt-24">
        <div className="container-app">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="badge badge-soft mb-2">Explorá</span>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl">Categorías destacadas</h2>
            </div>
            <Link to="/categorias" className="btn-ghost hidden sm:inline-flex">Ver todas →</Link>
          </div>

          {featured.length === 0 ? (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {CATEGORIES.slice(0, 10).map((c, i) => (
                <Reveal key={c.slug} delay={i * 60} className="h-full">
                  <Link to={`/categoria/${c.slug}`} className="card-glass card-glass-hover p-5 h-full block">
                    <div className="text-4xl mb-2 text-center">{c.emoji}</div>
                    <div className="font-semibold text-sm">{c.name}</div>
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {featured.map((c, i) => (
                <Reveal key={c.slug} delay={i * 60} className="h-full">
                  <CategoryCard slug={c.slug} name={c.name} emoji={c.emoji} cover={catalog[c.slug]?.cover} count={catalog[c.slug]?.count} rotation={rotation} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <HowToBuy />

      <Benefits />

      <Testimonials />

      {/* Prueba social: los testimonios de clientes y, abajo, los logos de las
          marcas. Mismo componente que usa /negocio. */}
      <MarcasConfiaron />

      {/* Banner descuento por volumen */}
      <section className="py-10">
        <div className="container-app">
          <div className="card-glass p-8 md:p-10 text-center relative overflow-hidden"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(58,134,255,.35), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,27,141,.35), transparent 50%), rgba(32,32,32,.82)' }}>
            <span className="badge badge-hot mb-3">Descuentos</span>
            <h3 className="font-display font-extrabold text-2xl md:text-4xl">Desde 10 calcos, 10% off por transferencia</h3>
            <p className="text-white/70 mt-3 max-w-xl mx-auto">
              Mezclá los diseños y tamaños que quieras, y pagá por transferencia bancaria. Y si vas por volumen, el Pack Mayorista desde 100 calcos tiene 50% de descuento.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/categorias" className="btn-primary">Ver categorías</Link>
              <Link to="/mayorista" className="btn-secondary">Pack Mayorista x100</Link>
            </div>
          </div>
        </div>
      </section>

      <FAQ />
    </>
  );
}
