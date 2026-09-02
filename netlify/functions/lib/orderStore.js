/**
 * Persistencia de pedidos con Netlify Blobs.
 *
 * Netlify Blobs viene incluido en Netlify Functions sin configuración extra:
 * cuando la función corre en Netlify, las credenciales se inyectan solas.
 *
 * Guardamos el pedido completo al crear la preferencia (create-preference) y
 * lo recuperamos en el webhook cuando Mercado Pago confirma el pago. Así el
 * mail / CRM recibe TODOS los datos del formulario, no solo lo que viaja en
 * la notificación de pago.
 */
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'orders';

/**
 * Abre el store de pedidos.
 *
 * Normalmente Netlify inyecta solas las credenciales y alcanza con el nombre.
 * Cuando NO las inyecta —que es lo que viene pasando en runtime desde julio de
 * 2026— `getStore()` tira `MissingBlobsEnvironmentError`, los catch de abajo lo
 * tapan y desde afuera parece que todo anda: `getOrder` devuelve null y ya.
 * Con NETLIFY_BLOBS_SITE_ID + NETLIFY_BLOBS_TOKEN (un PAT con acceso al sitio)
 * se configura a mano.
 *
 * Espejo exacto del helper de `abandonedStore.js`: los dos stores tienen que
 * caer en el mismo fallback o se arregla la mitad del problema. Estaba solo en
 * abandonedStore y por eso los pedidos seguían sin persistir.
 */
function store() {
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;
  return siteID && token ? getStore({ name: STORE_NAME, siteID, token }) : getStore(STORE_NAME);
}

/**
 * Guarda un pedido. Nunca lanza: si Blobs no está disponible, loguea y sigue
 * (el webhook tiene un fallback con la metadata del pago).
 * @param {string} orderId external_reference
 * @param {object} order
 */
export async function saveOrder(orderId, order) {
  try {
    await store().setJSON(orderId, order);
    return true;
  } catch (err) {
    console.error('[orderStore] no se pudo guardar el pedido:', err?.message || err);
    return false;
  }
}

/**
 * Recupera un pedido por external_reference. Devuelve null si no existe o falla.
 * @param {string} orderId
 * @returns {Promise<object|null>}
 */
export async function getOrder(orderId) {
  if (!orderId) return null;
  try {
    return await store().get(orderId, { type: 'json' });
  } catch (err) {
    console.error('[orderStore] no se pudo leer el pedido:', err?.message || err);
    return null;
  }
}

/**
 * Marca un pedido como ya notificado para evitar mails duplicados
 * (Mercado Pago reintenta el webhook varias veces).
 * @param {string} orderId
 * @param {object} paymentInfo
 */
export async function markNotified(orderId, paymentInfo = {}) {
  try {
    const existing = (await getOrder(orderId)) || {};
    await store().setJSON(orderId, {
      ...existing,
      notifiedAt: new Date().toISOString(),
      payment: paymentInfo
    });
  } catch (err) {
    console.error('[orderStore] no se pudo marcar como notificado:', err?.message || err);
  }
}

/**
 * Marca que ya se le entregaron los archivos imprimibles al cliente.
 *
 * Sirve para saber qué pedidos digitales quedaron sin entregar: sin esta marca,
 * un archivo olvidado no deja ningún rastro (no hay caja sin despachar que lo
 * delate). Los pedidos viejos no tienen el campo: ausente = no entregado.
 *
 * Se llama SOLO si el mail salió (ver entregar-digital.js), con el mismo
 * criterio que `markNotified`: marcar algo que no ocurrió es peor que no marcar.
 * Nunca lanza.
 */
export async function markDigitalDelivered(orderId, info = {}) {
  try {
    const existing = (await getOrder(orderId)) || {};
    await store().setJSON(orderId, {
      ...existing,
      digitalDeliveredAt: new Date().toISOString(),
      digitalDelivery: info
    });
    return true;
  } catch (err) {
    console.error('[orderStore] no se pudo marcar la entrega digital:', err?.message || err);
    return false;
  }
}
