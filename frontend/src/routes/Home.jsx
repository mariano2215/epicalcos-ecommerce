import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import Benefits from '../components/Benefits.jsx';
import HowToBuy from '../components/HowToBuy.jsx';
import FAQ from '../components/FAQ.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import { CATEGORIES, SPECIALS } from '../data/categories.js';
import { useSeo } from '../lib/seo.js';

const FEATURED_SLUGS = ['anime', 'futbol', 'disney', 'pokemon', 'memes', 'gamer', 'superheroes', 'cute', 'autos-y-motos', 'musica'];

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

  return (
    <>
      <Hero />
      <Benefits />

      {/* Categorías destacadas */}
      <section className="py-10">
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
              {CATEGORIES.slice(0, 10).map((c) => (
                <Link key={c.slug} to={`/categoria/${c.slug}`} className="card-glass card-glass-hover p-5">
                  <div className="text-2xl mb-2">{c.emoji}</div>
                  <div className="font-semibold text-sm">{c.name}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {featured.map((c) => (
                <CategoryCard key={c.slug} slug={c.slug} name={c.name} emoji={c.emoji} cover={catalog[c.slug]?.cover} count={catalog[c.slug]?.count} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Especiales */}
      <section className="py-10">
        <div className="container-app">
          <div className="mb-6">
            <span className="badge badge-soft mb-2">Más opciones</span>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl">Packs y servicios</h2>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {SPECIALS.map((s) => (
              <Link key={s.slug} to={s.to} className="card-glass card-glass-hover p-5 flex flex-col justify-between min-h-[150px] relative overflow-hidden">
                <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${s.accent}`} />
                <div className="relative text-3xl">{s.emoji}</div>
                <div className="relative">
                  <div className="font-display font-extrabold leading-tight">{s.name}</div>
                  <div className="text-xs text-white/60 mt-1">{s.blurb}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Banner descuento por volumen */}
      <section className="py-10">
        <div className="container-app">
          <div className="card-glass p-8 md:p-10 text-center relative overflow-hidden"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(58,134,255,.35), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,27,141,.35), transparent 50%), rgba(32,32,32,.82)' }}>
            <span className="badge badge-hot mb-3">Descuentos</span>
            <h3 className="font-display font-extrabold text-2xl md:text-4xl">Desde 10 calcos, 10% off</h3>
            <p className="text-white/70 mt-3 max-w-xl mx-auto">
              Mezclá los diseños que quieras. Y si vas por volumen, el Pack Mayorista x100 tiene 25% de descuento.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/categorias" className="btn-primary">Ver categorías</Link>
              <Link to="/mayorista" className="btn-secondary">Pack Mayorista x100</Link>
            </div>
          </div>
        </div>
      </section>

      <HowToBuy />
      <FAQ />
    </>
  );
}
