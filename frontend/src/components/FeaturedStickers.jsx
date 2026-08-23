import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StickerCard from './StickerCard.jsx';
import Reveal from './Reveal.jsx';
import { categoryName } from '../data/categories.js';
import { DEFAULT_SIZE, priceForSize } from '../config/pricing.js';
import { trackViewItemList } from '../lib/analytics.js';

// Un sticker al azar de cada una de estas categorías en cada carga de la página.
const FEATURED_CATEGORIES = ['anime', 'argentina', 'disney', 'frases'];

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
      const elegidos = picks.filter(Boolean);
      setStickers(elegidos);
      setLoading(false);
      // Primera lista de productos que ve cualquiera que entra al Home: sin este
      // evento, el funnel arranca recién en la grilla de categoría y se pierde
      // todo el tráfico que compra desde acá.
      if (elegidos.length) {
        trackViewItemList(
          elegidos.map((s) => ({ ...s, price: priceForSize(DEFAULT_SIZE) })),
          'Los más vendidos',
          'home_destacados'
        );
      }
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
                {/* El Home no tiene SizePicker: la card tiene que decir de qué tamaño es ese precio. */}
                <StickerCard sticker={s} listName="Los más vendidos" mostrarTamano />
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
