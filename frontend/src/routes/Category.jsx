import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import StickerCard from '../components/StickerCard.jsx';
import SizePicker from '../components/SizePicker.jsx';
import CategoryMenu from '../components/CategoryMenu.jsx';
import DiscountNote from '../components/DiscountNote.jsx';
import { CATEGORIES, getCategory } from '../data/categories.js';
import { DEFAULT_SIZE, priceForSize } from '../config/pricing.js';
import { useSeo, breadcrumbJsonLd } from '../lib/seo.js';
import { trackViewItemList } from '../lib/analytics.js';
import { registrarVista } from '../lib/recientes.js';

const PAGE = 48;

export default function Category() {
  const { slug } = useParams();
  const category = getCategory(slug);

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
      sku: it.sku, // SKU del catálogo de Meta
      image: it.file,
      name: `${category.name} #${it.id.split('-').pop()}`,
      category: slug,
      categoryLabel: category.name
    }));
    if (!q.trim()) return mapped;
    const term = q.trim().toLowerCase();
    return mapped.filter((s) => s.name.toLowerCase().includes(term) || s.id.includes(term));
  }, [items, category, slug, q]);

  // Impresión de la lista: sin este evento no se puede medir el escalón
  // "vio la grilla → abrió un diseño → lo agregó". Se dispara una vez por
  // categoría cargada, no en cada tecla del buscador interno.
  //
  // El ref lo hace idempotente por categoría: el doble efecto de StrictMode en
  // dev —y cualquier re-render que vuelva a pasar por acá— mandaría el evento
  // dos veces e inflaría el denominador de todo el funnel.
  // Historial local para "Seguí donde estabas" (ver lib/recientes.js).
  useEffect(() => {
    if (category) registrarVista(slug);
  }, [category, slug]);

  const listaTrackeada = useRef(null);
  useEffect(() => {
    if (items?.length && listaTrackeada.current !== slug) {
      listaTrackeada.current = slug;
      trackViewItemList(
        items.map((it) => ({
          id: it.id,
          sku: it.sku,
          name: `${category.name} #${it.id.split('-').pop()}`,
          category: slug,
          categoryLabel: category.name,
          price: priceForSize(DEFAULT_SIZE)
        })),
        category.name,
        slug
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, slug]);

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
              : `${stickers.length} ${stickers.length === 1 ? 'diseño' : 'diseños'}. Elegí el tamaño una vez y tocá + en los que quieras.`}
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

        {/* Otras categorías (menú colapsable) */}
        <div className="mb-6 max-w-md">
          <CategoryMenu
            slugs={CATEGORIES.map((c) => c.slug)}
            activeSlug={slug}
            to={(s) => `/categoria/${s}`}
          />
        </div>

        {/* Nudge de descuento por volumen (la condición vive en DiscountNote) */}
        <DiscountNote className="mb-4" />

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
            <SizePicker className="mb-3" categoria={slug} />
            {/* 3 columnas ya en mobile: con la card compacta entran ~12 diseños
                por pantalla en vez de ~3 (ver StickerCard). */}
            <div className="grid-rise grid gap-2 sm:gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {stickers.slice(0, visible).map((s) => (
                <StickerCard key={s.id} sticker={s} listName={category.name} />
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
