/**
 * Meta Conversions API (server-side).
 *
 * Manda el evento Purchase desde el webhook de Mercado Pago cuando el pago
 * queda aprobado. Recupera las compras que el Píxel del navegador pierde
 * (bloqueadores de anuncios, iOS, usuario que cierra antes de /pago-exitoso).
 *
 * Deduplicación: el navegador dispara el mismo Purchase con
 * eventID `purchase-{orderId}` (ver frontend/src/lib/analytics.js) y acá se
 * manda el mismo event_id → Meta se queda con uno solo.
 *
 * Variables de entorno:
 *   META_CAPI_TOKEN       (obligatoria) token de la API de conversiones,
 *                         se genera en Administrador de eventos → Configuración
 *                         → API de conversiones → Generar token de acceso.
 *   META_PIXEL_ID         id del píxel; si falta usa VITE_META_PIXEL_ID
 *                         (ya cargada en Netlify para el frontend).
 *   META_CAPI_TEST_CODE   (opcional) test_event_code para la pestaña
 *                         "Probar eventos"; quitar en producción.
 *
 * Sin token o sin pixel id es un no-op. Nunca lanza.
 */
import { createHash } from 'node:crypto';

const GRAPH_URL = 'https://graph.facebook.com/v21.0';
const DEFAULT_COUNTRY = 'ar';
const DEFAULT_PHONE_PREFIX = '54';

const sha256 = (v) => createHash('sha256').update(v).digest('hex');

// ── Normalización espejo de frontend/src/lib/advancedMatching.js ─────────────
// Meta exige el mismo formato antes de hashear para que el matching coincida.

const clean = (v) => String(v || '').trim().toLowerCase();

const cleanName = (v) =>
  clean(v)
    .replace(/[^\p{L}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

const cleanToken = (v) => clean(v).replace(/[^\p{L}]/gu, '');

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith(DEFAULT_PHONE_PREFIX)) return digits;
  return DEFAULT_PHONE_PREFIX + digits.replace(/^0/, '');
}

function splitName(fullName) {
  const parts = cleanName(fullName).split(' ').filter(Boolean);
  if (parts.length === 0) return { fn: '', ln: '' };
  return { fn: parts[0], ln: parts.slice(1).join(' ') };
}

/**
 * user_data para CAPI: PII normalizada y hasheada (SHA-256) + señales de
 * navegador en claro (fbp/fbc/ip/user-agent), que es como las pide Meta.
 */
function buildUserData({ payer = {}, shipping = {}, tracking = {} }) {
  const { fn, ln } = splitName(payer.name);
  const hashed = {
    em: clean(payer.email),
    ph: normalizePhone(payer.phone),
    fn,
    ln,
    ct: cleanToken(shipping.city),
    st: cleanToken(shipping.province),
    zp: clean(shipping.zipCode).replace(/\s/g, ''),
    country: DEFAULT_COUNTRY
  };
  const userData = {};
  for (const [key, value] of Object.entries(hashed)) {
    if (value) userData[key] = [sha256(value)];
  }
  if (tracking.fbp) userData.fbp = tracking.fbp;
  if (tracking.fbc) userData.fbc = tracking.fbc;
  if (tracking.clientIp) userData.client_ip_address = tracking.clientIp;
  if (tracking.userAgent) userData.client_user_agent = tracking.userAgent;
  return userData;
}

/**
 * Manda el Purchase server-side. Nunca lanza; devuelve
 * { sent: boolean, reason?: string } para loguear en el webhook.
 *
 * @param {object} args
 * @param {string} args.orderId    external_reference (clave de dedup)
 * @param {object|null} args.order pedido completo de Netlify Blobs (puede faltar)
 * @param {object} args.payment    pago de Mercado Pago (fuente de verdad del monto)
 */
export async function sendPurchaseEvent({ orderId, order, payment }) {
  const token = process.env.META_CAPI_TOKEN;
  const pixelId = process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID;
  if (!token || !pixelId) return { sent: false, reason: 'not_configured' };
  if (!orderId) return { sent: false, reason: 'no_order_id' };

  try {
    const meta = payment?.metadata || {};
    // Con Blobs caído reconstruimos lo esencial desde la metadata del pago.
    const payer = order?.payer || {
      name: meta.buyer_name,
      email: meta.buyer_email || payment?.payer?.email,
      phone: meta.buyer_phone
    };
    const shipping = order?.shipping || {
      city: meta.shipping_city,
      province: meta.shipping_province,
      zipCode: meta.shipping_zip_code
    };

    const approvedAt = payment?.date_approved || payment?.date_created;
    const parsed = approvedAt ? Math.floor(new Date(approvedAt).getTime() / 1000) : NaN;
    const eventTime = Number.isFinite(parsed) ? parsed : Math.floor(Date.now() / 1000);

    const items = (order?.items || payment?.additional_info?.items || [])
      .filter((i) => i.id !== 'shipping');
    const contents = items.map((i) => ({
      id: String(i.id),
      quantity: Number(i.quantity) || 1,
      item_price: Number(i.unit_price) || 0
    }));

    const body = {
      data: [
        {
          event_name: 'Purchase',
          // Hora real del pago, no la del envío: en el flujo normal son la misma,
          // pero si el webhook se reintenta o se reprocesa un pago viejo, Meta
          // tiene que atribuirlo a cuándo ocurrió. (Rechaza eventos de más de 7 días.)
          event_time: eventTime,
          event_id: `purchase-${orderId}`,
          action_source: 'website',
          event_source_url: 'https://epicalcos.com/pago-exitoso',
          user_data: buildUserData({ payer, shipping, tracking: order?.tracking || {} }),
          custom_data: {
            currency: 'ARS',
            value: Number(payment?.transaction_amount) || Number(order?.total) || 0,
            content_type: 'product',
            order_id: orderId,
            ...(contents.length
              ? { contents, num_items: contents.reduce((a, c) => a + c.quantity, 0) }
              : {})
          }
        }
      ],
      ...(process.env.META_CAPI_TEST_CODE
        ? { test_event_code: process.env.META_CAPI_TEST_CODE }
        : {})
    };

    const res = await fetch(`${GRAPH_URL}/${pixelId}/events?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[metaCapi] rechazado:', res.status, JSON.stringify(json?.error || json));
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true, eventsReceived: json.events_received };
  } catch (err) {
    console.error('[metaCapi] error:', err?.message || err);
    return { sent: false, reason: 'exception' };
  }
}
