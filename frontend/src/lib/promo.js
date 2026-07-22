import { useEffect, useState } from 'react';
import { PROMO_END_MS, isPromoActive } from '../config/pricing.js';

/**
 * Cuenta regresiva hasta `targetMs`. Devuelve días/horas/minutos/segundos ya
 * partidos y `done` cuando llega a cero. Recalcula desde Date.now() en cada tick
 * (no acumula drift) y limpia el intervalo al desmontar.
 */
export function useCountdown(targetMs) {
  const [remaining, setRemaining] = useState(() => Math.max(0, targetMs - Date.now()));

  useEffect(() => {
    setRemaining(Math.max(0, targetMs - Date.now()));
    if (targetMs - Date.now() <= 0) return undefined;
    const id = setInterval(() => {
      const ms = Math.max(0, targetMs - Date.now());
      setRemaining(ms);
      if (ms <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    total: remaining,
    done: remaining <= 0
  };
}

/**
 * ¿Está vigente la promo 3x2 ahora mismo? Se vuelve `false` sola en el instante
 * en que vence, sin necesidad de recargar (deja de renderizar el banner y hace
 * que los precios vuelvan a la normalidad en el próximo render).
 */
export function usePromoActive() {
  const [active, setActive] = useState(() => isPromoActive());

  useEffect(() => {
    if (!active) return undefined;
    const ms = PROMO_END_MS - Date.now();
    if (ms <= 0) {
      setActive(false);
      return undefined;
    }
    // +1s de colchón para caer del lado inactivo con seguridad.
    const t = setTimeout(() => setActive(false), ms + 1000);
    return () => clearTimeout(t);
  }, [active]);

  return active;
}
