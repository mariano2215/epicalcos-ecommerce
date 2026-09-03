import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { trackSearch } from '../lib/analytics.js';
import { suggest } from '../lib/searchCatalog.js';
import { CATEGORIES } from '../data/categories.js';
import { CATEGORY_COUNT } from '../data/catalogStats.js';
import { formatPrice } from '../context/CartContext.jsx';
import { PROMO_MAYORISTA_100, PROMO_MAYORISTA_END_MS, mayoristaPromoOffMax } from '../config/pricing.js';
import { shipping } from '../config/site.js';
import { useMayoristaPromoActive } from '../lib/promo.js';
import { endLabel } from './PromoBanner.jsx';
import StickerField from './StickerField.jsx';
import RotatingHeadline from './RotatingHeadline.jsx';
import TrustBadges from './TrustBadges.jsx';
import { BULK_DISCOUNT_SHORT } from './DiscountNote.jsx';

/** El cierre de la promo, derivado de `endsAt` (ej. "viernes 14/8"). */
const PROMO_END_LABEL = endLabel(PROMO_MAYORISTA_END_MS, 'que se agote');
/** "HASTA 75% OFF" — el % más alto de la promo, calculado, no escrito a mano. */
const PROMO_OFF_MAX = mayoristaPromoOffMax();

export default function Hero() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [catalog, setCatalog] = useState({}); // slug -> { count, cover }
  const [aliases, setAliases] = useState({ categorias: {}, rutas: {} });
  const mayoristaPromo = useMayoristaPromoActive();

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
      {/* eagerFirst: la primera calco del hero es la única imagen arriba del
          fold en toda la home. Ver el comentario en StickerField. */}
      <StickerField count={14} opacity={0.34} eagerFirst />

      <div className="container-app pt-14 pb-12 md:pt-20 md:pb-16 text-center relative z-10">
        <span className="badge badge-soft mb-4 hidden sm:inline-flex">🔥 Calcos premium · Resistentes al agua y al sol</span>

        {/* Card destacada del hero. Con la promo viva muestra la promo; cuando
            vence NO desaparece dejando un hueco: cae al mensaje de envío gratis,
            que es la oferta permanente. Los dos casos usan el mismo layout. */}
        {mayoristaPromo ? (
          <Link
            to="/mayorista"
            className="hero-promo-card group mb-6 mx-auto flex w-full max-w-2xl items-center gap-3 sm:gap-5 rounded-2xl p-3.5 sm:p-5 text-left"
          >
            <span className="text-3xl sm:text-5xl leading-none shrink-0" aria-hidden="true">🔥</span>

            <span className="min-w-0 flex-1">
              {/* text-lg en mobile: con text-xl "HASTA 75% OFF" parte en dos líneas a 375 px. */}
              <span className="block font-display font-black leading-none text-lg sm:text-3xl tracking-tight gradient-text">
                HASTA {PROMO_OFF_MAX}% OFF
              </span>
              <span className="block text-[11px] sm:text-sm text-white/85 mt-1.5">
                Llevando <strong className="text-white">{PROMO_MAYORISTA_100.qty} calcos</strong> · 4 y 6 cm ·
                hasta el {PROMO_END_LABEL}
              </span>
            </span>

            <span className="shrink-0 text-right">
              <span className="block font-display font-extrabold text-lg sm:text-3xl leading-none">
                {formatPrice(PROMO_MAYORISTA_100.price)}
              </span>
              <span className="mt-2 hidden sm:inline-flex btn-primary !py-1.5 !px-3.5 !text-xs">
                Armar mi pack →
              </span>
              <span className="mt-1 block sm:hidden text-[11px] font-bold text-white/70">
                Armar mi pack →
              </span>
            </span>
          </Link>
        ) : (
          <Link
            to="/categorias"
            className="hero-promo-card group mb-6 mx-auto flex w-full max-w-2xl items-center gap-3 sm:gap-5 rounded-2xl p-3.5 sm:p-5 text-left"
          >
            <span className="text-3xl sm:text-5xl leading-none shrink-0" aria-hidden="true">🚚</span>

            <span className="min-w-0 flex-1">
              <span className="block font-display font-black leading-none text-lg sm:text-3xl tracking-tight gradient-text">
                ENVÍO GRATIS
              </span>
              <span className="block text-[11px] sm:text-sm text-white/85 mt-1.5">
                Desde{' '}
                <strong className="text-white">
                  {formatPrice(shipping.freeShippingThresholdNational)}
                </strong>{' '}
                a todo el país · desde{' '}
                <strong className="text-white">
                  {formatPrice(shipping.freeShippingThresholdRosario)}
                </strong>{' '}
                en Rosario
              </span>
            </span>

            <span className="shrink-0 text-right">
              <span className="mt-2 hidden sm:inline-flex btn-primary !py-1.5 !px-3.5 !text-xs">
                Ver categorías →
              </span>
              <span className="block sm:hidden text-[11px] font-bold text-white/70">
                Ver categorías →
              </span>
            </span>
          </Link>
        )}

        {/* Titular rotante: solo visual, fuera del árbol semántico (evita 5 frases dentro del H1). */}
        <div
          className="font-display font-black text-2xl md:text-4xl lg:text-5xl leading-[1.05] tracking-tight"
          aria-hidden="true"
        >
          <RotatingHeadline />
        </div>

        {/* H1 real, único y estable para SEO. Sin "en Rosario" por decisión de
            Mariano (21/8/2026): la marca vende a todo el país y el H1 la estaba
            achicando a una ciudad. La señal local no se pierde — sigue en el
            title, en la meta description y en el bloque de envíos de acá arriba. */}
        <h1 className="font-display font-bold text-base md:text-lg text-white/80 mt-4">
          Calcos y stickers personalizados
        </h1>

        <p className="mt-3 max-w-2xl mx-auto text-white/80 text-sm md:text-base hidden sm:block">
          Miles de diseños en {CATEGORY_COUNT} categorías. Elegís cada calco, su tamaño (4, 6 o 9 cm) y la cantidad. {BULK_DISCOUNT_SHORT}.
        </p>

        {/* Confianza: visible TAMBIÉN en mobile (el badge de arriba y el párrafo
            están ocultos por `hidden sm:*`, así que sin esto el hero del celular
            no traía ninguna señal). */}
        <TrustBadges className="mt-5" />

        {/* Search card + autocomplete */}
        <div className="relative max-w-md mx-auto mt-7 md:mt-8">
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
                    className="w-full min-h-[44px] px-2 py-1 flex items-center gap-2.5 rounded-xl text-sm text-white/90 hover:bg-white/5"
                  >
                    {/* Miniatura de la categoría. Acá se vende una IMAGEN: una
                        lista de nombres en gris obliga a navegar para recién
                        ahí ver si era eso lo que buscaba.
                        `onError` la esconde y deja el emoji del label — un
                        cover 404 no puede dejar el ícono de imagen rota en la
                        primera interacción del home. */}
                    {s.image && (
                      <img
                        src={s.image}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        width={32}
                        height={32}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        className="w-8 h-8 shrink-0 rounded-lg object-contain bg-white/5 p-0.5"
                      />
                    )}
                    <span className="truncate flex-1 text-left">{s.label}</span>
                    {typeof s.count === 'number' && (
                      <span className="shrink-0 text-xs text-white/40">{s.count} diseños</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
