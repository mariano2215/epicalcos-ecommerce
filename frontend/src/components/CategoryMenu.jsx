import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, getCategory, categoryName } from '../data/categories.js';

/**
 * Menú de categorías colapsable (estilo hamburguesa) que reemplaza la tira
 * horizontal que se desbordaba en mobile. El usuario lo abre y cierra a gusto;
 * al elegir una categoría se cierra solo.
 *
 * Dos modos de uso:
 *   - onSelect(slug)  → renderiza botones (PackBuilder, selección en la misma página).
 *   - to(slug)        → renderiza <Link> (página de Categoría, navega a otra ruta).
 *
 * @param {{
 *   slugs?: string[],          // qué categorías mostrar (default: todas)
 *   activeSlug?: string|null,
 *   onSelect?: (slug:string)=>void,
 *   to?: (slug:string)=>string,
 *   placeholder?: string
 * }} props
 */
export default function CategoryMenu({ slugs, activeSlug, onSelect, to, placeholder = 'Elegí una categoría' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const list = slugs && slugs.length ? slugs : CATEGORIES.map((c) => c.slug);
  const active = activeSlug ? getCategory(activeSlug) : null;
  const activeLabel = active ? `${active.emoji} ${active.name}` : placeholder;

  // Cerrar al hacer click afuera o con Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const chipClass = (isActive) =>
    `flex items-center gap-1.5 min-w-0 rounded-full px-3 py-2 text-xs border text-left transition-colors ${
      isActive
        ? 'border-brand-fuchsia bg-brand-fuchsia/15 text-white'
        : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white'
    }`;

  return (
    <div ref={ref} className="relative">
      {/* Botón hamburguesa: abre/cierra el menú */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="w-full flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-left transition-colors hover:border-white/25"
      >
        <span aria-hidden className="text-lg leading-none">{open ? '✕' : '☰'}</span>
        <span className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] uppercase tracking-widest text-white/40 leading-none">Categoría</span>
          <span className="text-sm font-semibold text-white truncate mt-0.5">{activeLabel}</span>
        </span>
        <span aria-hidden className={`text-white/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Panel desplegable: grilla de chips que envuelve y scrollea en vertical */}
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-white/12 bg-[#171717]/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[55vh] overflow-y-auto pr-0.5">
            {list.map((slug) => {
              const cat = getCategory(slug);
              const isActive = slug === activeSlug;
              const label = (
                <>
                  {cat?.emoji && <span aria-hidden className="shrink-0">{cat.emoji}</span>}
                  <span className="truncate">{categoryName(slug)}</span>
                </>
              );
              if (onSelect) {
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => { onSelect(slug); setOpen(false); }}
                    className={chipClass(isActive)}
                  >
                    {label}
                  </button>
                );
              }
              return (
                <Link
                  key={slug}
                  to={to ? to(slug) : `/categoria/${slug}`}
                  onClick={() => setOpen(false)}
                  className={chipClass(isActive)}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
