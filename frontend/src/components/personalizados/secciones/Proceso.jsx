import { PROCESO } from '../../../config/personalizadosLanding.js';
import { FOTOS } from '../../../data/personalizadosFotos.js';

const CLAVES = ['subi', 'revisamos', 'producimos', 'recibis'];

/**
 * "De tu archivo a tus manos" (RF-L10): responde "¿qué pasa después de subir mi
 * archivo?". Es también el destino de "Ver cómo funciona" (`id`).
 *
 * Heredó el contenido del bloque "Qué pasa después de comprar" del configurador
 * anterior. Ese bloque tenía además una card "¿Y si mi archivo no está
 * perfecto?", que se sacó el 15/8/2026 por pedido de Mariano: sembraba la duda
 * de que el archivo podía no servir justo cuando el cliente está por subirlo.
 * Mariano lo RATIFICÓ el 14/9/2026 (spec 023, P-3): no vuelve, ni como sección
 * ni como frase. El paso "Revisamos" es lo que tranquiliza sin plantear el
 * problema.
 *
 * Tampoco se menciona un boceto previo: no se manda (P-5), y no se dice.
 *
 * Foto por paso solo si hay una real en `data/personalizadosFotos.js`; si no,
 * el ícono.
 */
export default function Proceso() {
  return (
    <section id={PROCESO.id} className="seccion scroll-mt-24">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">{PROCESO.titulo}</h2>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESO.pasos.map((p, i) => {
            const foto = FOTOS.proceso[CLAVES[i]];
            return (
              <li key={p.titulo} className="card-glass p-5 flex gap-4 lg:flex-col lg:gap-3">
                {foto ? (
                  <img
                    src={foto.src}
                    alt={foto.alt}
                    width={foto.width}
                    height={foto.height}
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-16 lg:w-full lg:h-40 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <span className="grid place-items-center w-12 h-12 rounded-full bg-white/[0.06] text-2xl shrink-0" aria-hidden="true">
                    {p.icon}
                  </span>
                )}
                <div>
                  <div className="text-xs text-brand-fuchsia font-bold">{i + 1}</div>
                  <h3 className="font-display font-extrabold text-lg leading-tight">{p.titulo}</h3>
                  <p className="text-sm text-white/65 mt-1 leading-snug">{p.texto}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
