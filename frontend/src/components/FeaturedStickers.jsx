import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StickerCard from './StickerCard.jsx';
import Reveal from './Reveal.jsx';
import { categoryName } from '../data/categories.js';
import { DEFAULT_SIZE, priceForSize } from '../config/pricing.js';
import { trackViewItemList } from '../lib/analytics.js';

// Un sticker al azar de cada una de estas categorías en cada carga de la página.
const FEATURED_CATEGORIES = ['anime', 'argentina', 'disney', 'frases'];

/**
 * Nombre de la lista en GA4. **No sigue al título visible.**
 *
 * El título de la sección cambió a "Los más elegidos" (rediseño, spec 014) pero
 * el `item_list_name` se queda en el de siempre: es la clave con la que GA4
 * agrupa el histórico de `view_item_list` → `select_item` desde que existe la
 * sección. Cambiarlo parte la serie en dos y el informe deja de comparar.
 *
 * ⚠️ HALLAZGO (spec 014): ni "más vendidos" ni "más elegidos" salen de un dato
 * de ventas — son cuatro diseños AL AZAR de cuatro categorías, uno por carga.
 * Se mantuvo la promesa que ya estaba viva en producción, pero para sostenerla
 * de verdad haría falta el ranking real de ventas.
 */
const LISTA_GA4 = 'Los más vendidos';

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
          LISTA_GA4,
          'home_destacados'
        );
      }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="seccion">
      <div className="container-app">
        {/* Un solo elemento dominante: el título. El badge "🔥 Tendencia" que
            había encima competía con él y no agregaba información. */}
        <div className="seccion-encabezado flex items-end justify-between gap-4">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">Los más elegidos</h2>
          <Link to="/categorias" className="btn-ghost hidden sm:inline-flex shrink-0">
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
                <StickerCard sticker={s} listName={LISTA_GA4} mostrarTamano />
              </Reveal>
            ))}
          </div>
        )}

        {/* Ver todos mobile. `min-h-[44px]`: el btn-ghost mide 40 px y en
            celular este es el único "ver más" de la sección. */}
        <div className="mt-8 text-center sm:hidden">
          <Link to="/categorias" className="btn-ghost min-h-[44px]">
            Ver todas las categorías →
          </Link>
        </div>
      </div>
    </section>
  );
}
