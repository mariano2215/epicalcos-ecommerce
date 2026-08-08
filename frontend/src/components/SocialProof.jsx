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
 * @param {{ index?: number, className?: string, conFoto?: boolean }} props
 */
export default function SocialProof({ index = 0, className = '', conFoto = true }) {
  const t = TESTIMONIALS[index % TESTIMONIALS.length];
  if (!t) return null;

  return (
    <figure className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${className}`}>
      <div className="flex gap-3">
        {conFoto && t.image && (
          <img
            src={t.image}
            alt={`Calco aplicado — testimonio de ${t.name}`}
            loading="lazy"
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
