import { REGALO_BIENVENIDA, REGALO_STORAGE_KEY } from '../config/pricing.js';

/**
 * El pack de stickers sorpresa del popup y su ventana de 10 minutos (spec 025).
 *
 * Un solo lugar para emitirlo, leerlo y saber cuánto le queda. El popup lo
 * emite, el checkout lo lee, y los dos muestran el mismo contador — espejo de
 * `cuponVentana.js`, por el mismo motivo: si cada pantalla hablara con
 * `localStorage` por su cuenta, alcanzaría con que una normalizara distinto
 * para que una prometa el pack y la otra no.
 *
 * ⚠️ TODO ACCESO A `localStorage` VA EN try/catch. En el navegador embebido de
 * Instagram —de donde viene la mayoría del tráfico— puede tirar por storage
 * restringido, y un regalo no puede romper el checkout.
 */

/**
 * Copia en memoria del regalo emitido en esta carga de página.
 *
 * ⚠️ NO ES REDUNDANCIA CON `localStorage`, y es la diferencia con el cupón de la
 * spec 017. Ese podía sobrevivir sin storage porque TENÍA UN CÓDIGO: el popup
 * lo mostraba en pantalla y la persona lo tipeaba a mano en el checkout. El
 * regalo no tiene código. Sin esta copia, con el storage bloqueado el pack se
 * perdería al pasar del popup al checkout aunque sea navegación SPA, sin
 * recarga y sin que nadie pueda hacer nada al respecto.
 *
 * Se pierde al recargar la página. Ese es el techo declarado en requirements §10.
 */
let enMemoria = null;

/**
 * Entrega el pack y ARRANCA la ventana: de acá salen los 10 minutos que cuenta
 * el contador y los que después revalida el servidor.
 * @returns {{ regalo: string, emitidoEn: number }} el regalo emitido.
 */
export function emitirRegalo(now = Date.now()) {
  const emitido = { regalo: REGALO_BIENVENIDA.id, emitidoEn: now };
  enMemoria = emitido;
  try {
    localStorage.setItem(REGALO_STORAGE_KEY, JSON.stringify(emitido));
  } catch {
    // Storage bloqueado: queda la copia en memoria, que alcanza para llegar al
    // checkout en esta misma sesión.
  }
  return emitido;
}

/**
 * El regalo guardado: `{ regalo, emitidoEn }`, o null si no hay ninguno.
 *
 * Cualquier lectura fallida o cualquier forma que no sea la esperada cae en la
 * copia en memoria en vez de devolver null: el que acaba de dejar el mail en
 * esta misma sesión no pierde el pack porque el storage esté roto o tenga
 * basura de otra cosa.
 */
export function leerRegalo() {
  let raw = '';
  try {
    raw = localStorage.getItem(REGALO_STORAGE_KEY) || '';
  } catch {
    return enMemoria;
  }
  if (!raw.trim()) return enMemoria;

  try {
    const data = JSON.parse(raw);
    const emitidoEn = Number(data?.emitidoEn);
    if (!data?.regalo || !Number.isFinite(emitidoEn)) return enMemoria;
    return { regalo: String(data.regalo), emitidoEn };
  } catch {
    return enMemoria;
  }
}

/** Borra el regalo. Se usa al vencer, para no volver a ofrecerlo ya vencido. */
export function olvidarRegalo() {
  enMemoria = null;
  try {
    localStorage.removeItem(REGALO_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Milisegundos que le quedan a la ventana. Nunca negativo.
 *
 * ⚠️ Sin `emitidoEn` devuelve 0 y NO Infinity como `msRestantes` del cupón: un
 * cupón sin emisión es un código tipeado a mano que vale igual, un regalo sin
 * emisión directamente no existe.
 */
export function msRestantesRegalo(regalo, now = Date.now()) {
  const emitidoEn = Number(regalo?.emitidoEn);
  if (!Number.isFinite(emitidoEn)) return 0;
  return Math.max(0, emitidoEn + REGALO_BIENVENIDA.ventanaMs - now);
}
