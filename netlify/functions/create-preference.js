/**
 * Netlify Function: POST /api/create-preference
 * Crea una preferencia de pago en Mercado Pago Checkout Pro y devuelve init_point.
 *
 * Variables de entorno requeridas (configurar en Netlify dashboard → Environment variables):
 *   MERCADOPAGO_ACCESS_TOKEN  → token de Mercado Pago (TEST o producción)
 *   URL                        → seteada por Netlify auto, ej https://epicalcos-ecommerce.netlify.app
 *
 * Mientras MERCADOPAGO_ACCESS_TOKEN no esté seteado, devuelve 503 con mensaje claro.
 */
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { saveOrder } from './lib/orderStore.js';
import { crearLeadEnCRM } from './_notion.js';
import { validateAndPriceOrder } from './lib/pricing.js';
import { notifyCrm, buildCrmOrder } from './lib/crmWebhook.js';

// CORS restringido a los orígenes propios (antes era "*"). Los requests sin
// header Origin (curl, server-to-server) no usan CORS, así que no se ven afectados.
const ALLOWED_ORIGINS = [
  process.env.URL,
  'https://epicalcos.com',
  'https://www.epicalcos.com',
  'https://epicalcos-ecommerce.netlify.app',
  'http://localhost:8888' // netlify dev
].filter(Boolean);

const corsHeadersFor = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin'
});

// Límites anti-abuso: payload acotado y campos de texto con tope de longitud.
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

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token || token === 'TU_ACCESS_TOKEN') {
    return json(503, {
      error: 'mercadopago_not_configured',
      message:
        'MERCADOPAGO_ACCESS_TOKEN no configurado. Cargá la variable de entorno en Netlify y redeployá.'
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const { items, payer: rawPayer, shipping: rawShipping } = body;

  // Datos del comprador: requeridos, con formato de email y longitudes acotadas.
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

  // Precios y envío: SIEMPRE recalculados en el servidor a partir del id de
  // cada item (lib/pricing.js). Si el precio recibido no coincide con las
  // reglas vigentes, se rechaza el pedido (precio adulterado o frontend viejo).
  const order = validateAndPriceOrder({ items, shipping });
  if (!order.ok) {
    console.warn('[create-preference] pedido rechazado:', order.error, order.detail || '');
    return json(400, { error: order.error, message: order.detail });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: token });
    const preferenceClient = new Preference(client);

    const orderId = `EPI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const siteUrl = process.env.URL || 'https://epicalcos-ecommerce.netlify.app';

    const mpItems = [...order.items];
    const shippingCost = order.shippingCost;
    shipping.method = order.shippingMethod; // etiqueta recalculada en el servidor
    if (shippingCost > 0) {
      mpItems.push({
        id: 'shipping',
        title: `Envío — ${order.shippingMethod}`,
        quantity: 1,
        unit_price: shippingCost,
        currency_id: 'ARS'
      });
    }

    // Registrar el lead en el CRM de Notion ("Checkout iniciado") y guardar el
    // pageId para que el webhook actualice esa misma fila al confirmarse el pago.
    // crearLeadEnCRM nunca lanza: si Notion falla, el checkout sigue igual.
    const total = order.itemsTotal + shippingCost;
    const notionPageId = await crearLeadEnCRM({ payer, shipping, items: order.items, total, orderId });

    const preference = await preferenceClient.create({
      body: {
        items: mpItems,
        payer: { name: payer.name, email: payer.email },
        back_urls: {
          success: `${siteUrl}/pago-exitoso`,
          failure: `${siteUrl}/pago-error`,
          pending: `${siteUrl}/pago-pendiente`
        },
        ...(siteUrl.startsWith('https://') ? { auto_return: 'approved' } : {}),
        external_reference: orderId,
        metadata: {
          buyer_name: payer.name,
          buyer_email: payer.email,
          buyer_phone: payer.phone,
          shipping_method: shipping?.method,
          shipping_cost: shippingCost,
          shipping_city: shipping?.city,
          shipping_province: shipping?.province,
          shipping_zip_code: shipping?.zipCode,
          shipping_address: payer?.address,
          comments: shipping?.comments,
          notion_page_id: notionPageId || undefined
        },
        notification_url: `${siteUrl}/api/mercadopago-webhook`
      }
    });

    // Persistimos el pedido completo (datos del formulario) keyed por orderId.
    // El webhook lo recupera cuando MP confirma el pago, así el mail/CRM recibe
    // TODO lo que cargó el cliente y no solo lo que viaja en la notificación.
    const itemsTotal = mpItems
      .filter((i) => i.id !== 'shipping')
      .reduce((acc, i) => acc + i.unit_price * i.quantity, 0);

    const storedOrder = {
      orderId,
      createdAt: new Date().toISOString(),
      preferenceId: preference.id,
      payer: {
        name: payer.name,
        email: payer.email,
        phone: payer.phone,
        address: payer.address
      },
      shipping: {
        method: shipping?.method,
        methodValue: shipping?.methodValue,
        city: shipping?.city,
        province: shipping?.province,
        zipCode: shipping?.zipCode,
        comments: shipping?.comments,
        cost: shippingCost
      },
      items: mpItems,
      itemsTotal,
      total: itemsTotal + shippingCost
    };
    await saveOrder(orderId, storedOrder);

    // CRM interno (app.epicalcos.com): no-op sin CRM_WEBHOOK_URL/SECRET,
    // nunca lanza y no bloquea el checkout si el CRM no responde.
    await notifyCrm('order.created', buildCrmOrder(storedOrder));

    return json(200, {
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      external_reference: orderId
    });
  } catch (err) {
    console.error('[create-preference] error:', err);
    return json(500, { error: 'preference_create_failed', message: err.message });
  }
};
