import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import StickerField from '../components/StickerField.jsx';
import { CATEGORIES, SPECIALS } from '../data/categories.js';
import { useSeo } from '../lib/seo.js';
import { searchCatalog } from '../lib/searchCatalog.js';
import { trackSearchNoResults } from '../lib/analytics.js';
import { contact } from '../config/site.js';

export default function Categorias() {
  const [params, setParams] = useSearchParams();
  // Término crudo (searchCatalog ya normaliza acentos/mayúsculas internamente).
  const q = (params.get('q') || '').trim();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState({}); // slug -> { count, cover }
  const [aliases, setAliases] = useState({ categorias: {}, rutas: {} });

  useSeo({
    title: 'Categorías',
    description:
      'Explorá todas las categorías de calcos de EPICALCOS: anime, fútbol, memes, Disney, Pokémon y más. Elegí cada sticker, su tamaño y cantidad.',
    // Los resultados de búsqueda interna (?q=…) no se indexan.
    noindex: !!q
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

  useEffect(() => {
    fetch('/data/aliases.json')
      .then((r) => (r.ok ? r.json() : { categorias: {}, rutas: {} }))
      .then(setAliases)
      .catch(() => {});
  }, []);

  const out = useMemo(
    () => searchCatalog(q, CATEGORIES, catalog, aliases),
    [q, catalog, aliases]
  );

  // Intención comercial ("mi logo", "por mayor"…) → a la página de mayor margen.
  useEffect(() => {
    if (out.kind === 'route') navigate(out.route, { replace: true });
  }, [out.kind, out.route, navigate]);

  // Trackear el estado vacío (sin este evento no se puede medir la mejora).
  const catalogReady = Object.keys(catalog).length > 0;
  useEffect(() => {
    if (out.kind === 'empty' && q && catalogReady) trackSearchNoResults(q);
  }, [q, out.kind, catalogReady]);

  const setQ = (val) => {
    const next = new URLSearchParams(params);
    if (val) next.set('q', val);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  const whatsappHref = `${contact.whatsappUrl}?text=${encodeURIComponent(
    `Hola! Busqué "${q}" en la web y no lo encontré. ¿Lo pueden hacer?`
  )}`;

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
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscá lo que quieras: Goku, mate, mi logo…"
            className="flex-1 bg-transparent outline-none py-1.5 text-white placeholder:text-white/40"
            aria-label="Buscar en el catálogo"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="shrink-0 grid place-items-center min-w-[44px] min-h-[44px] -my-2 text-white/50 hover:text-white"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Resultados */}
        {out.kind === 'route' ? (
          <p className="text-white/50 py-10 text-center">Te llevamos a la página indicada…</p>
        ) : !catalogReady ? (
          <p className="text-white/50 py-10 text-center">Cargando catálogo…</p>
        ) : out.kind === 'empty' ? (
          <div className="card-glass p-8 text-center" aria-live="polite">
            <p className="font-display font-extrabold text-xl">
              No tenemos “{q}” en el catálogo… todavía.
            </p>
            <p className="text-white/60 mt-2">
              Mandanos tu diseño y te lo hacemos. Desde 10 calcos, 10% off.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to="/personalizados" className="btn-primary min-h-[44px]">
                Pedilo personalizado
              </Link>
              <a
                className="btn-secondary min-h-[44px]"
                target="_blank"
                rel="noopener noreferrer"
                href={whatsappHref}
              >
                Consultar por WhatsApp
              </a>
              <button type="button" onClick={() => setQ('')} className="btn-ghost min-h-[44px]">
                Limpiar búsqueda
              </button>
            </div>

            {out.suggestions.length > 0 && (
              <>
                <p className="text-xs text-white/40 mt-6 uppercase tracking-wider">O mirá estas</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {out.suggestions.map((c) => (
                    <Link key={c.slug} to={`/categoria/${c.slug}`} className="badge badge-soft">
                      {c.emoji} {c.name} · {catalog[c.slug]?.count}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid-rise grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {out.results.map((c) => (
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
