import { useEffect, useState } from 'react';
import {
  PROMO_START_MS,
  PROMO_END_MS,
  isPromoActive,
  PROMO_MAYORISTA_START_MS,
  PROMO_MAYORISTA_END_MS,
  isMayoristaPromoActive,
  PROMO_2X1_START_MS,
  PROMO_2X1_END_MS,
  is2x1PromoActive,
  PROMO_ARGENTINA_START_MS,
  PROMO_ARGENTINA_END_MS,
  isArgentinaPromoActive
} from '../config/pricing.js';

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

/**
 * ¿Está vigente una promo con VENTANA (inicio + fin), ahora mismo?
 *
 * Una promo que arranca a una hora en la que nadie va a estar deployando tiene
 * que ENCENDERSE sola, no solo apagarse. Por eso hay dos hitos.
 *
 * Quién decide es `esActiva()` —la misma función pura que valida el precio y
 * que cubren los tests en los cuatro bordes—; el hook solo se encarga de
 * RE-RENDERIZAR en el momento justo. Duplicar acá la comparación de fechas
 * sería exactamente el tipo de copia que después se desincroniza.
 *
 * El timeout se limita a un día por vuelta: `setTimeout` desborda pasados ~24,8
 * días y dispararía al instante, así que una promo agendada con meses de
 * anticipación se revisa por tramos.
 *
 * ⚠️ LAS DOS PUNTAS PUEDEN SER NaN (spec 017): las promos sin fecha guardan
 * `startsAt: null` / `endsAt: null` y `Date.parse(null)` da NaN. Sin las guardas
 * de `Number.isFinite` de acá abajo, `proximoHito` daba NaN y `setTimeout(…,
 * NaN)` se comporta como `setTimeout(…, 0)`: un bucle de re-render a 0 ms que
 * traba la pestaña. Una punta ausente = no hay hito que esperar de ese lado.
 */
function useVentanaActiva(esActiva, startMs, endMs) {
  const [active, setActive] = useState(esActiva);

  useEffect(() => {
    const UN_DIA = 86_400_000;
    let id;
    const revisar = () => {
      setActive(esActiva());
      const ahora = Date.now();
      if (Number.isFinite(endMs) && ahora > endMs) return; // ya pasó: nada que esperar
      // +1s de colchón para caer del lado correcto del borde.
      const proximoHito =
        Number.isFinite(startMs) && ahora < startMs
          ? startMs - ahora
          : Number.isFinite(endMs)
            ? endMs - ahora
            : null;
      // Sin ninguna punta futura la promo no cambia sola: no hace falta timer.
      if (proximoHito === null) return;
      id = setTimeout(revisar, Math.min(proximoHito + 1000, UN_DIA));
    };
    revisar();
    return () => clearTimeout(id);
  }, [esActiva, startMs, endMs]);

  return active;
}

/**
 * ¿Está vigente la promo 3x2 ahora mismo?
 *
 * Desde la spec 017 no tiene fecha de fin: el hook igual pasa por
 * `useVentanaActiva` para no duplicar la lógica y para que volver a ponerle una
 * fecha sea cambiar solo el config.
 */
export function usePromoActive() {
  return useVentanaActiva(isPromoActive, PROMO_START_MS, PROMO_END_MS);
}

/** ¿Está vigente el 2x1 en las categorías más elegidas? (spec 017). */
export function use2x1PromoActive() {
  return useVentanaActiva(is2x1PromoActive, PROMO_2X1_START_MS, PROMO_2X1_END_MS);
}

/** ¿Está vigente la promo de Argentina 50 %? (lun 17 a mié 19 de agosto). */
export function useArgentinaPromoActive() {
  return useVentanaActiva(isArgentinaPromoActive, PROMO_ARGENTINA_START_MS, PROMO_ARGENTINA_END_MS);
}

/**
 * ¿Está vigente la promo mayorista ahora mismo?
 *
 * ⚠️ Antes era `useActiveUntil(PROMO_MAYORISTA_END_MS) && activa`, y con la
 * spec 017 esa versión dejaba la promo APAGADA para siempre: sin `endsAt`,
 * `Number.isFinite(NaN)` es false y `useActiveUntil` arrancaba en `false`.
 * Ahora pasa por el mismo `useVentanaActiva` que las otras dos, que es el único
 * que sabe leer una ventana abierta, y el interruptor `activa` ya lo mira
 * `isMayoristaPromoActive()` — así el hook y el precio no pueden discrepar.
 */
export function useMayoristaPromoActive() {
  return useVentanaActiva(
    isMayoristaPromoActive,
    PROMO_MAYORISTA_START_MS,
    PROMO_MAYORISTA_END_MS
  );
}
