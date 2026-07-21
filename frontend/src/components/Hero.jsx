import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackSearch } from '../lib/analytics.js';
import { suggest } from '../lib/searchCatalog.js';
import { CATEGORIES } from '../data/categories.js';
import StickerField from './StickerField.jsx';
import RotatingHeadline from './RotatingHeadline.jsx';

const quickTags = [
  { label: 'Anime', slug: 'anime' },
  { label: 'Fútbol', slug: 'futbol' },
  { label: 'Memes', slug: 'memes' },
  { label: 'Disney', slug: 'disney' },
  { label: 'Pokémon', slug: 'pokemon' }
];

export default function Hero() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [catalog, setCatalog] = useState({}); // slug -> { count, cover }
  const [aliases, setAliases] = useState({ categorias: {}, rutas: {} });

  // Datos de autocomplete: se cargan recién en el primer focus (no toca el LCP del home).
  const loadData = () => {
    if (loaded) return;
    setLoaded(true);
    fetch('/data/catalog.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const map = {};
        for (const c of list) map[c.slug] = { count: c.count, cover: c.cover };
        setCatalog(map);
      })
      .catch(() => {});
    fetch('/data/aliases.json')
      .then((r) => (r.ok ? r.json() : { categorias: {}, rutas: {} }))
      .then(setAliases)
      .catch(() => {});
  };

  const suggestions = useMemo(
    () => suggest(q, CATEGORIES, catalog, aliases, 6),
    [q, catalog, aliases]
  );
  const showSuggest = open && suggestions.length > 0;

  const onSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (term) trackSearch(term);
    const params = new URLSearchParams();
    if (term) params.set('q', term);
    navigate(`/categorias${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <section className="hero-gradient relative">
      <div className="hero-aurora" aria-hidden="true" />
      <StickerField count={14} opacity={0.34} />

      <div className="container-app pt-8 pb-8 md:pt-10 md:pb-10 text-center relative z-10">
        <span className="badge badge-soft mb-3 hidden sm:inline-flex">🔥 Calcos premium · Resistentes al agua y al sol</span>

        {/* Titular rotante: solo visual, fuera del árbol semántico (evita 5 frases dentro del H1). */}
        <div
          className="font-display font-black text-2xl md:text-4xl lg:text-5xl leading-[1.05] tracking-tight"
          aria-hidden="true"
        >
          <RotatingHeadline />
        </div>

        {/* H1 real, único y estable para SEO. */}
        <h1 className="font-display font-bold text-base md:text-lg text-white/80 mt-2">
          Calcos y stickers personalizados en Rosario
        </h1>

        <p className="mt-2 max-w-2xl mx-auto text-white/70 text-sm md:text-base hidden sm:block">
          Miles de diseños en 99 categorías. Elegís cada calco, su tamaño (4, 6 o 9 cm) y la cantidad. Desde 10 calcos, 10% off.
        </p>

        {/* Search card + autocomplete */}
        <div className="relative max-w-md mx-auto mt-3">
          <form onSubmit={onSearch} className="card-glass p-1 flex items-center gap-1">
            <span className="pl-2 text-white/50 text-sm" aria-hidden>🔎</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => {
                loadData();
                setOpen(true);
              }}
              onBlur={() => setOpen(false)}
              placeholder="Buscá tu calco: Goku, Boca, termo, tu logo…"
              className="flex-1 min-w-0 bg-transparent outline-none px-1.5 py-1.5 text-sm text-white placeholder:text-white/40"
              aria-label="Buscar calcos"
              role="combobox"
              aria-expanded={showSuggest}
              aria-autocomplete="list"
            />
            <button type="submit" className="btn-primary shrink-0 !py-1.5 !px-3 !text-xs min-h-[44px]">Buscar</button>
          </form>

          {showSuggest && (
            <ul
              className="card-glass absolute left-0 right-0 top-full mt-1 p-1 z-30 text-left overflow-hidden"
              role="listbox"
              aria-label="Sugerencias"
            >
              {suggestions.map((s) => (
                <li key={s.to}>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    // onMouseDown (no onClick): corre antes del blur del input y no pierde el click.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setOpen(false);
                      navigate(s.to);
                    }}
                    className="w-full min-h-[44px] px-3 flex items-center justify-between gap-2 rounded-xl text-sm text-white/90 hover:bg-white/5"
                  >
                    <span className="truncate">{s.label}</span>
                    {typeof s.count === 'number' && (
                      <span className="shrink-0 text-xs text-white/40">{s.count} diseños</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {quickTags.map((t) => (
            <button
              key={t.slug}
              onClick={() => navigate(`/categoria/${t.slug}`)}
              className="btn-ghost !text-white/60 !text-xs !py-1 !px-2.5 min-h-[44px] border border-white/10 hover:border-white/20"
            >
              #{t.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
