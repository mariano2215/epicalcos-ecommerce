/**
 * Carritos abandonados — persistencia con Netlify Blobs.
 *
 * Un "carrito abandonado" es alguien que llegó al checkout, escribió un mail
 * válido y NO terminó de comprar. Se guarda cuando escribe el mail y se BORRA
 * en cuanto crea un pedido (Mercado Pago o transferencia).
 *
 * ⚠️ El borrado al comprar es la parte más importante de todo esto: mailear a
 * alguien que ya compró es el error más caro de este flujo. Por eso el borrado
 * vive en los DOS caminos de creación de pedido (create-preference y
 * create-order-transfer) y no en un solo lugar.
 *
 * La clave es el mail normalizado (minúsculas, sin espacios): una persona = un
 * carrito. Si vuelve y cambia el pedido, se pisa el anterior en vez de acumular
 * dos y mandarle dos mails.
 */
import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual } from 'node:crypto';

const STORE_CARTS = 'abandoned-carts';
const STORE_OPTOUT = 'abandoned-optout';

/** Normalización única del mail: es la clave del registro y del opt-out. */
export const normalizarEmail = (email) => String(email || '').trim().toLowerCase();

const carts = () => getStore(STORE_CARTS);
const optout = () => getStore(STORE_OPTOUT);

/**
 * Guarda (o pisa) el carrito de ese mail. Nunca lanza: si Blobs falla, el
 * checkout tiene que seguir funcionando igual.
 */
export async function guardarCarrito(email, datos) {
  const key = normalizarEmail(email);
  if (!key) return false;
  try {
    // `notifiedAt` NO se arrastra a propósito: si la persona volvió y armó un
    // carrito nuevo, es un abandono nuevo y puede recibir su recordatorio.
    await carts().setJSON(key, { ...datos, email: key, updatedAt: new Date().toISOString() });
    return true;
  } catch (err) {
    console.error('[abandoned] no se pudo guardar:', err?.message || err);
    return false;
  }
}

/** Borra el carrito de ese mail. Se llama al CREAR un pedido. */
export async function borrarCarrito(email) {
  const key = normalizarEmail(email);
  if (!key) return;
  try {
    await carts().delete(key);
  } catch (err) {
    console.error('[abandoned] no se pudo borrar:', err?.message || err);
  }
}

/** Todos los carritos guardados, con su contenido. */
export async function listarCarritos() {
  try {
    const { blobs } = await carts().list();
    const out = [];
    for (const b of blobs) {
      const data = await carts().get(b.key, { type: 'json' }).catch(() => null);
      if (data) out.push({ key: b.key, ...data });
    }
    return out;
  } catch (err) {
    console.error('[abandoned] no se pudo listar:', err?.message || err);
    return [];
  }
}

/** Marca que ya se le mandó el recordatorio (tope: uno por carrito). */
export async function marcarNotificado(email) {
  const key = normalizarEmail(email);
  try {
    const actual = (await carts().get(key, { type: 'json' })) || {};
    await carts().setJSON(key, { ...actual, notifiedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[abandoned] no se pudo marcar como notificado:', err?.message || err);
  }
}

// ─── Opt-out ──────────────────────────────────────────────────────────────────

/**
 * Token de baja: HMAC del mail con un secreto del servidor.
 *
 * Va firmado y no como id opaco para que el link funcione sin buscar en ningún
 * lado y, sobre todo, para que nadie pueda dar de baja a otro escribiendo su
 * mail en la URL.
 */
export function tokenBaja(email, secret) {
  return createHmac('sha256', secret).update(normalizarEmail(email)).digest('hex').slice(0, 32);
}

/** Comparación en tiempo constante (evita filtrar el token por timing). */
export function tokenValido(email, token, secret) {
  const esperado = tokenBaja(email, secret);
  const a = Buffer.from(esperado);
  const b = Buffer.from(String(token || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Da de baja ese mail: no vuelve a recibir recordatorios nunca. */
export async function darDeBaja(email) {
  const key = normalizarEmail(email);
  if (!key) return;
  try {
    await optout().setJSON(key, { at: new Date().toISOString() });
    await carts().delete(key); // además, que no quede pendiente de envío
  } catch (err) {
    console.error('[abandoned] no se pudo dar de baja:', err?.message || err);
  }
}

/** ¿Este mail pidió no recibir más? */
export async function estaDadoDeBaja(email) {
  try {
    return Boolean(await optout().get(normalizarEmail(email), { type: 'json' }));
  } catch {
    // Ante la duda, NO mandar: es preferible perder un recordatorio a escribirle
    // a alguien que pidió que no lo hagan.
    return true;
  }
}

/** Borra un carrito viejo que ya no tiene sentido conservar. */
export async function purgar(email) {
  try {
    await carts().delete(normalizarEmail(email));
  } catch {
    /* ignore */
  }
}
