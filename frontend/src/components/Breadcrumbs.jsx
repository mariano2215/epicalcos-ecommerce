import { Link } from 'react-router-dom';

/**
 * items: [{ name, to? }] — el último item NO debería tener `to` (página actual).
 */
export default function Breadcrumbs({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-xs sm:text-sm text-white/50">
        {items.map((it, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${it.name}-${i}`} className="flex items-center gap-1">
              {it.to && !isLast ? (
                <Link to={it.to} className="hover:text-white transition-colors">
                  {it.name}
                </Link>
              ) : (
                <span className={isLast ? 'text-white/80' : ''}>{it.name}</span>
              )}
              {!isLast && <span className="text-white/30 px-1">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
