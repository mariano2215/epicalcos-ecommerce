/**
 * Netlify Function: POST /api/capture-lead
 * Popup de bienvenida: guarda el lead en el CRM de Notion y en el CRM interno
 * (app.epicalcos.com), avisa por mail (Resend) y devuelve lo que se ganó.
 *
 * Entrega DOS ofertas distintas según lo que pida el cliente (spec 025):
 *   `oferta: 'regalo'` → pack de stickers sorpresa gratis con la compra
 *   sin `oferta`       → el 10 % OFF de siempre (cupón EPICA10, spec 017)
 */
import { crearLeadNewsletter } from './_notion.js';
import { notifyCrmLead } from './lib/crmWebhook.js';
import { sendLeadEmail, sendLeadCouponEmail } from './lib/notify.js';
import { REGALO_BIENVENIDA } from './lib/pricing.js';

const WELCOME_COUPON_CODE = 'EPICA10';

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

const MAX_BODY_BYTES = 2_000;

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

  const email = String(body?.email ?? '').trim().slice(0, 254);
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return json(400, { error: 'email_invalid' });
  }

  // Qué se lleva este lead. El cliente PIDE la oferta y el servidor decide si
  // se la puede dar:
  //   · Un navegador con el bundle VIEJO (cargado antes del deploy) muestra
  //     "10 % OFF" y espera un código. No manda `oferta`, así que recibe
  //     EPICA10 — exactamente lo que su pantalla le prometió.
  //   · Con el regalo apagado acá, el que lo pide igual recibe el cupón: el
  //     popup elige la pantalla POR LA RESPUESTA, así nunca muestra un regalo
  //     que el servidor después no va a poner en la caja.
  const daRegalo = body?.oferta === 'regalo' && REGALO_BIENVENIDA.activa;
  const oferta = daRegalo ? 'regalo' : 'cupon';
  const respuesta = daRegalo
    ? { ok: true, oferta, regalo: REGALO_BIENVENIDA.id }
    : { ok: true, oferta, code: WELCOME_COUPON_CODE };

  try {
    await Promise.all([
      crearLeadNewsletter(email, { oferta }),
      notifyCrmLead({
        email,
        context: daRegalo
          ? 'Popup pack de stickers sorpresa (regalo con la compra)'
          : `Popup 10% OFF (cupón ${WELCOME_COUPON_CODE})`
      }),
      sendLeadEmail(email, { oferta }),
      // ⚠️ CON EL REGALO NO SE LE MANDA MAIL AL LEAD. El pack vive en el
      // navegador donde dejó el mail, y el link de un mail abre OTRO navegador
      // (el de Gmail) donde el regalo no existe: le prometería algo que esa
      // pantalla no puede mostrar. Con 10 minutos de ventana, además, casi
      // siempre se leería vencido (requirements §12, P-3).
      ...(daRegalo ? [] : [sendLeadCouponEmail(email, WELCOME_COUPON_CODE)])
    ]);
    return json(200, respuesta);
  } catch (err) {
    // No debería pasar (todas las funciones internas capturan sus propios
    // errores), pero si algo escapa igual respondemos lo que se ganó: la promo
    // no depende de que el mail/CRM hayan funcionado.
    console.error('[capture-lead] error inesperado:', err);
    return json(200, respuesta);
  }
};
