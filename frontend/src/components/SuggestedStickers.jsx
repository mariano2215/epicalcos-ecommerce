import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { SIZES, DEFAULT_SIZE, priceForSize } from '../config/pricing.js';
import {
  cargarManifest,
  categoriasFuente,
  elegirVarios,
  MAX_CATEGORIAS_FUENTE
} from '../lib/sugerencias.js';

/**
 * Upsell del checkout: "Calcos sugeridas" al azar de las MISMAS categorías que
 * el cliente ya tiene en el carrito (si solo tiene packs/personalizados, cae a
 * las categorías de abajo). Se agregan en un click, en el tamaño por defecto y
 * SIN abrir el drawer, para no sacarlo del formulario de pago.
 *
 * Las sugerencias rotan solas cada ROTATE_MS; la rotación se pausa mientras el
 * mouse/teclado está sobre la sección para que nadie clickee una card que se
 * cambió abajo del cursor.
 *
 * De dónde salen los calcos (qué categorías, qué diseño, y el cache de los
 * manifests) vive en lib/sugerencias.js: lo comparte con el order bump del
 * carrito lateral, así los mismos /data/{slug}.json se bajan UNA vez por visita
 * y la lógica queda donde se puede testear (en este repo no hay tests de
 * componentes).
 */

const VISIBLE = 4;        // cards en pantalla
const ROTATE_MS = 7000;
const ENGAGED_MS = 20000; // pausa después de tocar una card (mobile)

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

/**
 * Card de sugerencia: mismo selector de tamaño que las del catálogo (4/6/9 cm)
 * pero compacto y sin link al detalle — desde el checkout no queremos que se
 * vaya a otra página.
 */
function SugerenciaCard({ sticker, onAdd }) {
  const [size, setSize] = useState(DEFAULT_SIZE);

  return (
    <article className="card-glass card-glass-hover overflow-hidden flex flex-col">
      <div className="aspect-square bg-white/[0.03] grid place-items-center p-3">
        <img
          src={sticker.image}
          alt={sticker.name}
          loading="lazy"
          decoding="async"
          width={320}
          height={320}
          className="w-full h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
        />
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold leading-snug truncate">{sticker.name}</h3>
        <span className="text-white/50 text-xs mt-0.5">{sticker.categoryLabel}</span>

        <div className="mt-2.5 grid grid-cols-3 gap-1.5" role="group" aria-label="Elegir tamaño">
          {SIZES.map((s) => {
            const active = s.id === size;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSize(s.id)}
                aria-pressed={active}
                className={`rounded-xl min-h-[44px] flex flex-col items-center justify-center border transition-colors ${
                  active
                    ? 'border-brand-fuchsia bg-brand-fuchsia/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25'
                }`}
              >
                <span className="block text-xs font-bold leading-none">{s.label}</span>
                <span className="block text-[10px] text-white/50 mt-0.5">{formatPrice(s.price)}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onAdd(size)}
          className="btn-primary w-full mt-2 !py-2.5 !px-3 text-xs min-h-[44px]"
        >
          Agregar · {formatPrice(priceForSize(size))}
        </button>
      </div>
    </article>
  );
}

export default function SuggestedStickers() {
  const { items, addSticker } = useCart();
  const [pool, setPool] = useState(null); // null = cargando
  const [picks, setPicks] = useState([]);
  const [tick, setTick] = useState(0);
  const [hover, setHover] = useState(false);
  const [tocado, setTocado] = useState(false); // interactuó recién (táctil: no hay hover)
  const vivo = useRef(true);                   // evita setState después de desmontar
  const reanudar = useRef(null);
  const paused = hover || tocado;

  /**
   * Un tap en el selector de tamaño frena la rotación un rato: en mobile no hay
   * hover, y si la tanda cambia mientras elige el tamaño le borra la elección.
   */
  const marcarInteraccion = useCallback(() => {
    setTocado(true);
    clearTimeout(reanudar.current);
    reanudar.current = setTimeout(() => setTocado(false), ENGAGED_MS);
  }, []);

  useEffect(() => () => clearTimeout(reanudar.current), []);

  // Categorías del carrito (+ relleno al azar hasta MAX_SOURCE_CATEGORIES).
  const cartCategories = [...new Set(items.filter((i) => i.type === 'sticker' && i.category).map((i) => i.category))];
  const cartKey = cartCategories.join(',');

  const sourceCategories = useMemo(
    () => categoriasFuente(cartKey ? cartKey.split(',') : [], { max: MAX_CATEGORIAS_FUENTE }),
    [cartKey]
  );

  useEffect(() => {
    let cancelled = false;
    // No reseteamos `pool` a null: al agregar una sugerencia cambian las
    // categorías fuente y el skeleton parpadearía sobre las cards.
    Promise.all(sourceCategories.map(cargarManifest)).then((listas) => {
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
    (cantidad = VISIBLE, excluir = []) =>
      pool ? elegirVarios(pool, cantidad, new Set([...enCarrito, ...excluir])) : [],
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

  const loading = picks.length === 0;

  if (!hayParaSugerir) return null;

  return (
    <section
      className="mt-12"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onPointerDown={marcarInteraccion}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <span className="badge badge-soft mb-2">✨ Sumalos a este pedido</span>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl">Calcos sugeridas</h2>
          <p className="text-white/80 text-sm mt-1">
            Parecidas a las que llevás · elegí el tamaño y se suman a este pedido, sin costo de envío extra.
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
            <SugerenciaCard
              key={s.id}
              sticker={s}
              onAdd={(size) => addSticker(s, size, 1, { openDrawer: false })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
