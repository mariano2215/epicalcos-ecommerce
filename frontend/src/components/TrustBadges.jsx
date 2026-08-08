import { trustPoints } from '../config/brandStats.js';

/**
 * Tira de señales de confianza (agua, sol, vinilo, clientes).
 *
 * Existe porque en mobile el hero no mostraba NINGUNA: el badge de
 * "resistentes al agua y al sol" y el párrafo de propuesta están ocultos por
 * `hidden sm:*`, así que en un celular el primer scroll no traía ni un motivo
 * para confiar. Este componente sí se ve en todos los tamaños.
 *
 * @param {{ className?: string, compact?: boolean }} props
 *        `compact` = versión chica para meter dentro de una ficha de producto.
 */
export default function TrustBadges({ className = '', compact = false }) {
  return (
    <ul
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-2 ${className}`}
      aria-label="Por qué EPICALCOS"
    >
      {trustPoints.map((p) => (
        <li
          key={p.text}
          // Fondo opaco + blur: en el hero estas píldoras van encima del campo
          // de stickers, y con un `bg-white/[0.06]` el texto quedaba ilegible.
          className={`flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 backdrop-blur-sm ${
            compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs sm:text-sm'
          } text-white/90 font-medium`}
        >
          <span aria-hidden>{p.icon}</span>
          <span className="whitespace-nowrap">{p.text}</span>
        </li>
      ))}
    </ul>
  );
}
