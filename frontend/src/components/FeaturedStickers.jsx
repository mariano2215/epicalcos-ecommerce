import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StickerCard from './StickerCard.jsx';
import { CATEGORIES } from '../data/categories.js';

const TABS = [
  { slug: 'argentina',  label: '🇦🇷 Argentina' },
  { slug: 'campeones',  label: '🏆 Campeones' },
  { slug: 'futbol',     label: '⚽ Fútbol' },
  { slug: 'anime',      label: '🌸 Anime' },
  { slug: 'disney',     label: '🏰 Disney' },
  { slug: 'memes',      label: '😂 Memes' },
];

const SORT_OPTIONS = [
  { value: 'populares', label: 'Más populares' },
  { value: 'recientes', label: 'Más recientes' },
  { value: 'az',        label: 'A → Z' },
];

const PAGE = 8;

export default function FeaturedStickers() {
  const [activeTab, setActiveTab] = useState('argentina');
  const [sort, setSort]           = useState('populares');
  const [rawItems, setRawItems]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const cat = CATEGORIES.find((c) => c.slug === activeTab);
  const catName = cat?.name ?? activeTab;

  useEffect(() => {
    setLoading(true);
    fetch(`/data/${activeTab}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((items) => {
        setRawItems(
          items.map((it) => ({
            id: it.id,
            image: it.file,
            name: `${catName} #${it.id.split('-').pop()}`,
            category: activeTab,
            categoryLabel: catName,
          }))
        );
        setLoading(false);
      })
      .catch(() => { setRawItems([]); setLoading(false); });
  }, [activeTab, catName]);

  const displayed = useMemo(() => {
    const copy = [...rawItems];
    if (sort === 'recientes') return copy.reverse().slice(0, PAGE);
    if (sort === 'az')        return copy.sort((a, b) => a.name.localeCompare(b.name)).slice(0, PAGE);
    return copy.slice(0, PAGE);
  }, [rawItems, sort]);

  return (
    <section className="py-10">
      <div className="container-app">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="badge badge-hot mb-2">🔥 Tendencia</span>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl">Los más vendidos</h2>
          </div>
          <Link to={`/categoria/${activeTab}`} className="btn-ghost hidden sm:inline-flex">
            Ver todos →
          </Link>
        </div>

        {/* Tabs de categoría */}
        <div className="flex gap-2 flex-wrap mb-4">
          {TABS.map((t) => (
            <button
              key={t.slug}
              onClick={() => { setActiveTab(t.slug); setSort('populares'); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                activeTab === t.slug
                  ? 'bg-brand-fuchsia/20 border-brand-fuchsia text-white'
                  : 'border-white/10 text-white/60 hover:border-white/25 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-white/40 text-xs uppercase tracking-wider">Ordenar:</span>
          <div className="flex gap-2">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setSort(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  sort === o.value
                    ? 'border-white/30 text-white bg-white/10'
                    : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: PAGE }).map((_, i) => (
              <div key={i} className="card-glass aspect-square animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid-rise grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {displayed.map((s) => (
              <StickerCard key={s.id} sticker={s} />
            ))}
          </div>
        )}

        {/* Ver todos mobile */}
        <div className="mt-6 text-center sm:hidden">
          <Link to={`/categoria/${activeTab}`} className="btn-ghost">
            Ver todos en {catName} →
          </Link>
        </div>
      </div>
    </section>
  );
}
