/**
 * Adaptador de integración con el CRM (app.epicalcos.com).
 *
 * DESACTIVADO POR DEFECTO: si CRM_WEBHOOK_URL o CRM_WEBHOOK_SECRET no están
 * seteadas, notifyCrm() es un no-op. Nunca lanza y nunca bloquea el checkout
 * (timeout corto). Rollback: borrar las dos env vars.
 *
 * Variables de entorno:
 *   CRM_WEBHOOK_URL     ej: https://app.epicalcos.com/api/webhooks/website-order
 *   CRM_WEBHOOK_SECRET  el MISMO valor que EPICALCOS_WEBHOOK_SECRET en el site del CRM
 *
 * Protocolo (ver docs/website-integration.md en el repo del CRM):
 *   firma HMAC-SHA256 hex de `${timestamp}.${body}` + idempotency key.
 */
import { createHmac, randomUUID } from 'node:crypto';

const TIMEOUT_MS = 3000;

/**
 * Envía un evento al CRM. `event` es 'order.created' u 'order.paid'.
 * `order` sigue el payload de referencia del CRM (importes en PESOS).
 * Nunca lanza: devuelve { sent: boolean, status?, error? } solo para logging.
 */
export async function notifyCrm(event, order) {
  const url = process.env.CRM_WEBHOOK_URL;
  const secret = process.env.CRM_WEBHOOK_SECRET;
  if (!url || !secret) return { sent: false, error: 'not_configured' };

  try {
    const body = JSON.stringify({
      event,
      occurredAt: new Date().toISOString(),
      order,
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EPICALCOS-Signature': signature,
        'X-EPICALCOS-Timestamp': timestamp,
        'X-EPICALCOS-Event': event,
        // El reintento del mismo evento sobre el mismo pedido no duplica nada.
        'X-EPICALCOS-Idempotency-Key': `${event}:${order.externalId}:${order.paymentId || randomUUID()}`,
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn('[crm-webhook] respuesta no OK:', res.status);
      return { sent: false, status: res.status };
    }
    return { sent: true, status: res.status };
  } catch (err) {
    console.warn('[crm-webhook] no se pudo notificar al CRM (se continúa):', err.message);
    return { sent: false, error: err.message };
  }
}

/** Arma el payload de pedido del CRM desde el pedido guardado en Blobs. */
export function buildCrmOrder(stored, extra = {}) {
  if (!stored) return null;
  const items = (stored.items || []).filter((i) => i.id !== 'shipping');
  return {
    externalId: stored.orderId,
    source: 'website',
    currency: 'ARS',
    subtotal: stored.itemsTotal ?? 0,
    discount: 0,
    shipping: stored.shipping?.cost ?? 0,
    total: stored.total ?? 0,
    paymentStatus: 'pending',
    deliveryMethod: stored.shipping?.methodValue || stored.shipping?.method || null,
    customer: {
      name: stored.payer?.name || 'Cliente web',
      email: stored.payer?.email || null,
      phone: stored.payer?.phone || null,
      address: stored.payer?.address || null,
      city: stored.shipping?.city || null,
      province: stored.shipping?.province || null,
      zipCode: stored.shipping?.zipCode || null,
    },
    items: items.map((i) => ({
      name: i.title || 'Producto',
      quantity: i.quantity || 1,
      unitPrice: i.unit_price || 0,
    })),
    notes: stored.shipping?.comments || null,
    metadata: { preferenceId: stored.preferenceId || null },
    ...extra,
  };
}
