import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { categoryName, CATEGORIES } from '../data/categories.js';
import { DEFAULT_SIZE, priceForSize, sizeLabel } from '../config/pricing.js';

/**
 * Upsell del checkout: "Calcos sugeridas" al azar de las MISMAS categorías que
 * el cliente ya tiene en el carrito (si solo tiene packs/personalizados, cae a
 * las categorías de abajo). Se agregan en un click, en el tamaño por defecto y
 * SIN abrir el drawer, para no sacarlo del formulario de pago.
 *
 * Las sugerencias rotan solas cada ROTATE_MS; la rotación se pausa mientras el
 * mouse/teclado está sobre la sección para que nadie clickee una card que se
 * cambió abajo del cursor.
 */

/** Categorías de respaldo cuando en el carrito no hay calcos de catálogo. */
const FALLBACK_CATEGORIES = [
  'calcos-especiales',
  'memes',
  'buenas-vibras',
  'disenos-aesthetic',
  'futbol',
  'anime',
  'cute',
  'gamer'
];

const MAX_SOURCE_CATEGORIES = 4; // manifests que traemos por vez
const VISIBLE = 4;               // cards en pantalla
const ROTATE_MS = 7000;

/** Manifests ya bajados (persisten entre rotaciones y montajes). */
const manifestCache = new Map();

const ALL_SLUGS = CATEGORIES.map((c) => c.slug);

function loadManifest(slug) {
  if (!manifestCache.has(slug)) {
    manifestCache.set(
      slug,
      fetch(`/data/${slug}.json`)
        .then((r) => (r.ok ? r.json() : []))
        .then((items) => (Array.isArray(items) ? items : []))
        .catch(() => [])
    );
  }
  return manifestCache.get(slug);
}

/** n elementos al azar, sin repetir. */
function sampleSize(arr, n) {
  const pool = [...arr];
  const out = [];
  while (pool.length && out.length < n) {
    out.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
  }
  return out;
}

/**
 * Espera a que las imágenes de la próxima tanda estén en cache antes de
 * mostrarlas: si se cambiaran de una y la red está lenta, las cards quedan
 * vacías un rato. Con tope de PRELOAD_TIMEOUT_MS para no frenar la rotación.
 */
const PRELOAD_TIMEOUT_MS = 2500;

function preloadImages(list) {
  const cargas = Promise.all(
    list.map(
      (s) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = s.image;
        })
    )
  );
  return Promise.race([cargas, new Promise((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS))]);
}

