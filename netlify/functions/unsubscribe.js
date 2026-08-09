/**
 * Netlify Function: GET/POST /api/unsubscribe?e={email}&t={token}
 *
 * Baja de los recordatorios de carrito abandonado, en un click y sin login.
 *
 * El token es un HMAC del mail con `ABANDONED_CART_SECRET`: sin eso, cualquiera
 * podría dar de baja a otro poniendo su mail en la URL. La comparación es en
 * tiempo constante (ver lib/abandonedStore.js).
 *
 * Acepta POST además de GET por el `List-Unsubscribe-Post` (RFC 8058): Gmail y
 * Outlook pegan un POST directo cuando el usuario toca "Cancelar suscripción"
 * desde el cliente de mail, sin abrir el navegador.
 */
import { darDeBaja, tokenValido } from './lib/abandonedStore.js';

const pagina = (titulo, mensaje) => `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo} · EPICALCOS</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111;color:#fff;
       font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px}
  .c{max-width:420px;text-align:center}
  h1{font-size:22px;margin:0 0 10px}
  p{color:#bdbdbd;line-height:1.55;margin:0 0 22px}
  a{display:inline-block;background:linear-gradient(135deg,#FF1B8D,#FF5A1F);color:#fff;
    text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px}
</style></head>
<body><div class="c"><h1>${titulo}</h1><p>${mensaje}</p>
<a href="https://epicalcos.com">Volver a EPICALCOS</a></div></body></html>`;

export const handler = async (event) => {
  const html = (status, body) => ({
    statusCode: status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    body
  });

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const secret = process.env.ABANDONED_CART_SECRET;
  const email = event.queryStringParameters?.e || '';
  const token = event.queryStringParameters?.t || '';

  if (!secret || !email || !token || !tokenValido(email, token, secret)) {
    // Sin detalles del motivo: un mensaje distinto por caso le diría a quien
    // prueba tokens cuál está más cerca.
    return html(400, pagina('No pudimos procesar la baja', 'El link no es válido o ya venció. Escribinos y te sacamos de la lista a mano.'));
  }

  await darDeBaja(email);

  // POST desde el cliente de mail (RFC 8058): espera 200 sin cuerpo.
  if (event.httpMethod === 'POST') {
    return { statusCode: 200, headers: { 'Content-Type': 'text/plain' }, body: 'ok' };
  }

  return html(200, pagina('Listo', 'No vas a recibir más recordatorios de carrito. Tus pedidos y sus mails de confirmación siguen funcionando igual.'));
};
