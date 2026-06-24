import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import StickerField from '../components/StickerField.jsx';
import { CATEGORIES, SPECIALS } from '../data/categories.js';
import { useSeo } from '../lib/seo.js';

export default function Categorias() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') || '').toLowerCase().trim();
  const [catalog, setCatalog] = useState({}); // slug -> { count, cover }

  useSeo({
    title: 'Categorías',
    description:
      'Explorá todas las categorías de calcos de EPICALCOS: anime, fútbol, memes, Disney, Pokémon y más. Elegí cada sticker, su tamaño y cantidad.'
  });

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

  const filtered = useMemo(() => {
    const withData = CATEGORIES.filter((c) => catalog[c.slug]); // solo categorías ya importadas
    if (!q) return withData;
    return withData.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q));
  }, [q, catalog]);

  const setQ = (val) => {
    const next = new URLSearchParams(params);
    if (val) next.set('q', val);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías' }]} />

        <header className="mb-8 relative overflow-hidden rounded-3xl">
          <StickerField count={9} opacity={0.22} />
          <div className="relative z-10 py-2">
            <span className="badge badge-soft mb-3">Catálogo</span>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl">
              <span className="gradient-text">Categorías</span>
            </h1>
            <p className="text-white/60 mt-3 max-w-xl">
              Elegí una categoría y armá tu pedido calco por calco. Desde 10 calcos, 10% off automático.
            </p>
          </div>
        </header>

        {/* Especiales */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Destacados</h2>
          <div className="grid-rise grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {SPECIALS.map((s) => (
              <Link
                key={s.slug}
                to={s.to}
                className="card-glass card-glass-hover p-5 flex flex-col justify-between min-h-[140px] relative overflow-hidden"
              >
                <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${s.accent}`} />
                <div className="relative text-3xl">{s.emoji}</div>
                <div className="relative">
                  <div className="font-display font-extrabold leading-tight">{s.name}</div>
                  <div className="text-xs text-white/60 mt-1">{s.blurb}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Buscador */}
        <div className="card-glass p-4 mb-6 flex items-center gap-3">
          <span className="text-white/50" aria-hidden>🔎</span>
          <input
            defaultValue={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar categoría…"
            className="flex-1 bg-transparent outline-none py-1.5 text-white placeholder:text-white/40"
            aria-label="Buscar categoría"
          />
        </div>

        {/* Grilla de categorías */}
        {filtered.length === 0 ? (
          <p className="text-white/50 py-10 text-center">
            {Object.keys(catalog).length === 0
              ? 'Cargando catálogo…'
              : 'No encontramos categorías con ese nombre.'}
          </p>
        ) : (
          <div className="grid-rise grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((c) => (
              <CategoryCard
                key={c.slug}
                slug={c.slug}
                name={c.name}
                emoji={c.emoji}
                cover={catalog[c.slug]?.cover}
                count={catalog[c.slug]?.count}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
