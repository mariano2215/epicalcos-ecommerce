import { TESTIMONIALS } from '../data/testimonials.js';
import { brandStats } from '../config/brandStats.js';

/**
 * Prueba social compacta, para poner CERCA del botón de compra.
 *
 * Los testimonios reales solo vivían en el bloque grande del Home y en
 * /negocio — o sea, lejos de donde se decide. Este componente es la versión
 * chica: un testimonio con su foto más los números de marca, sin robarle
 * espacio al CTA.
 *
 * `index` elige cuál mostrar, para no repetir el mismo en dos pantallas
 * seguidas del mismo flujo.
 *
 * `destacado` agranda la foto: en /personalizados la prueba no es la frase, es
 * ver el calco puesto en la puerta del local. En 64 px eso no se ve. El resto
 * de las pantallas sigue con la miniatura, que va al lado del CTA y no puede
 * robarle espacio.
 *
 * @param {{ index?: number, className?: string, conFoto?: boolean, destacado?: boolean }} props
 */
export default function SocialProof({ index = 0, className = '', conFoto = true, destacado = false }) {
  const t = TESTIMONIALS[index % TESTIMONIALS.length];
  if (!t) return null;

  if (destacado) {
    return (
      <figure
        className={`rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden ${className}`}
      >
        <div className="grid sm:grid-cols-[minmax(0,260px)_1fr] sm:items-stretch">
          {t.image && (
            <img
              src={t.image}
              alt={`Calco aplicado — testimonio de ${t.name}`}
              /* Arriba del fold: en lazy, el navegador la pide tarde y es
                 justamente la imagen que sostiene la página. */
              loading="eager"
              fetchpriority="high"
              decoding="async"
              width={800}
              height={743}
              /* Desktop: la proporción real de la foto, sin recorte — con
                 `h-full` el estirado se comía el borde del calco, que es justo
                 lo único que hay que ver acá.
                 Mobile: 240 px fijos. A ancho completo la proporción real da
                 310 px y empuja el paso 1 abajo del fold, que es de donde viene
                 casi toda la venta. Con 240 el calco entra entero igual. */
              className="w-full h-60 sm:h-auto sm:aspect-[800/743] object-cover"
            />
          )}
          <div className="p-5 flex flex-col justify-center">
            <blockquote className="text-base text-white/85 leading-snug">“{t.text}”</blockquote>
            <figcaption className="text-xs text-white/50 mt-2">
              {t.name} · {t.label}
            </figcaption>
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
              <span>
                <strong className="text-white">{brandStats.calcosVendidas.value}</strong>{' '}
                {brandStats.calcosVendidas.label}
              </span>
              <span>
                <strong className="text-white">{brandStats.clientes.value}</strong> {brandStats.clientes.label}
              </span>
            </div>
          </div>
        </div>
      </figure>
    );
  }

  return (
    <figure className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${className}`}>
      <div className="flex gap-3">
        {conFoto && t.image && (
          <img
            src={t.image}
            alt={`Calco aplicado — testimonio de ${t.name}`}
            loading="lazy"
            decoding="async"
            width={64}
            height={64}
            className="w-16 h-16 rounded-xl object-cover shrink-0"
          />
        )}
        <div className="min-w-0">
          <blockquote className="text-sm text-white/80 leading-snug">“{t.text}”</blockquote>
          <figcaption className="text-xs text-white/45 mt-1.5">
            {t.name} · {t.label}
          </figcaption>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
        <span>
          <strong className="text-white">{brandStats.calcosVendidas.value}</strong>{' '}
          {brandStats.calcosVendidas.label}
        </span>
        <span>
          <strong className="text-white">{brandStats.clientes.value}</strong> {brandStats.clientes.label}
        </span>
      </div>
    </figure>
  );
}
