import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import AnnouncementBar from '../components/AnnouncementBar.jsx';
import Benefits from '../components/Benefits.jsx';
import FeaturedStickers from '../components/FeaturedStickers.jsx';
import Testimonials from '../components/Testimonials.jsx';
import HowToBuy from '../components/HowToBuy.jsx';
import FAQ from '../components/FAQ.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import Reveal from '../components/Reveal.jsx';
import { CATEGORIES, SPECIALS } from '../data/categories.js';
import { useSeo } from '../lib/seo.js';

const FEATURED_SLUGS = ['anime', 'futbol', 'disney', 'pokemon', 'memes', 'gamer', 'superheroes', 'cute', 'autos-y-motos', 'musica'];
const SERVICE_SLUGS = ['personalizados', 'mayorista', 'tatuajes', 'polaroid'];

export default function Home() {
  const [catalog, setCatalog] = useState({});

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

  const featured = CATEGORIES.filter((c) => FEATURED_SLUGS.includes(c.slug) && catalog[c.slug]).slice(0, 10);
  const services = SPECIALS.filter((s) => SERVICE_SLUGS.includes(s.slug));

  return (
    <>
      <Hero />

      {/* Ticker de novedades: pasa despacio entre la portada y los destacados. */}
      <AnnouncementBar durationSec={90} />

      <FeaturedStickers />

      {/* Servicios: personalizados, mayorista, tatuajes, polaroid */}
      <section className="py-10">
        <div className="container-app">
          <div className="mb-6">
            <span className="badge badge-soft mb-2">Además del catálogo</span>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl">Packs y servicios</h2>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
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
      <section id="categorias-destacadas" className="py-10 scroll-mt-24">
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
                  <CategoryCard slug={c.slug} name={c.name} emoji={c.emoji} cover={catalog[c.slug]?.cover} count={catalog[c.slug]?.count} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <HowToBuy />

      <Benefits />

      <Testimonials />

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