export default function SuggestedStickers() {
  const { items, addSticker } = useCart();
  const [pool, setPool] = useState(null); // null = cargando
  const [picks, setPicks] = useState([]);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const vivo = useRef(true); // evita setState después de desmontar

  // Categorías del carrito (+ relleno al azar hasta MAX_SOURCE_CATEGORIES).
  const cartCategories = [...new Set(items.filter((i) => i.type === 'sticker' && i.category).map((i) => i.category))];
  const cartKey = cartCategories.join(',');

  const sourceCategories = useMemo(() => {
    const base = cartKey ? cartKey.split(',') : [];
    const relleno = sampleSize(
      (base.length ? FALLBACK_CATEGORIES : sampleSize(ALL_SLUGS, 12)).filter((s) => !base.includes(s)),
      Math.max(0, MAX_SOURCE_CATEGORIES - base.length)
    );
    return [...sampleSize(base, MAX_SOURCE_CATEGORIES), ...relleno];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);

  useEffect(() => {
    let cancelled = false;
    // No reseteamos `pool` a null: al agregar una sugerencia cambian las
    // categorías fuente y el skeleton parpadearía sobre las cards.
    Promise.all(
      sourceCategories.map((slug) =>
        loadManifest(slug).then((list) =>
          list.map((it) => {
            const n = String(it.id).split('-').pop();
            return {
              id: it.id,
              sku: it.sku,
              image: it.file,
              num: n,
              name: `${categoryName(slug)} #${n}`,
              category: slug,
              categoryLabel: categoryName(slug)
            };
          })
        )
      )
    ).then((listas) => {
      // Una lista por categoría fuente (las del carrito primero): así cada
      // tanda mezcla categorías en vez de quedar dominada por la más grande.
      if (!cancelled) setPool(listas.filter((l) => l.length));
    });
    return () => { cancelled = true; };
  }, [sourceCategories]);

  // Lo que ya está en el carrito no se sugiere.
  const enCarrito = useMemo(
    () => new Set(items.filter((i) => i.type === 'sticker').map((i) => String(i.id).split(':')[1])),
    [items]
  );

  /**
   * Elige `cantidad` calcos: uno por categoría fuente y, si sobran lugares,
   * más diseños de las mismas. Nunca repite lo que ya está en el carrito ni
   * los ids de `excluir`.
   */
  const elegir = useCallback(
    (cantidad = VISIBLE, excluir = []) => {
      if (!pool) return [];
      const disponibles = pool.map((lista) => lista.filter((s) => !enCarrito.has(s.id))).filter((l) => l.length);
      const elegidas = [];
      const usadas = new Set(excluir);
      for (let vuelta = 0; elegidas.length < cantidad && vuelta < cantidad; vuelta++) {
        for (const lista of disponibles) {
          if (elegidas.length >= cantidad) break;
          const libre = lista.filter((s) => !usadas.has(s.id));
          if (!libre.length) continue;
          const pick = libre[Math.floor(Math.random() * libre.length)];
          usadas.add(pick.id);
          elegidas.push(pick);
        }
      }
      return elegidas;
    },
    [pool, enCarrito]
  );

  const hayParaSugerir = !pool || pool.some((lista) => lista.some((s) => !enCarrito.has(s.id)));

  /** Tanda nueva completa: rotación automática y botón "Ver otras". */
  const rotar = useCallback(() => {
    const next = elegir();
    if (!next.length) return;
    preloadImages(next).then(() => {
      if (!vivo.current) return;
      setPicks(next);
      setTick((v) => v + 1);
    });
  }, [elegir]);

  useEffect(() => {
    vivo.current = true;
    return () => { vivo.current = false; };
  }, []);

  // Primera tanda (y si el pool cambió y todavía no hay nada para mostrar).
  useEffect(() => {
    if (!picks.length) rotar();
  }, [picks.length, rotar]);

  // Si una sugerencia entró al carrito se reemplaza SOLO esa card (por otra de
  // su misma categoría, si queda): rebarajar las cuatro justo después de un
  // click movería las otras bajo el cursor.
  useEffect(() => {
    if (!pool || !picks.some((p) => enCarrito.has(p.id))) return;
    const usadas = new Set(picks.map((p) => p.id));
    const reemplazos = new Map();
    for (const p of picks) {
      if (!enCarrito.has(p.id)) continue;
      const mismaCategoria = (pool.find((lista) => lista[0]?.category === p.category) || []).filter(
        (s) => !enCarrito.has(s.id) && !usadas.has(s.id)
      );
      const [nuevo] = mismaCategoria.length
        ? [mismaCategoria[Math.floor(Math.random() * mismaCategoria.length)]]
        : elegir(1, [...usadas]);
      if (!nuevo) continue;
      usadas.add(nuevo.id);
      reemplazos.set(p.id, nuevo);
    }
    if (!reemplazos.size) return;
    preloadImages([...reemplazos.values()]).then(() => {
      if (!vivo.current) return;
      setPicks((prev) => prev.map((p) => reemplazos.get(p.id) || p));
    });
  }, [enCarrito, picks, pool, elegir]);

  useEffect(() => {
    if (paused || !pool || !pool.length) return;
    const t = setInterval(rotar, ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, pool, rotar]);

  const unit = priceForSize(DEFAULT_SIZE);
  const loading = picks.length === 0;

  if (!hayParaSugerir) return null;

  return (
    <section
      className="mt-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <span className="badge badge-soft mb-2">✨ Sumalos a este pedido</span>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl">Calcos sugeridas</h2>
          <p className="text-white/60 text-sm mt-1">
            Parecidas a las que llevás · {sizeLabel(DEFAULT_SIZE)} · se suman sin costo de envío extra.
          </p>
        </div>
        <button
          type="button"
          onClick={rotar}
          className="btn-ghost shrink-0 text-sm self-start sm:self-auto !px-0 sm:!px-4"
          aria-label="Ver otras sugerencias"
        >
          🎲 Ver otras
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: VISIBLE }).map((_, i) => (
            <div key={i} className="card-glass aspect-square animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div key={tick} className="grid gap-3 grid-cols-2 md:grid-cols-4 grid-rise">
          {picks.map((s) => (
            <article key={s.id} className="card-glass card-glass-hover overflow-hidden flex flex-col">
              <div className="aspect-square bg-white/[0.03] grid place-items-center p-3">
                <img
                  src={s.image}
                  alt={s.name}
                  loading="lazy"
                  className="max-w-full max-h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
                />
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="text-sm font-semibold leading-snug truncate">{s.name}</h3>
                <span className="text-white/50 text-xs mt-0.5">{s.categoryLabel}</span>
                <button
                  type="button"
                  onClick={() => addSticker(s, DEFAULT_SIZE, 1, { openDrawer: false })}
                  className="btn-primary w-full mt-3 !py-2.5 !px-3 text-xs min-h-[44px]"
                >
                  Agregar · {formatPrice(unit)}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
