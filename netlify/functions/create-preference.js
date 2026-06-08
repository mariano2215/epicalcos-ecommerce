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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const json = (status, body) => ({
  statusCode: status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
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

  const { items, payer, shipping } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return json(400, { error: 'items_empty' });
  }
  if (!payer?.email || !payer?.name) {
    return json(400, { error: 'payer_invalid' });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: token });
    const preferenceClient = new Preference(client);

    const orderId = `EPI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const siteUrl = process.env.URL || 'https://epicalcos-ecommerce.netlify.app';

    const mpItems = items.map((item) => ({
      id: String(item.id),
      title: String(item.title),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      currency_id: 'ARS'
    }));

    const shippingCost = Number(shipping?.cost) || 0;
    if (shippingCost > 0) {
      mpItems.push({
        id: 'shipping',
        title: `Envío — ${shipping?.method || 'a coordinar'}`,
        quantity: 1,
        unit_price: shippingCost,
        currency_id: 'ARS'
      });
    }

    const preference = await preferenceClient.create({
      body: {
        items: mpItems,
        payer: { name: payer.name, email: payer.email },
        back_urls: {
          success: `${siteUrl}/pago-exitoso`,
          failure: `${siteUrl}/pago-error`,
          pending: `${siteUrl}/pago-pendiente`
        },
        auto_return: 'approved',
        external_reference: orderId,
        metadata: {
          buyer_name: payer.name,
          buyer_phone: payer.phone,
          buyer_dni: payer.dni,
          shipping_method: shipping?.method,
          shipping_cost: shippingCost,
          shipping_city: shipping?.city,
          shipping_province: shipping?.province,
          shipping_zip_code: shipping?.zipCode,
          shipping_address: payer?.address,
          comments: shipping?.comments
        },
        notification_url: `${siteUrl}/api/mercadopago-webhook`
      }
    });

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
