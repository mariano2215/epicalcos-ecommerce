import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import StickerCard from '../components/StickerCard.jsx';
import { CATEGORIES, getCategory } from '../data/categories.js';
import { useSeo, breadcrumbJsonLd } from '../lib/seo.js';
import { useCart } from '../context/CartContext.jsx';

const PAGE = 48;

export default function Category() {
  const { slug } = useParams();
  const category = getCategory(slug);
  const { bulkActive, unitsToBulk } = useCart();

  const [items, setItems] = useState(null); // null = cargando
  const [visible, setVisible] = useState(PAGE);
  const [q, setQ] = useState('');

  useSeo({
    title: category ? `${category.name} · Calcos premium` : 'Categoría',
    description: category
      ? `Calcos de ${category.name.toLowerCase()} en Rosario. Elegí cada sticker, su tamaño (4/6/9 cm) y cantidad. Vinilo premium, pagás con Mercado Pago.`
      : undefined,
    jsonLd: category
      ? breadcrumbJsonLd([
          { name: 'Inicio', url: '/' },
          { name: 'Categorías', url: '/categorias' },
          { name: category.name, url: `/categoria/${slug}` }
        ])
      : undefined
  });

  useEffect(() => {
    if (!category) return;
    setItems(null);
    setVisible(PAGE);
    setQ('');
    fetch(`/data/${slug}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]));
  }, [slug, category]);

  const stickers = useMemo(() => {
    if (!items) return [];
    const mapped = items.map((it) => ({
      id: it.id,
      image: it.file,
      name: `${category.name} #${it.id.split('-').pop()}`,
      category: slug,
      categoryLabel: category.name
    }));
    if (!q.trim()) return mapped;
    const term = q.trim().toLowerCase();
    return mapped.filter((s) => s.name.toLowerCase().includes(term) || s.id.includes(term));
  }, [items, category, slug, q]);

  if (!category) return <Navigate to="/categorias" replace />;

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs
          items={[
            { name: 'Inicio', to: '/' },
            { name: 'Categorías', to: '/categorias' },
            { name: category.name }
          ]}
        />

        <header className="mb-6">
          <span className="badge badge-soft mb-3">{category.emoji} Categoría</span>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl">
            <span className="gradient-text">{category.name}</span>
          </h1>
          <p className="text-white/60 mt-3 max-w-xl">
            {items === null
              ? 'Cargando diseños…'
              : `${stickers.length} ${stickers.length === 1 ? 'diseño' : 'diseños'}. Elegí tamaño y cantidad en cada calco. Desde 10 calcos, 10% off.`}
          </p>
        </header>

        {/* Ficha técnica */}
        <dl className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Material', value: 'Vinilo premium' },
            { label: 'Resistencia', value: 'Agua y sol' },
            { label: 'Tamaños', value: '4 · 6 · 9 cm' },
            { label: 'Producción', value: '2-3 días hábiles' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">{label}</dt>
              <dd className="text-sm font-semibold text-white">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Otras categorías */}
        <div className="mb-6 flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/categoria/${c.slug}`}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs border transition-colors ${
                c.slug === slug
                  ? 'border-brand-fuchsia bg-brand-fuchsia/15 text-white'
                  : 'border-white/10 text-white/60 hover:border-white/25'
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {/* Nudge de descuento por volumen */}
        {bulkActive ? (
          <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-sm text-emerald-400 flex items-center gap-2">
            🎉 <span>10% off por volumen aplicado al carrito.</span>
          </div>
        ) : unitsToBulk > 0 ? (
          <div className="mb-4 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white/60 flex items-center gap-2">
            🏷️ <span>Sumá <strong className="text-white">{unitsToBulk} calco{unitsToBulk === 1 ? '' : 's'} más</strong> al carrito para el 10% off.</span>
          </div>
        ) : (
          <div className="mb-4 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white/60 flex items-center gap-2">
            🏷️ <span>Desde <strong className="text-white">10 calcos</strong>, 10% off — mezclá categorías como quieras.</span>
          </div>
        )}

        {/* Buscador dentro de la categoría */}
        <div className="card-glass p-4 mb-6 flex items-center gap-3 max-w-md">
          <span className="text-white/50" aria-hidden>🔎</span>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setVisible(PAGE); }}
            placeholder="Buscar por número de diseño…"
            className="flex-1 bg-transparent outline-none py-1.5 text-white placeholder:text-white/40"
            aria-label="Buscar diseño"
          />
        </div>

        {/* Grilla de calcos */}
        {items !== null && stickers.length === 0 ? (
          <p className="text-white/50 py-10 text-center">No hay diseños para mostrar.</p>
        ) : (
          <>
            <div className="grid-rise grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {stickers.slice(0, visible).map((s) => (
                <StickerCard key={s.id} sticker={s} />
              ))}
            </div>
            {visible < stickers.length && (
              <div className="text-center mt-8">
                <button onClick={() => setVisible((v) => v + PAGE)} className="btn-secondary">
                  Ver más diseños ({stickers.length - visible} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
