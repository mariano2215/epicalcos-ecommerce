import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StickerCard from './StickerCard.jsx';
import Reveal from './Reveal.jsx';
import { categoryName } from '../data/categories.js';

// Un sticker al azar de cada una de estas categorías en cada carga de la página.
const FEATURED_CATEGORIES = ['dragon-ball', 'argentina', 'disney', 'calcos-especiales'];

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

export default function FeaturedStickers() {
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      FEATURED_CATEGORIES.map((slug) =>
        fetch(`/data/${slug}.json`)
          .then((r) => (r.ok ? r.json() : []))
          .then((items) => {
            if (!items.length) return null;
            const it = pickRandom(items);
            return {
              id: it.id,
              image: it.file,
              name: `${categoryName(slug)} #${it.id.split('-').pop()}`,
              category: slug,
              categoryLabel: categoryName(slug),
            };
          })
          .catch(() => null)
      )
    ).then((picks) => {
      if (cancelled) return;
      setStickers(picks.filter(Boolean));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="py-10">
      <div className="container-app">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="badge badge-hot mb-2">🔥 Tendencia</span>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl">Los más vendidos</h2>
          </div>
          <Link to="/categorias" className="btn-ghost hidden sm:inline-flex">
            Ver todos →
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: FEATURED_CATEGORIES.length }).map((_, i) => (
              <div key={i} className="card-glass aspect-square animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {stickers.map((s, i) => (
              <Reveal key={s.id} delay={i * 60} className="h-full">
                <StickerCard sticker={s} />
              </Reveal>
            ))}
          </div>
        )}

        {/* Ver todos mobile */}
        <div className="mt-6 text-center sm:hidden">
          <Link to="/categorias" className="btn-ghost">
            Ver todas las categorías →
          </Link>
        </div>
      </div>
    </section>
  );
}
