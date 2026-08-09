import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leerRecientes } from '../lib/recientes.js';
import { getCategory } from '../data/categories.js';

/**
 * "Seguí donde estabas" — las últimas categorías que miró este visitante.
 *
 * No se renderiza nada si no hay historial, así que el visitante nuevo ve
 * exactamente la página de siempre. La lectura va en un efecto (no en el primer
 * render) para no leer localStorage durante la hidratación.
 *
 * @param {{ className?: string, titulo?: string }} props
 */
export default function RecentCategories({ className = '', titulo = 'Seguí donde estabas' }) {
  const [slugs, setSlugs] = useState([]);

  useEffect(() => {
    setSlugs(leerRecientes());
  }, []);

  // Una sola categoría vista no es un historial: es la página de la que venís.
  const cats = slugs.map(getCategory).filter(Boolean);
  if (cats.length < 2) return null;

  return (
    <section className={`py-8 ${className}`}>
      <div className="container-app">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">{titulo}</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          {cats.map((c) => (
            <Link
              key={c.slug}
              to={`/categoria/${c.slug}`}
              className="shrink-0 snap-start inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 min-h-[44px] text-sm text-white/85 hover:border-white/30 transition-colors"
            >
              <span aria-hidden>{c.emoji}</span>
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
