import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import StickerField from '../components/StickerField.jsx';
import { CATEGORIES, SPECIALS } from '../data/categories.js';
import { useSeo } from '../lib/seo.js';
import { searchCatalog, esOrdenValido, ORDEN_POR_DEFECTO } from '../lib/searchCatalog.js';
import { rotacionesSinRepetir } from '../lib/portadas.js';
import { trackSearchNoResults, trackOrdenCatalogo } from '../lib/analytics.js';
import { contact } from '../config/site.js';
import { BULK_DISCOUNT_SHORT } from '../components/DiscountNote.jsx';

const OPCIONES_ORDEN = [
  { valor: 'az', label: 'A-Z' },
  { valor: 'disenos', label: 'Más diseños' }
];

export default function Categorias() {
  const [params, setParams] = useSearchParams();
  // Término crudo (searchCatalog ya normaliza acentos/mayúsculas internamente).
  const q = (params.get('q') || '').trim();
  const ordenParam = params.get('orden');
  const orden = esOrdenValido(ordenParam) ? ordenParam : ORDEN_POR_DEFECTO;
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState({}); // slug -> { count, cover }
  const [aliases, setAliases] = useState({ categorias: {}, rutas: {} });
  // Diseños que están repetidos en dos carpetas (scripts/build-duplicados.mjs).
  const [duplicados, setDuplicados] = useState({});
  // Una semilla por visita: las portadas cambian cada vez que entrás, pero se
  // quedan quietas mientras estás en la página (si se recalcularan en cada
  // render, escribir en el buscador cambiaría todas las imágenes al tipear).
  const [semilla] = useState(() => Math.floor(Math.random() * 10000));

  useSeo({
    title: 'Categorías',
    description:
      'Explorá todas las categorías de calcos de EPICALCOS: anime, fútbol, memes, Disney, Pokémon y más. Elegí cada sticker, su tamaño y cantidad.',
    // Los resultados de búsqueda interna (?q=…) no se indexan.
    noindex: !!q
  });

  useEffect(() => {
    fetch('/data/catalog.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const map = {};
        for (const c of list) map[c.slug] = { count: c.count, cover: c.cover };
        setCatalog(map);
      })
      .catch(() => setCatalog({}));
  }, []);

  useEffect(() => {
    fetch('/data/aliases.json')
      .then((r) => (r.ok ? r.json() : { categorias: {}, rutas: {} }))
      .then(setAliases)
      .catch(() => {});
  }, []);

  // Si este fetch falla la grilla funciona igual: sin el mapa sólo se pierde la
  // garantía de que no se repita un diseño que está en dos carpetas.
  useEffect(() => {
    fetch('/data/duplicados.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setDuplicados)
      .catch(() => {});
  }, []);

  const out = useMemo(
    () => searchCatalog(q, CATEGORIES, catalog, aliases, orden),
    [q, catalog, aliases, orden]
  );

  // Portadas resueltas en conjunto: la primera categoría se queda con su diseño
  // y la que choca corre la rotación hasta uno libre. Depende del orden porque
  // el desempate es "el primero que llega se lo queda".
  const rotaciones = useMemo(
    () => rotacionesSinRepetir(out.results, catalog, semilla, duplicados),
    [out.results, catalog, semilla, duplicados]
  );

  // Intención comercial ("mi logo", "por mayor"…) → a la página de mayor margen.
  useEffect(() => {
    if (out.kind === 'route') navigate(out.route, { replace: true });
  }, [out.kind, out.route, navigate]);

  // Trackear el estado vacío (sin este evento no se puede medir la mejora).
  const catalogReady = Object.keys(catalog).length > 0;
  useEffect(() => {
    if (out.kind === 'empty' && q && catalogReady) trackSearchNoResults(q);
  }, [q, out.kind, catalogReady]);

  const setQ = (val) => {
    const next = new URLSearchParams(params);
    if (val) next.set('q', val);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  // El orden viaja en la URL: sobrevive al refresh, al botón "atrás" y a
  // compartir el link. El default no ensucia la URL.
  const setOrden = (val) => {
    if (val === orden) return;
    const next = new URLSearchParams(params);
    if (val === ORDEN_POR_DEFECTO) next.delete('orden');
    else next.set('orden', val);
    setParams(next, { replace: true });
    trackOrdenCatalogo(val);
  };

  const whatsappHref = `${contact.whatsappUrl}?text=${encodeURIComponent(
    `Hola! Busqué "${q}" en la web y no lo encontré. ¿Lo pueden hacer?`
  )}`;

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías' }]} />

        <header className="mb-8 relative overflow-hidden rounded-3xl">
          <StickerField count={9} opacity={0.22} className="sticker-field--lateral" />
          <div className="relative z-10 py-2">
            <span className="badge badge-soft mb-3">Catálogo</span>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl">
              <span className="gradient-text">Categorías</span>
            </h1>
            <p className="text-white/80 mt-3 max-w-xl">
              Elegí una categoría y armá tu pedido calco por calco. {BULK_DISCOUNT_SHORT}.
            </p>
          </div>
        </header>

        {/* Especiales */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Destacados</h2>
          {/* 3 columnas y no 5: las especiales son 6, y en 5 columnas quedaban
              5 arriba y 1 huérfana abajo. Con 3 salen dos filas parejas (y en
              mobile, 2 columnas → tres filas de 2). Si algún día se despublica
              una sección (HIDDEN_SECTIONS) la última fila queda corta, no rota. */}
          <div className="grid-rise grid gap-3 grid-cols-2 sm:grid-cols-3">
            {SPECIALS.map((s) => (
              <Link
                key={s.slug}
                to={s.to}
                className="card-glass card-glass-hover p-5 flex flex-col justify-between min-h-[140px] relative overflow-hidden"
              >
                <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${s.accent}`} />
                <div className="relative text-3xl">{s.emoji}</div>
                <div className="relative">
                  <div className="font-display font-extrabold leading-tight">{s.name}</div>
                  <div className="text-xs text-white/60 mt-1">{s.blurb}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Buscador */}
        <div className="card-glass p-4 mb-6 flex items-center gap-3">
          <span className="text-white/50" aria-hidden>🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscá lo que quieras: Goku, mate, mi logo…"
            className="flex-1 bg-transparent outline-none py-1.5 text-white placeholder:text-white/40"
            aria-label="Buscar en el catálogo"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="shrink-0 grid place-items-center min-w-[44px] min-h-[44px] -my-2 text-white/50 hover:text-white"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Orden — sólo con el listado completo. Cuando hay búsqueda los
            resultados vienen por relevancia (el mejor match primero) y un
            selector que no hace nada confunde más de lo que ayuda. */}
        {out.kind === 'all' && (
          <div className="flex flex-wrap items-center gap-2 mb-6" role="group" aria-label="Ordenar categorías">
            <span className="text-xs uppercase tracking-wider text-white/50 mr-1">Ordenar</span>
            {OPCIONES_ORDEN.map((o) => (
              <button
                key={o.valor}
                type="button"
                onClick={() => setOrden(o.valor)}
                aria-pressed={orden === o.valor}
                className={`min-h-[44px] px-4 rounded-full text-sm font-semibold border transition-colors ${
                  orden === o.valor
                    ? 'bg-white/15 border-white/30 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:border-white/25'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {/* Resultados */}
        {out.kind === 'route' ? (
          <p className="text-white/50 py-10 text-center">Te llevamos a la página indicada…</p>
        ) : !catalogReady ? (
          <p className="text-white/50 py-10 text-center">Cargando catálogo…</p>
        ) : out.kind === 'empty' ? (
          <div className="card-glass p-8 text-center" aria-live="polite">
            <p className="font-display font-extrabold text-xl">
              No tenemos “{q}” en el catálogo… todavía.
            </p>
            <p className="text-white/60 mt-2">
              Mandanos tu diseño y te lo hacemos. {BULK_DISCOUNT_SHORT}.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a
                className="btn-primary min-h-[44px]"
                target="_blank"
                rel="noopener noreferrer"
                href={whatsappHref}
              >
                Consultar por WhatsApp
              </a>
              <button type="button" onClick={() => setQ('')} className="btn-ghost min-h-[44px]">
                Limpiar búsqueda
              </button>
            </div>

            {out.suggestions.length > 0 && (
              <>
                <p className="text-xs text-white/40 mt-6 uppercase tracking-wider">O mirá estas</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {out.suggestions.map((c) => (
                    <Link key={c.slug} to={`/categoria/${c.slug}`} className="badge badge-soft">
                      {c.emoji} {c.name} · {catalog[c.slug]?.count}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid-rise grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {out.results.map((c) => (
              <CategoryCard
                key={c.slug}
                slug={c.slug}
                name={c.name}
                emoji={c.emoji}
                cover={catalog[c.slug]?.cover}
                count={catalog[c.slug]?.count}
                rotation={rotaciones[c.slug] || 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
