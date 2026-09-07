import {
  WELCOME_COUPON_STORAGE_KEY,
  CUPON_VENTANA_MS,
  cuponTieneVentana,
  ventanaCuponAbierta
} from '../config/pricing.js';

/**
 * La ventana de 10 minutos del cupón de bienvenida (spec 017).
 *
 * Un solo lugar para emitir, leer y preguntar si venció. El popup lo emite, el
 * checkout lo lee, y los dos muestran el mismo contador — si cada uno hablara
 * con `localStorage` por su cuenta, alcanzaría con que uno normalizara distinto
 * para que la pantalla y el precio dijeran cosas diferentes.
 *
 * ⚠️ CAMBIO DE FORMATO. Hasta esta spec, `epicalcos.welcomeCoupon` guardaba el
 * CÓDIGO SUELTO como string ("EPICA10"). Ahora guarda `{ code, emitidoEn }`.
 * Hay navegadores con el formato viejo ya guardado, y un `JSON.parse('EPICA10')`
 * tira: `leerCupon()` lo contempla explícitamente. Hay precedente de este daño
 * en `esCustomViejo()` del CartContext.
 *
 * ⚠️ TODO ACCESO A `localStorage` VA EN try/catch. En el navegador embebido de
 * Instagram —que es de donde viene la mayoría del tráfico— puede tirar por
 * storage restringido, y un cupón no puede romper el checkout.
 */

/**
 * Guarda el cupón recién entregado y arranca su ventana.
 * @returns {number|null} el instante de emisión, o null si no se pudo guardar.
 */
export function emitirCupon(code) {
  const emitidoEn = Date.now();
  try {
    localStorage.setItem(WELCOME_COUPON_STORAGE_KEY, JSON.stringify({ code, emitidoEn }));
    return emitidoEn;
  } catch {
    // Sin storage no hay ventana que sostener, pero el código sigue sirviendo:
    // el popup se lo muestra igual y lo puede tipear a mano.
    return null;
  }
}

/**
 * El cupón guardado: `{ code, emitidoEn }`, o null si no hay ninguno.
 *
 * `emitidoEn: null` = venía del formato viejo. NO se descarta ni se le pone la
 * fecha de hoy: se devuelve sin instante de emisión, que es lo que hace que
 * `ventanaCuponAbierta` lo trate como "sin ventana" y siga valiendo. El que ya
 * tenía su código no se entera de nada, y sobre todo NO le arranca vencido.
 */
export function leerCupon() {
  let raw = '';
  try {
    raw = localStorage.getItem(WELCOME_COUPON_STORAGE_KEY) || '';
  } catch {
    return null;
  }
  if (!raw.trim()) return null;

  try {
    const data = JSON.parse(raw);
    // Un JSON válido que no sea nuestro objeto (por ejemplo un número suelto)
    // también cae acá: se trata como formato viejo.
    if (data && typeof data === 'object' && data.code) {
      const emitidoEn = Number(data.emitidoEn);
      return { code: String(data.code), emitidoEn: Number.isFinite(emitidoEn) ? emitidoEn : null };
    }
    return { code: String(data), emitidoEn: null };
  } catch {
    // Formato viejo: el string pelado.
    return { code: raw.trim(), emitidoEn: null };
  }
}

/** Borra el cupón guardado. Se usa al vencer, para no reofrecerlo. */
export function olvidarCupon() {
  try {
    localStorage.removeItem(WELCOME_COUPON_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Milisegundos que le quedan a la ventana.
 *
 * `Infinity` = este cupón no tiene ventana (no vino del popup, o es un código
 * sin ventana como EPI50). Devolver Infinity y no `null` deja que el llamador
 * compare siempre con un número, sin ramas extra.
 */
export function msRestantes(cupon, now = Date.now()) {
  if (!cupon?.code || !cuponTieneVentana(cupon.code)) return Infinity;
  if (!Number.isFinite(cupon.emitidoEn)) return Infinity;
  return Math.max(0, cupon.emitidoEn + CUPON_VENTANA_MS - now);
}

/** ¿Este cupón guardado sigue sirviendo? */
export function cuponVigente(cupon, now = Date.now()) {
  if (!cupon?.code) return false;
  if (!cuponTieneVentana(cupon.code)) return true;
  return ventanaCuponAbierta(cupon.emitidoEn, now);
}
