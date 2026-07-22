import { Link } from 'react-router-dom';
import StickerField from './StickerField.jsx';
import { useCountdown } from '../lib/promo.js';
import { PROMO_END_MS, PROMO_3X2 } from '../config/pricing.js';

const pad2 = (n) => String(n).padStart(2, '0');

/** Fecha de cierre en texto lindo (hora Argentina): "domingo 26/7". */
const endLabel = (() => {
  try {
    const s = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(new Date(PROMO_END_MS));
    return s.replace(',', '');
  } catch {
    return 'el domingo 26/7';
  }
})();

function TimeBox({ value, label }) {
  return (
    <div className="promo-timebox">
      <span className="promo-timebox__num tabular-nums">{pad2(value)}</span>
      <span className="promo-timebox__lbl">{label}</span>
    </div>
  );
}

/**
 * Banner de la promo 3x2, pensado para vivir dentro del <header>: fondo de
 * calcos flotantes + titular "3×2 en todas las calcos" + cuenta regresiva.
 * El Header decide cuándo mostrarlo (solo con la promo vigente).
 */
export default function PromoBanner() {
  const { days, hours, minutes, seconds } = useCountdown(PROMO_END_MS);

  return (
    <div className="promo-banner" role="region" aria-label="Promoción 3x2 en todas las calcos">
      {/* Fondo: calcos flotantes + scrim para legibilidad */}
      <StickerField count={9} opacity={0.16} className="promo-banner__stickers" />
      <div className="promo-banner__scrim" aria-hidden="true" />

      <div className="container-app relative z-10 py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center sm:justify-between">
          <div className="min-w-0">
            <Link to="/categorias" className="group inline-flex flex-col items-center sm:items-start">
              <span className="promo-banner__title gradient-text">3×2 EN TODAS LAS CALCOS</span>
              <span className="promo-banner__sub">
                Sumá <strong>{PROMO_3X2.couponCode}</strong> y llevate 10% extra · hasta {endLabel}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5" aria-label={`Termina en ${days} días ${hours} horas ${minutes} minutos ${seconds} segundos`}>
              <TimeBox value={days} label="días" />
              <span className="promo-timebox__sep" aria-hidden="true">:</span>
              <TimeBox value={hours} label="hs" />
              <span className="promo-timebox__sep" aria-hidden="true">:</span>
              <TimeBox value={minutes} label="min" />
              <span className="promo-timebox__sep" aria-hidden="true">:</span>
              <TimeBox value={seconds} label="seg" />
            </div>
            <Link to="/categorias" className="btn-primary shrink-0 !py-2 !px-3.5 !text-xs hidden md:inline-flex">
              Comprar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
