/**
 * Netlify Function: POST /api/contacto
 * Formulario de consultas de /contacto (spec 012): manda la consulta al mail
 * de EPICALCOS (Resend) y la registra como lead en el CRM interno.
 *
 * ⚠️ DIFERENCIA DELIBERADA CON capture-lead.js: aquel devuelve 200 aunque falle
 * todo, porque lo único que le importa al cliente es recibir el cupón, y el
 * cupón no depende del mail. Acá al revés: si el mail no salió, la consulta NO
 * EXISTE en ningún lado. Devolver un "listo" falso hace que el cliente se
 * quede esperando una respuesta que nunca va a llegar. Por eso esto falla
 * cerrado: 502, y el frontend le ofrece WhatsApp.
 *
 * El CRM sí es best-effort: si falla, el mail ya llegó y la consulta está viva.
 */
import { sendContactEmail } from './lib/notify.js';
import { notifyCrmLead } from './lib/crmWebhook.js';

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

/**
 * 8 KB: capture-lead usa 2 KB porque solo recibe un mail; acá hay un campo de
 * consulta de hasta 2.000 caracteres, que en UTF-8 puede ocupar bastante más
 * que 2.000 bytes.
 */
const MAX_BODY_BYTES = 8_000;

/** Espejo de frontend/src/lib/contacto.js → TOPES. Si cambia allá, cambia acá. */
const TOPES = {
  nombre: 120,
  email: 254,
  telefono: 40,
  ciudad: 80,
  provincia: 60,
  consulta: 2000
};
const CONSULTA_MIN = 10;
const TELEFONO_MIN_DIGITOS = 8;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * Revalida lo mismo que el navegador. La validación del cliente es para no
 * hacerle perder el viaje; ésta es la que cuenta: al endpoint le puede pegar
 * cualquiera con un curl.
 * @returns {string[]} nombres de los campos que fallaron
 */
function camposInvalidos(c) {
  const malos = [];
  if (!c.nombre || c.nombre.length > TOPES.nombre) malos.push('nombre');
  if (!c.email || !EMAIL_RE.test(c.email) || c.email.length > TOPES.email) malos.push('email');
  if (!c.telefono || c.telefono.replace(/\D/g, '').length < TELEFONO_MIN_DIGITOS || c.telefono.length > TOPES.telefono) {
    malos.push('telefono');
  }
  if (!c.ciudad || c.ciudad.length > TOPES.ciudad) malos.push('ciudad');
  if (!c.provincia || c.provincia.length > TOPES.provincia) malos.push('provincia');
  if (!c.consulta || c.consulta.length < CONSULTA_MIN || c.consulta.length > TOPES.consulta) malos.push('consulta');
  return malos;
}

const limpiar = (v, tope) => String(v ?? '').trim().slice(0, tope);

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

  // Honeypot: un campo que un humano nunca ve ni tabula. Si viene con algo, es
  // un bot que completó todo el formulario. Se responde 200 a propósito: un 400
  // le avisa que lo detectamos y le enseña a esquivarlo la próxima.
  if (String(body?.website ?? '').trim()) {
    console.log('[contacto] descartado por honeypot');
    return json(200, { ok: true });
  }

  const consulta = {
    nombre: limpiar(body?.nombre, TOPES.nombre),
    email: limpiar(body?.email, TOPES.email),
    telefono: limpiar(body?.telefono, TOPES.telefono),
    ciudad: limpiar(body?.ciudad, TOPES.ciudad),
    provincia: limpiar(body?.provincia, TOPES.provincia),
    consulta: limpiar(body?.consulta, TOPES.consulta)
  };

  const malos = camposInvalidos(consulta);
  if (malos.length) {
    // Los NOMBRES de los campos, nunca los valores: los logs de Netlify no son
    // lugar para el teléfono ni el mail de un cliente (regla 14).
    console.log('[contacto] rechazado, campos inválidos:', malos.join(', '));
    return json(400, { error: 'campos_invalidos', campos: malos });
  }

  const mail = await sendContactEmail(consulta);
  if (!mail.sent) {
    // El motivo (no el contenido) para poder diagnosticarlo desde los logs.
    console.error('[contacto] no se pudo enviar la consulta:', mail.reason);
    return json(502, { error: 'no_se_pudo_enviar' });
  }

  // El CRM va DESPUÉS y no condiciona la respuesta: la consulta ya está a salvo
  // en la casilla. notifyCrmLead ya es no-op si el CRM no está configurado y
  // nunca lanza, pero el catch queda igual — es lo último entre el cliente y un
  // 502 que no correspondería.
  try {
    await notifyCrmLead({
      email: consulta.email,
      name: consulta.nombre,
      context: 'Formulario de contacto'
    });
  } catch (err) {
    console.error('[contacto] el CRM falló (la consulta igual llegó por mail):', err?.message || err);
  }

  return json(200, { ok: true });
};
