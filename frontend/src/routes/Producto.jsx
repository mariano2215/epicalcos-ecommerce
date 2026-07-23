import { useEffect, useMemo, useState } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { getCategory } from '../data/categories.js';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import {
  SIZES,
  DEFAULT_SIZE,
  priceForSize,
  sizeLabel,
  BULK_THRESHOLD
} from '../config/pricing.js';
import { shipping } from '../config/site.js';
import { useSeo, productJsonLd, breadcrumbJsonLd } from '../lib/seo.js';
import { trackViewItem } from '../lib/analytics.js';

/**
 * Subpágina de detalle de un calco (estilo Mercado Libre): imagen en grande,
 * selector de tamaño/cantidad, condiciones de compra y diseños relacionados.
 *
 * URL: /producto/:slug/:num  (ej. /producto/argentina/1)
 *
 * El manifest /data/<slug>.json hoy trae { id, file } por ítem. La página ya
 * lee campos opcionales `images` (array) y `description` por si en el futuro se
 * suman más fotos (aplicaciones en distintos materiales) y texto por diseño.
 */
export default function Producto() {
  const { slug, num } = useParams();
  const category = getCategory(slug);
  const navigate = useNavigate();
  const { addSticker } = useCart();

  const [items, setItems] = useState(null); // null = cargando
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  // Cargar el manifest de la categoría
  useEffect(() => {
    if (!category) return;
    setItems(null);
    fetch(`/data/${slug}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]));
  }, [slug, category]);

  // Reset al cambiar de diseño (incluye scroll arriba al navegar entre productos)
  useEffect(() => {
    setSize(DEFAULT_SIZE);
    setQty(1);
    setActiveImg(0);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [slug, num]);

  const index = useMemo(() => {
    if (!items) return -1;
    return items.findIndex(
      (it) => it.id === `${slug}-${num}` || String(it.id.split('-').pop()) === String(num)
    );
  }, [items, slug, num]);

  const raw = index >= 0 ? items[index] : null;

  const sticker = useMemo(() => {
    if (!category || !raw) return null;
    const n = raw.id.split('-').pop();
    const images = Array.isArray(raw.images) && raw.images.length ? raw.images : [raw.file];
    return {
      id: raw.id,
      sku: raw.sku, // SKU del catálogo de Meta (embebido en /data/<cat>.json)
      number: n,
      image: raw.file,
      images,
      name: `${category.name} #${n}`,
      description: raw.description || null,
      category: slug,
      categoryLabel: category.name
    };
  }, [category, raw, slug]);

  // Diseños siguientes (con wrap) para "Más de esta categoría"
  const related = useMemo(() => {
    if (!items || index < 0 || !category) return [];
    return [...items.slice(index + 1), ...items.slice(0, index)]
      .slice(0, 12)
      .map((it) => {
        const n = it.id.split('-').pop();
        return { id: it.id, num: n, image: it.file, name: `${category.name} #${n}` };
      });
  }, [items, index, category]);

  const prevNext = useMemo(() => {
    if (!items || index < 0) return { prev: null, next: null };
    const at = (i) => {
      const it = items[(i + items.length) % items.length];
      return it ? it.id.split('-').pop() : null;
    };
    return { prev: at(index - 1), next: at(index + 1) };
  }, [items, index]);

  const unit = priceForSize(size);

  // Meta Pixel / GA4: ViewContent al abrir la ficha, con el SKU del catálogo.
  useEffect(() => {
    if (!sticker) return;
    trackViewItem({
      id: sticker.id,
      catalogSku: sticker.sku,
      name: sticker.name,
      category: sticker.category,
      categoryLabel: sticker.categoryLabel,
      price: priceForSize(DEFAULT_SIZE)
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sticker?.id]);

  useSeo({
    title: sticker ? sticker.name : 'Producto',
    description: sticker
      ? `${sticker.name}: calco de vinilo premium resistente al agua y al sol. Elegí tamaño (4/6/9 cm) y cantidad. Pagás con Mercado Pago, envíos a todo el país.`
      : undefined,
    image: sticker?.image,
    type: 'product',
    jsonLd: sticker
      ? productJsonLd({
          id: sticker.id,
          name: sticker.name,
          description: `${sticker.name} — calco de vinilo premium de EPICALCOS.`,
          image: sticker.image,
          category: sticker.category,
          num: sticker.number,
          categoryLabel: sticker.categoryLabel,
          price: unit,
          stock: 999
        })
      : undefined
  });

  if (!category) return <Navigate to="/categorias" replace />;
  // Cargado pero el número no existe en la categoría → volver a la grilla
  if (items !== null && !raw) return <Navigate to={`/categoria/${slug}`} replace />;

  // Estado de carga
  if (!sticker) {
    return (
      <div className="page-gradient min-h-screen">
        <div className="container-app py-10">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="aspect-square rounded-3xl bg-white/5 animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 rounded-lg bg-white/5 animate-pulse" />
              <div className="h-12 w-1/2 rounded-lg bg-white/5 animate-pulse" />
              <div className="h-40 rounded-2xl bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const addToCart = () => addSticker(sticker, size, qty);
  const buyNow = () => {
    addSticker(sticker, size, qty);
    navigate('/carrito');
  };

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-8">
        <Breadcrumbs
          items={[
            { name: 'Inicio', to: '/' },
            { name: 'Categorías', to: '/categorias' },
            { name: category.name, to: `/categoria/${slug}` },
            { name: sticker.name }
          ]}
        />

        {/* Volver + navegación entre diseños */}
        <div className="flex items-center justify-between mb-4">
          <Link to={`/categoria/${slug}`} className="btn-ghost !px-0 hover:!bg-transparent text-sm">
            ← Volver a {category.name}
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {prevNext.prev && (
              <Link to={`/producto/${slug}/${prevNext.prev}`} className="btn-ghost">← Anterior</Link>
            )}
            {prevNext.next && (
              <Link to={`/producto/${slug}/${prevNext.next}`} className="btn-ghost">Siguiente →</Link>
            )}
          </div>
        </div>

        {/* ── Galería + panel de compra ─────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Galería */}
          <div>
            <div className="rounded-3xl bg-white p-6 sm:p-10 grid place-items-center aspect-square shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <img
                src={sticker.images[activeImg] || sticker.image}
                alt={sticker.name}
                className="max-w-full max-h-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
              />
            </div>

            {/* Miniaturas — se llenan cuando un diseño tenga varias fotos */}
            {sticker.images.length > 1 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {sticker.images.map((img, i) => (
                  <button
                    key={img + i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    aria-label={`Ver imagen ${i + 1}`}
                    aria-pressed={i === activeImg}
                    className={`w-16 h-16 rounded-xl bg-white grid place-items-center p-1.5 border-2 transition-colors ${
                      i === activeImg ? 'border-brand-fuchsia' : 'border-transparent hover:border-white/30'
                    }`}
                  >
                    <img src={img} alt="" className="max-w-full max-h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Panel de compra */}
          <div className="lg:sticky lg:top-6">
            <div className="card-glass p-5 sm:p-7">
              <span className="badge badge-soft mb-3">{category.emoji} {category.name}</span>
              <h1 className="font-display font-extrabold text-3xl md:text-4xl leading-tight">
                {sticker.name}
              </h1>

              {/* Precio (según tamaño elegido) */}
              <div className="mt-4 flex items-end gap-2">
                <span className="gradient-text font-display font-extrabold text-4xl">
                  {formatPrice(unit)}
                </span>
                <span className="text-white/50 text-sm mb-1">/ unidad · {sizeLabel(size)}</span>
              </div>
              <p className="text-emerald-400 text-sm mt-1 font-medium">
                Pagás seguro con Mercado Pago
              </p>

              {/* Selector de tamaño */}
              <div className="mt-5">
                <span className="text-xs uppercase tracking-widest text-white/40">Tamaño</span>
                <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Elegir tamaño">
                  {SIZES.map((s) => {
                    const active = s.id === size;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSize(s.id)}
                        aria-pressed={active}
                        className={`rounded-xl py-2 text-center border transition-colors ${
                          active
                            ? 'border-brand-fuchsia bg-brand-fuchsia/15 text-white'
                            : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25'
                        }`}
                      >
                        <span className="block text-sm font-bold leading-none">{s.label}</span>
                        <span className="block text-[11px] text-white/50 mt-1">{formatPrice(s.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cantidad */}
              <div className="mt-5">
                <span className="text-xs uppercase tracking-widest text-white/40">Cantidad</span>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <button
                      type="button"
                      className="w-11 h-11 grid place-items-center rounded-l-xl text-xl leading-none text-white/70 hover:text-white hover:bg-white/5"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      aria-label="Restar"
                    >–</button>
                    <span className="w-12 text-center text-base font-semibold tabular-nums">{qty}</span>
                    <button
                      type="button"
                      className="w-11 h-11 grid place-items-center rounded-r-xl text-xl leading-none text-white/70 hover:text-white hover:bg-white/5"
                      onClick={() => setQty((q) => q + 1)}
                      aria-label="Sumar"
                    >+</button>
                  </div>
                  <span className="text-white/50 text-sm">
                    Total: <strong className="text-white">{formatPrice(unit * qty)}</strong>
                  </span>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-6 flex flex-col gap-2.5">
                <button type="button" onClick={buyNow} className="btn-primary w-full">
                  Comprar ahora
                </button>
                <button type="button" onClick={addToCart} className="btn-secondary w-full">
                  Agregar al carrito · {formatPrice(unit * qty)}
                </button>
              </div>

              {/* Nudge de descuento por volumen */}
              <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-sm text-emerald-400 flex items-center gap-2">
                🏷️ <span>Desde <strong>{BULK_THRESHOLD} calcos</strong> en el carrito, <strong>10% off pagando por transferencia bancaria</strong> — mezclá categorías y tamaños como quieras.</span>
              </div>

              {/* Condiciones de compra (estilo Mercado Libre) */}
              <ul className="mt-5 space-y-3 text-sm border-t border-white/10 pt-5">
                <li className="flex gap-3">
                  <span aria-hidden>🚚</span>
                  <span className="text-white/70">
                    <strong className="text-emerald-400">Envío gratis en Rosario</strong> desde {formatPrice(shipping.freeShippingThresholdRosario)}. Hacemos envíos a todo el país.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden>⚡</span>
                  <span className="text-white/70">
                    Producción en <strong className="text-white">{shipping.productionDaysRosario}</strong> (Rosario).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden>🔄</span>
                  <span className="text-white/70">
                    <Link to="/politicas/cambios" className="underline decoration-white/30 hover:decoration-white">Cambios y devoluciones</Link> según nuestras políticas.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden>🛡️</span>
                  <span className="text-white/70">
                    Vinilo premium resistente al <strong className="text-white">agua y al sol</strong>.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Descripción + ficha técnica ───────────────────────────── */}
        <section className="mt-10 card-glass p-6 sm:p-8">
          <h2 className="font-display font-extrabold text-2xl mb-3">Descripción</h2>
          <p className="text-white/70 leading-relaxed max-w-2xl">
            {sticker.description ||
              `${sticker.name} en vinilo premium de alta calidad. Corte preciso, colores vivos y terminación resistente al agua y al sol, ideal para notebook, botella, mate, casco, auto y mucho más. Elegí el tamaño que mejor te quede: 4, 6 o 9 cm.`}
          </p>

          <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
            {[
              { label: 'Material', value: 'Vinilo premium' },
              { label: 'Resistencia', value: 'Agua y sol' },
              { label: 'Tamaños', value: '4 · 6 · 9 cm' },
              { label: 'Producción', value: '2-3 días hábiles' }
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">{label}</dt>
                <dd className="text-sm font-semibold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Más diseños de la categoría ───────────────────────────── */}
        {related.length > 0 && (
          <section className="mt-10">
            <div className="flex items-end justify-between mb-4">
              <h2 className="font-display font-extrabold text-2xl">Más de {category.name}</h2>
              <Link to={`/categoria/${slug}`} className="btn-ghost hidden sm:inline-flex">Ver todos →</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to={`/producto/${slug}/${r.num}`}
                  className="shrink-0 w-32 snap-start group"
                >
                  <div className="rounded-2xl bg-white p-2.5 aspect-square grid place-items-center border border-white/10 group-hover:border-brand-fuchsia/50 transition-colors">
                    <img src={r.image} alt={r.name} loading="lazy" className="max-w-full max-h-full object-contain" />
                  </div>
                  <p className="text-xs text-white/60 mt-1.5 truncate group-hover:text-white">{r.name}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
