/**
 * Netlify Function: POST /api/create-order-transfer
 * Registra un pedido a pagar por TRANSFERENCIA BANCARIA (no pasa por Mercado Pago).
 *
 * A diferencia de create-preference.js, acá no hay webhook de confirmación de
 * pago: el cliente transfiere por su cuenta y manda el comprobante por
 * WhatsApp. Por eso el mail interno y el mail al cliente se disparan de
 * inmediato, con el pedido marcado como "pendiente de comprobante".
 */
import { saveOrder } from './lib/orderStore.js';
import { borrarCarrito } from './lib/abandonedStore.js';
import { crearLeadEnCRM } from './_notion.js';
import { validateAndPriceOrder } from './lib/pricing.js';
import { notifyCrm, buildCrmOrder } from './lib/crmWebhook.js';
import { buildOrderView, notifyOrder } from './lib/notify.js';

const ALLOWED_ORIGINS = [
  process.env.URL,
  'https://epicalcos.com',
  'https://www.epicalcos.com',
  'https://epicalcos-ecommerce.netlify.app',
  'http://localhost:8888'
].filter(Boolean);

const corsHeadersFor = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin'
});

// Mismos topes que create-preference.js: en `shipping.comments` viajan los links
// de Cloudinary de los archivos subidos (un pedido de 100 fotos son ~11 KB).
const MAX_BODY_BYTES = 200_000;
const MAX_COMMENTS = 20_000;
const clip = (v, max) => String(v ?? '').slice(0, max).trim();

export const handler = async (event) => {
  const corsHeaders = corsHeadersFor(event.headers?.origin || event.headers?.Origin || '');
  const json = (status, body) => ({
    statusCode: status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }
  if ((event.body?.length || 0) > MAX_BODY_BYTES) {
    return json(413, { error: 'payload_too_large' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const { items, payer: rawPayer, shipping: rawShipping, couponCode: rawCoupon } = body;
  const couponCode = clip(rawCoupon, 30) || undefined;

  const payer = {
    name: clip(rawPayer?.name, 120),
    email: clip(rawPayer?.email, 254),
    phone: clip(rawPayer?.phone, 40),
    address: clip(rawPayer?.address, 240)
  };
  if (!payer.email || !payer.name || !/^\S+@\S+\.\S+$/.test(payer.email)) {
    return json(400, { error: 'payer_invalid' });
  }

  const shipping = {
    methodValue: clip(rawShipping?.methodValue, 20),
    method: clip(rawShipping?.method, 80),
    city: clip(rawShipping?.city, 80),
    province: clip(rawShipping?.province, 80),
    zipCode: clip(rawShipping?.zipCode, 20),
    comments: clip(rawShipping?.comments, MAX_COMMENTS) || undefined
  };

  // Precios y envío: SIEMPRE recalculados en el servidor. paymentMethod
  // 'transferencia' es lo que habilita el 10% off por volumen (ver lib/pricing.js).
  const order = validateAndPriceOrder({ items, shipping, paymentMethod: 'transferencia', couponCode });
  if (!order.ok) {
    console.warn('[create-order-transfer] pedido rechazado:', order.error, order.detail || '');
    return json(400, { error: order.error, message: order.detail });
  }

  // Presupuesto de tiempo. Netlify corta la función a los 10 s y acá hay cuatro
  // llamadas de red: si se van de tiempo, el proceso muere ANTES de responder y
  // el cliente ve un error de un pedido que quizá entró. Los mails se llevan la
  // primera mitad; el resto es best-effort y se saltea si no queda margen.
  const iniciado = Date.now();
  const restante = () => 9000 - (Date.now() - iniciado);

  const orderId = `EPI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const shippingCost = order.shippingCost;
  shipping.method = order.shippingMethod;

  const storedOrder = {
    orderId,
    createdAt: new Date().toISOString(),
    paymentMethod: 'transferencia',
    status: 'pendiente_transferencia',
    payer,
    shipping: { ...shipping, cost: shippingCost },
    items: order.items,
    itemsTotal: order.itemsTotal,
    total: order.itemsTotal + shippingCost
  };

  // ── 1) EL MAIL PRIMERO ──────────────────────────────────────────────────────
  // Esto estaba último, detrás de Notion + Blobs + el webhook del CRM. Con Blobs
  // caído y el CRM tardando ~2 s, el aviso salía con los restos del tiempo; y si
  // cualquiera de esas tres lanzaba, el catch devolvía 500 y el mail NO SE
  // MANDABA NUNCA. La transferencia no tiene webhook que reintente: este mail es
  // la única constancia del pedido, así que va antes que todo lo demás.
  let notify = { email: { sent: false, reason: 'no_ejecutado' }, customerEmail: { sent: false } };
  try {
    notify = await notifyOrder(buildOrderView(storedOrder, null), {
      deadline: iniciado + 6000
    });
  } catch (err) {
    // notifyOrder no lanza, pero si algún día lo hace no puede llevarse el pedido.
    console.error('[create-order-transfer] notifyOrder lanzó:', err);
  }

  // ── 2) El resto es best-effort: nada de esto puede voltear el pedido ─────────
  const paso = async (nombre, fn) => {
    if (restante() < 1500) {
      console.warn(`[create-order-transfer] sin tiempo para ${nombre}, se saltea`);
      return null;
    }
    try {
      return await fn();
    } catch (err) {
      console.error(`[create-order-transfer] ${nombre} falló (se continúa):`, err?.message || err);
      return null;
    }
  };

  storedOrder.notionPageId =
    (await paso('notion', () =>
      crearLeadEnCRM({ payer, shipping, items: order.items, total: storedOrder.total, orderId })
    )) || undefined;

  await paso('saveOrder', () => saveOrder(orderId, storedOrder));

  // Ya no es un carrito abandonado: llegó a crear el pedido. Espejo del
  // borrado de create-preference.js — tiene que estar en los dos caminos.
  await paso('borrarCarrito', () => borrarCarrito(payer.email));

  // 'pending_transfer' le indica al CRM que el pago viene por transferencia
  // bancaria (lo trata como pendiente; el comprobante se registra a mano).
  const crm = await paso('crm', () =>
    notifyCrm(
      'order.created',
      buildCrmOrder(storedOrder, {
        paymentStatus: 'pending_transfer',
        metadata: { paymentMethod: 'transferencia' }
      })
    )
  );

  // ── 3) Contestar la verdad ──────────────────────────────────────────────────
  // Si no salió el aviso interno NI entró al CRM, nadie en EPICALCOS se enteró
  // del pedido: Blobs no persiste y la transferencia no tiene webhook. Decirle
  // "listo" al cliente ahí es perder la venta en silencio, que es justo lo que
  // venía pasando. Preferimos que vea el error y escriba por WhatsApp.
  if (!notify.email.sent && !crm?.sent) {
    console.error('[create-order-transfer] PEDIDO SIN NOTIFICAR:', orderId, JSON.stringify(notify.email));
    return json(502, {
      error: 'notify_failed',
      message: 'No pudimos registrar tu pedido. Escribinos por WhatsApp así lo tomamos a mano.'
    });
  }

  return json(200, {
    orderId,
    total: storedOrder.total,
    // Visible en la respuesta a propósito: si un pedido entra sin confirmación
    // al cliente, queda registrado en el log del navegador y en el de Netlify.
    notified: { interno: notify.email.sent, cliente: notify.customerEmail.sent }
  });
};
