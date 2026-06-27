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

function store() {
  return getStore(STORE_NAME);
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
