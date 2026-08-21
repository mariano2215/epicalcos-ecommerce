import { Link } from 'react-router-dom';
import StickerField from './StickerField.jsx';
import { useCountdown } from '../lib/promo.js';

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Fecha de cierre en texto lindo (hora Argentina): "viernes 14/8". Se arma por
 * partes: el formato corrido de es-AR separa con guion ("viernes, 14-8").
 */
export function endLabel(endMs, fallback = '') {
  try {
    const parts = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).formatToParts(new Date(endMs));
    const get = (type) => parts.find((p) => p.type === type)?.value;
    const [weekday, day, month] = [get('weekday'), get('day'), get('month')];
    return weekday && day && month ? `${weekday} ${day}/${month}` : fallback;
  } catch {
    return fallback;
  }
}

/** `late` = la caja de los segundos, la única que se mueve en cada tick. */
function TimeBox({ value, label, late }) {
  return (
    <div className={`promo-timebox${late ? ' promo-timebox--seg' : ''}`}>
      <span className="promo-timebox__num tabular-nums">{pad2(value)}</span>
      <span className="promo-timebox__lbl">{label}</span>
    </div>
  );
}

/**
 * Cuenta regresiva días : horas : min : seg hasta `endMs`. Se usa en el banner
 * del header y también dentro de /mayorista.
 */
export function PromoCountdown({ endMs, label = 'Termina en' }) {
  const { days, hours, minutes, seconds } = useCountdown(endMs);

  return (
    <div
      className="promo-countdown"
      aria-label={`${label} ${days} días ${hours} horas ${minutes} minutos ${seconds} segundos`}
    >
      {/* Decorativo: el rayo dice "relámpago" sin gastar el ancho de un texto,
          que en 375 px no sobra. Oculto para lectores de pantalla — el
          aria-label del contador ya dice todo lo que hay que decir. */}
      <span className="promo-countdown__rayo" aria-hidden="true">⚡</span>
      <TimeBox value={days} label="días" />
      <span className="promo-timebox__sep" aria-hidden="true">:</span>
      <TimeBox value={hours} label="hs" />
      <span className="promo-timebox__sep" aria-hidden="true">:</span>
      <TimeBox value={minutes} label="min" />
      <span className="promo-timebox__sep" aria-hidden="true">:</span>
      <TimeBox value={seconds} label="seg" late />
    </div>
  );
}

/**
 * Banner de promo pensado para vivir dentro del <header>: fondo de calcos
 * flotantes + titular + cuenta regresiva. El Header decide QUÉ promo mostrar
 * (solo con la promo vigente) y le pasa el texto y el link.
 */
export default function PromoBanner({ title, subtitle, endMs, to, ariaLabel }) {
  return (
    <div className="promo-banner" role="region" aria-label={ariaLabel || title}>
      {/* Fondo: calcos flotantes + scrim para legibilidad */}
      <StickerField count={9} opacity={0.16} className="promo-banner__stickers" />
      <div className="promo-banner__scrim" aria-hidden="true" />

      {/* z-10: por encima de los calcos (1), del scrim (2) y del barrido (3). */}
      <div className="container-app relative z-10 py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center sm:justify-between">
          <div className="min-w-0">
            <Link to={to} className="group inline-flex flex-col items-center sm:items-start">
              <span className="promo-banner__title">{title}</span>
              <span className="promo-banner__sub">{subtitle}</span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <PromoCountdown endMs={endMs} />
            <Link to={to} className="promo-banner__cta shrink-0 hidden md:inline-flex">
              Comprar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
