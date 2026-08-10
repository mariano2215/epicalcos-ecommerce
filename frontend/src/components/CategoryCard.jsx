import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Portada determinística por slug: misma categoría → misma imagen siempre
// (memoria visual del catálogo; sin saltos entre recargas).
// `rotation` corre ese índice para mostrar otro diseño de la misma categoría.
function coverFor(slug, count, rotation, cover) {
  if (!count || count <= 1 || !slug) return cover;
  const hash = [...slug].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const n = ((hash + rotation) % count) + 1;
  return `/stickers/${slug}/${n}.webp`;
}

export default function CategoryCard({ slug, name, emoji, cover, count, rotation = 0 }) {
  const [src, setSrc] = useState(() => coverFor(slug, count, 0, cover));
  const [swapping, setSwapping] = useState(false);

  const next = coverFor(slug, count, rotation, cover);

  useEffect(() => {
    if (!next || next === src) return;
    let cancelled = false;
    let applied = false;
    let timer;
    // Precargamos antes de cambiar el src: así el crossfade no deja un hueco,
    // y si la imagen no existe nos quedamos con la que ya estaba.
    const apply = () => {
      if (cancelled || applied) return;
      applied = true;
      setSwapping(true);
      timer = setTimeout(() => {
        if (cancelled) return;
        setSrc(next);
        setSwapping(false);
      }, 200);
    };
    const pre = new Image();
    pre.onload = apply;
    pre.src = next;
    if (pre.complete) apply();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next]);

  return (
    <Link
      to={`/categoria/${slug}`}
      className="card-glass card-glass-hover overflow-hidden flex flex-col group"
    >
      <div className="relative aspect-square overflow-hidden bg-white/[0.03] grid place-items-center p-4">
        {src || cover ? (
          <div
            className="w-full h-full grid place-items-center transition-opacity duration-200"
            style={{ opacity: swapping ? 0 : 1 }}
          >
            <img
              src={src || cover}
              alt={name}
              loading="lazy"
              decoding="async"
              /* Portadas cuadradas de 320 px — el alto queda reservado antes de
                 la descarga y la grilla de categorías no salta (CLS). */
              width={320}
              height={320}
              onError={() => { if (src !== cover) setSrc(cover); }}
              className="max-w-full max-h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-transform duration-500 group-hover:scale-110"
            />
          </div>
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
