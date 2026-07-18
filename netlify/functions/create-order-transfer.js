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

const MAX_BODY_BYTES = 50_000;
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
    comments: clip(rawShipping?.comments, 1000) || undefined
  };

  // Precios y envío: SIEMPRE recalculados en el servidor. paymentMethod
  // 'transferencia' es lo que habilita el 10% off por volumen (ver lib/pricing.js).
  const order = validateAndPriceOrder({ items, shipping, paymentMethod: 'transferencia', couponCode });
  if (!order.ok) {
    console.warn('[create-order-transfer] pedido rechazado:', order.error, order.detail || '');
    return json(400, { error: order.error, message: order.detail });
  }

  try {
    const orderId = `EPI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const shippingCost = order.shippingCost;
    shipping.method = order.shippingMethod;

    const notionPageId = await crearLeadEnCRM({
      payer,
      shipping,
      items: order.items,
      total: order.itemsTotal + shippingCost,
      orderId
    });

    const storedOrder = {
      orderId,
      createdAt: new Date().toISOString(),
      paymentMethod: 'transferencia',
      status: 'pendiente_transferencia',
      notionPageId: notionPageId || undefined,
      payer,
      shipping: { ...shipping, cost: shippingCost },
      items: order.items,
      itemsTotal: order.itemsTotal,
      total: order.itemsTotal + shippingCost
    };
    await saveOrder(orderId, storedOrder);

    await notifyCrm('order.created', buildCrmOrder(storedOrder, { paymentStatus: 'pending_transfer' }));

    // No hay webhook de pago: avisamos por mail ya mismo (pedido pendiente de comprobante).
    const view = buildOrderView(storedOrder, null);
    await notifyOrder(view);

    return json(200, { orderId, total: storedOrder.total });
  } catch (err) {
    console.error('[create-order-transfer] error:', err);
    return json(500, { error: 'order_create_failed', message: err.message });
  }
};
