/**
 * Netlify Function: POST /api/capture-lead
 * Popup de bienvenida "10% OFF por tu mail": guarda el lead en el CRM de
 * Notion y en el CRM interno (app.epicalcos.com), avisa por mail (Resend)
 * y devuelve el código de cupón.
 */
import { crearLeadNewsletter } from './_notion.js';
import { notifyCrmLead } from './lib/crmWebhook.js';
import { sendLeadEmail, sendLeadCouponEmail } from './lib/notify.js';

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

  try {
    await Promise.all([
      crearLeadNewsletter(email),
      notifyCrmLead({ email, context: `Popup 10% OFF (cupón ${WELCOME_COUPON_CODE})` }),
      sendLeadEmail(email),
      sendLeadCouponEmail(email, WELCOME_COUPON_CODE)
    ]);
    return json(200, { ok: true, code: WELCOME_COUPON_CODE });
  } catch (err) {
    // No debería pasar (todas las funciones internas capturan sus propios
    // errores), pero si algo escapa igual devolvemos el código: la promo no
    // depende de que el mail/CRM hayan funcionado.
    console.error('[capture-lead] error inesperado:', err);
    return json(200, { ok: true, code: WELCOME_COUPON_CODE });
  }
};
