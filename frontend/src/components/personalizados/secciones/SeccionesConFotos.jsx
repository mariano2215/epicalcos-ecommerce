import { FOTOS, queConvertirCompleto } from '../../../data/personalizadosFotos.js';
import { DE_IMAGEN_A_CALCO, QUE_CONVERTIR, GALERIA, CALIDAD } from '../../../config/personalizadosLanding.js';
import Reveal from '../../Reveal.jsx';

/**
 * Las cuatro secciones que dependen de FOTOS REALES (RF-L2). Cada una devuelve
 * `null` si su lista en `data/personalizadosFotos.js` está vacía: ni un
 * placeholder, ni un render, ni un texto que diga que faltan (Mariano,
 * 14/9/2026). Hoy están las cuatro apagadas; se prenden solas el día que se
 * carguen fotos.
 *
 * Todas las fotos van `lazy` y con su `width`/`height` reales: ninguna está
 * arriba del fold y ninguna puede mover el layout al llegar.
 */

function Foto({ f, className = '' }) {
  return (
    <img
      src={f.src}
      alt={f.alt}
      width={f.width}
      height={f.height}
      loading="lazy"
      decoding="async"
      className={`w-full h-auto rounded-2xl border border-white/10 ${className}`}
    />
  );
}

const Encabezado = ({ titulo, bajada }) => (
  <div className="seccion-encabezado text-center">
    <h2 className="font-display font-extrabold text-3xl md:text-5xl">{titulo}</h2>
    {bajada && <p className="text-white/65 mt-3 text-sm md:text-base">{bajada}</p>}
  </div>
);

/** ORIGINAL → CALCO → APLICADA, del MISMO diseño (RF-L4). Vertical en mobile. */
export function DeImagenACalco() {
  if (!FOTOS.deImagenACalco.length) return null;
  return (
    <section className="seccion">
      <div className="container-app">
        <Encabezado titulo={DE_IMAGEN_A_CALCO.titulo} bajada={DE_IMAGEN_A_CALCO.bajada} />
        <div className="space-y-10">
          {FOTOS.deImagenACalco.map((trio, i) => (
            <Reveal key={i}>
              <ol className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
                {[trio.original, trio.calco, trio.aplicada].map((f, j) => (
                  <li key={j} className="contents">
                    {j > 0 && (
                      <span className="text-center text-2xl text-white/40" aria-hidden="true">
                        <span className="md:hidden">↓</span>
                        <span className="hidden md:inline">→</span>
                      </span>
                    )}
                    <figure>
                      <Foto f={f} className="aspect-square object-cover" />
                      <figcaption className="text-xs text-white/60 mt-2 text-center">
                        {String(j + 1).padStart(2, '0')} — {DE_IMAGEN_A_CALCO.pasos[j]}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ol>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Mascota, foto, dibujo, logo (RF-L5). Solo con las cuatro fotos. */
export function QuePodesConvertir() {
  if (!queConvertirCompleto()) return null;
  return (
    <section className="seccion">
      <div className="container-app">
        <Encabezado titulo={QUE_CONVERTIR.titulo} />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {QUE_CONVERTIR.items.map((it) => (
            <div key={it.id} className="card-glass overflow-hidden">
              <Foto f={FOTOS.queConvertir[it.id]} className="!rounded-none !border-0 aspect-square object-cover" />
              <div className="p-4">
                <h3 className="font-display font-extrabold text-base leading-tight">
                  <span aria-hidden="true">{it.emoji}</span> {it.titulo}
                </h3>
                <p className="text-sm text-white/60 mt-1 leading-snug">{it.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Trabajos reales, en masonry (RF-L9). Desde `GALERIA.minimo` fotos. */
export function Galeria() {
  if (FOTOS.galeria.length < GALERIA.minimo) return null;
  return (
    <section className="seccion">
      <div className="container-app">
        <Encabezado titulo={GALERIA.titulo} bajada={GALERIA.bajada} />
        <div className="columns-2 md:columns-3 gap-3 [&>*]:mb-3">
          {FOTOS.galeria.map((f) => (
            <figure key={f.src} className="relative break-inside-avoid">
              <Foto f={f} />
              {f.etiqueta && (
                <figcaption className="absolute top-2 left-2 badge badge-soft !text-[10px]">{f.etiqueta}</figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Calidad del producto: foto macro 50/50 (RF-L11). */
export function Calidad() {
  if (!FOTOS.calidad) return null;
  return (
    <section className="seccion">
      <div className="container-app grid gap-8 md:grid-cols-2 md:items-center">
        <Foto f={FOTOS.calidad} />
        <div>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl leading-tight">{CALIDAD.titulo}</h2>
          <ul className="mt-6 grid grid-cols-2 gap-2">
            {CALIDAD.bullets.map((b) => (
              <li key={b} className="text-sm text-white/80 before:content-['✓'] before:text-emerald-400 before:mr-2">
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
