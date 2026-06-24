import { Link } from 'react-router-dom';

/**
 * Card de categoría para la grilla (portada + nombre + cantidad).
 * @param {{ slug:string, name:string, emoji?:string, cover?:string, count?:number }} props
 */
export default function CategoryCard({ slug, name, emoji, cover, count }) {
  return (
    <Link
      to={`/categoria/${slug}`}
      className="card-glass card-glass-hover overflow-hidden flex flex-col group"
    >
      <div className="relative aspect-square overflow-hidden bg-white/[0.03] grid place-items-center p-4">
        {cover ? (
          <img
            src={cover}
            alt={name}
            loading="lazy"
            className="max-w-full max-h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <span className="text-5xl opacity-80">{emoji || '🏷️'}</span>
        )}
        {typeof count === 'number' && (
          <span className="absolute top-2 right-2 badge badge-soft !text-[10px] !py-1 !px-2">
            {count}
          </span>
        )}
      </div>
      <div className="px-4 py-3 flex items-center gap-2">
        <span aria-hidden>{emoji}</span>
        <h3 className="font-semibold text-sm leading-tight">{name}</h3>
      </div>
    </Link>
  );
}
