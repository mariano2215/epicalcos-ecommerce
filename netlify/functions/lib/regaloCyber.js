/**
 * Regalo de EPICYBER por dejar el mail en el popup (spec 037).
 *
 * Quien deja el mail queda anotado acá, y cuando ese mail compra en fecha se le
 * suma un pack de regalo al pedido. El mail se guarda en Blobs y no se consulta en
 * Notion ni en el CRM: esos son lentos para leerlos dentro de los 10 s de la función.
 *
 * ⚠️ EL REGALO NO ES UNA LÍNEA DEL PEDIDO: viaja como nota en `shipping.comments`,
 * que el mail interno y el CRM ya muestran. Mercado Pago no admite precios ≤ 0 y el
 * precio de un pedido no puede depender de esto: acá no se toca `pricing.js`.
 *
 * ⚠️ NADA DE ESTE ARCHIVO PUEDE FRENAR UN PEDIDO. Corre antes del mail de la
 * transferencia, que es la única constancia de esa venta: por eso cada acceso a Blobs
 * tiene tope de tiempo y `reclamarRegalo` no lanza nunca.
 */
import { getStore } from '@netlify/blobs';
import { CYBER, isCyberActive, isDigitalOnly } from './pricing.js';

/**
 * ⚠️ Espejo de `POPUP_CYBER` en frontend/src/config/popup.js (lo verifica
 * `regaloCyber.test.js`): el popup promete lo que este objeto cumple.
 */
export const REGALO_CYBER = {
  /** Interruptor. Se prende en el mismo commit que `POPUP_CYBER.activo`. */
  activo: false,
  qty: 10,
  tamano: '4 cm',
  /**
   * Productos, sin envío. Es el pedido más chico que no pierde plata con el regalo
   * (spec 037 §7): sin mínimo, una compra de 1 calco perdería $4.709. Cubre un x10
   * por transferencia ($8.991).
   */
  minimoCompra: 8000
};

const STORE_NAME = 'cyber-regalo';
/** Tope por acceso. El mail de la transferencia sale con 6 s de presupuesto. */
const LIMITE_BLOBS_MS = 800;

const normalizarEmail = (email) => String(email || '').trim().toLowerCase();

/** Mismo fallback que orderStore y abandonedStore: ver el porqué en orderStore.js. */
function store() {
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;
  return siteID && token ? getStore({ name: STORE_NAME, siteID, token }) : getStore(STORE_NAME);
}

/** Rechaza si tarda más de la cuenta: Blobs no tiene timeout propio. */
function conLimite(promesa) {
  let timer;
  const corte = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout de Blobs')), LIMITE_BLOBS_MS);
  });
  return Promise.race([promesa, corte]).finally(() => clearTimeout(timer));
}

/** "del 2 al 8 de noviembre", para los mails. */
export function rangoCompra() {
  const parte = (ms, opciones) =>
    new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', ...opciones }).format(new Date(ms));
  return `del ${parte(CYBER.startMs, { day: 'numeric' })} al ${parte(CYBER.endMs, { day: 'numeric' })} de ${parte(CYBER.endMs, { month: 'long' })}`;
}

/** ¿Se pueden anotar mails ahora? Desde que se publica hasta que cierra la campaña. */
export function regaloVigente(ahora = Date.now()) {
  return REGALO_CYBER.activo && CYBER.activa && ahora <= CYBER.endMs;
}

/**
 * Anota el mail. Idempotente: el que lo deja dos veces no pierde el regalo, y uno ya
 * canjeado no vuelve a quedar disponible. Devuelve false si no se pudo guardar, y ahí
 * el popup tiene que dar error: confirmar un regalo que después no se va a poder
 * reconocer es peor que pedir que lo intente de nuevo.
 */
export async function registrarRegalo(email) {
  const key = normalizarEmail(email);
  if (!key) return false;
  try {
    const previo = await conLimite(store().get(key, { type: 'json' }));
    if (previo) return true;
    await conLimite(store().setJSON(key, { email: key, creadoEn: new Date().toISOString() }));
    return true;
  } catch (err) {
    console.error('[regalo-cyber] no se pudo registrar:', err?.message || err);
    return false;
  }
}

/** ¿El pedido cumple las condiciones, sin mirar todavía si el mail se anotó? */
function pedidoCalifica({ itemsTotal, items, ahora }) {
  return (
    REGALO_CYBER.activo &&
    isCyberActive(ahora) &&
    Number(itemsTotal) >= REGALO_CYBER.minimoCompra &&
    !isDigitalOnly(items)
  );
}

/**
 * Decide con el registro y el pedido. Pura, y por eso testeable sin Blobs.
 * Un registro canjeado por ESTE pedido sigue valiendo: Mercado Pago reintenta el
 * webhook y el reintento no puede perder el regalo.
 */
export function evaluarRegalo({ registro, orderId, itemsTotal, items, ahora = Date.now() }) {
  if (!registro || !pedidoCalifica({ itemsTotal, items, ahora })) return null;
  if (registro.orderId && registro.orderId !== orderId) return null;
  return { qty: REGALO_CYBER.qty, tamano: REGALO_CYBER.tamano };
}

/**
 * Resuelve el regalo de un pedido y lo marca como usado. **Nunca lanza.**
 *
 * @returns {Promise<null | { qty: number, tamano: string, verificar?: boolean }>}
 *   `verificar` = no se pudo leer la base: no se sabe si le corresponde, y el aviso
 *   interno lo dice para revisarlo a mano (spec 037, RF-17).
 */
export async function reclamarRegalo({ email, orderId, itemsTotal, items, ahora = Date.now() }) {
  const key = normalizarEmail(email);
  // Lo barato primero: un pedido que no califica no gasta una lectura de Blobs.
  if (!key || !pedidoCalifica({ itemsTotal, items, ahora })) return null;

  let registro;
  try {
    registro = await conLimite(store().get(key, { type: 'json' }));
  } catch (err) {
    console.error('[regalo-cyber] no se pudo leer:', err?.message || err);
    return { qty: REGALO_CYBER.qty, tamano: REGALO_CYBER.tamano, verificar: true };
  }

  const regalo = evaluarRegalo({ registro, orderId, itemsTotal, items, ahora });
  if (!regalo || registro.orderId === orderId) return regalo;

  try {
    await conLimite(store().setJSON(key, { ...registro, orderId, canjeadoEn: new Date(ahora).toISOString() }));
  } catch (err) {
    // El regalo vale igual: ya se leyó que le corresponde. Lo peor que pasa es que un
    // segundo pedido también lo reciba, y eso no justifica quitárselo a este.
    console.error('[regalo-cyber] no se pudo marcar como usado:', err?.message || err);
  }
  return regalo;
}

/** La línea que le dice a Mariano qué hacer con este pedido. */
export function notaRegalo(regalo) {
  if (regalo?.verificar) {
    return `⚠️ REGALO EPICYBER SIN VERIFICAR: no se pudo consultar la base. Revisar si este mail dejó sus datos en el popup (lead EPICYBER en el CRM).`;
  }
  return `🎁 REGALO EPICYBER: sumar 1 pack de ${regalo.qty} calcos sorpresa de ${regalo.tamano}.`;
}

/** Suma la nota a los comentarios del pedido, con el separador de siempre. */
export function sumarNota(comments, regalo) {
  if (!regalo) return comments;
  return [comments, notaRegalo(regalo)].filter(Boolean).join(' || ');
}
