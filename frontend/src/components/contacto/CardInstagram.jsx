import { useState } from 'react';
import { contact } from '../../config/site.js';
import { instagramPosts } from '../../data/instagram.js';
import { trackInstagramClick } from '../../lib/analytics.js';

/**
 * Grilla de posteos reales (spec 012). La card de antes decía "@epicalcos" y
 * nada más: no mostraba nada de la cuenta, así que no aportaba la prueba social
 * que la cuenta sí tiene.
 *
 * SON ARCHIVOS PROPIOS, NO UN EMBED. Las tres alternativas automáticas están
 * evaluadas y descartadas en design.md §11: el embed oficial mete un script de
 * Meta y un iframe por posteo, la API de Meta trae un token que vence cada 60
 * días, y un widget de terceros es una suscripción y un script pesado. Acá no
 * se pide nada a instagram.com hasta que el cliente toca una foto.
 *
 * Las imágenes las genera scripts/build-instagram.mjs desde los permalinks.
 */
export default function CardInstagram() {
  // Una imagen que no carga se saca de la grilla en vez de dejar el hueco roto.
  // Si fallan las tres, queda la card con el CTA al perfil: nunca una página rota.
  const [rotas, setRotas] = useState(() => new Set());
  const visibles = instagramPosts.filter((p) => !rotas.has(p.src));

  const marcarRota = (src) => setRotas((prev) => new Set(prev).add(src));

  return (
    <div className="card-glass p-6 md:p-7">
      <div className="flex items-start gap-4">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg shadow-fuchsia-500/20"
          style={{ backgroundImage: 'linear-gradient(135deg,#833AB4 0%,#FD1D1D 55%,#FCB045 100%)' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-6 w-6">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
        </span>
        <div className="min-w-0">
          <h2 className="font-display font-extrabold text-xl">Instagram</h2>
          <p className="text-white/70 text-sm mt-1.5">
            Ahí subimos las tiradas nuevas, los antes y después y lo que van mandando los clientes.
          </p>
          <p className="text-white/45 text-sm mt-2">{contact.instagram}</p>
        </div>
      </div>

      {visibles.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-5">
          {visibles.map((post) => (
            <a
              key={post.src}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackInstagramClick('contacto_grilla')}
              className="group relative block aspect-square overflow-hidden rounded-xl border border-white/10 focus-visible:ring-2 focus-visible:ring-brand-pink"
            >
              <img
                src={post.src}
                alt={post.alt}
                loading="lazy"
                decoding="async"
                width={640}
                height={640}
                onError={() => marcarRota(post.src)}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/25"
              />
            </a>
          ))}
        </div>
      )}

      <a
        href={contact.instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackInstagramClick('contacto_cta')}
        className="btn-secondary w-full mt-4 min-h-[44px]"
      >
        Ver más en Instagram
      </a>
    </div>
  );
}
