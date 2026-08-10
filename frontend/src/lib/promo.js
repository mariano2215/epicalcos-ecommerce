import { useEffect, useState } from 'react';
import { PROMO_END_MS, PROMO_MAYORISTA_END_MS, PROMO_MAYORISTA_100 } from '../config/pricing.js';

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
 * ¿Estamos antes de `endMs`? Se vuelve `false` solo en el instante en que vence,
 * sin necesidad de recargar (deja de renderizar el banner y hace que los precios
 * vuelvan a la normalidad en el próximo render).
 */
export function useActiveUntil(endMs) {
  const [active, setActive] = useState(() => Number.isFinite(endMs) && Date.now() <= endMs);

  useEffect(() => {
    if (!active) return undefined;
    const ms = endMs - Date.now();
    if (ms <= 0) {
      setActive(false);
      return undefined;
    }
    // +1s de colchón para caer del lado inactivo con seguridad.
    const t = setTimeout(() => setActive(false), ms + 1000);
    return () => clearTimeout(t);
  }, [active, endMs]);

  return active;
}

/** ¿Está vigente la promo 3x2 ahora mismo? */
export function usePromoActive() {
  return useActiveUntil(PROMO_END_MS);
}

/**
 * ¿Está vigente la promo mayorista ahora mismo? Mismo criterio que
 * `isMayoristaPromoActive()`: la fecha Y el interruptor manual `activa`. El
 * hook tiene que mirar los dos — si solo mirara la fecha, apagar la promo con
 * `activa: false` la sacaría del precio pero dejaría el banner y la card del
 * hero anunciándola.
 */
export function useMayoristaPromoActive() {
  const enFecha = useActiveUntil(PROMO_MAYORISTA_END_MS);
  return PROMO_MAYORISTA_100.activa && enFecha;
}
