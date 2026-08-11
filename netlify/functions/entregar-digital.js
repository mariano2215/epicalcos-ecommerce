/**
 * Netlify Function: GET /api/entregar-digital?o={orderId}&t={token}
 *
 * Le manda al cliente el mail con la descarga de sus archivos imprimibles.
 *
 * POR QUÉ EXISTE: el camino de Mercado Pago se entrega solo (cuando el pago se
 * aprueba, el webhook manda el mail con el link). La TRANSFERENCIA no tiene
 * webhook —el cliente transfiere por su cuenta y manda el comprobante por
 * WhatsApp—, así que después de confirmarla no se ejecutaba NADA: el archivo
 * llegaba solo si el vendedor se acordaba de mandarlo a mano, y un digital
 * olvidado no deja rastro (no hay caja sin despachar que lo delate).
 *
 * El link firmado viaja en el AVISO INTERNO del pedido (ver lib/notify.js). No
 * hay usuarios ni sesiones en este proyecto, así que la autorización es el HMAC:
 * mismo patrón que el link de baja de los mails (unsubscribe.js).
 *
 * ⚠️ ENTREGA DIRECTA, sin pantalla de confirmación (decisión de Mariano,
 * 11/8/2026). Un pre-fetcher del cliente de mail podría dispararla sola; el peor
 * caso es que el cliente reciba su descarga antes de tiempo o dos veces, que es
 * molesto pero no peligroso —solo se le manda a quien ya hizo el pedido—.
 *
 * FALLA CERRADO: ante cualquier duda NO se manda el mail y NO se marca como
 * entregado. Un mail que dice "acá está tu archivo" sin link adentro es peor que
 * ninguno: le dice al cliente que ya está resuelto y deja de reclamarlo.
 *
 * Variables de entorno:
 *   DIGITAL_DELIVERY_SECRET   (obligatoria) firma el link — openssl rand -hex 32
 *   DIGITAL_LINK_{PACK_ID}    el link de descarga en sí (ver lib/digital.js)
 *   RESEND_API_KEY + NOTIFY_EMAIL_FROM   para poder mandar el mail
 */
import { getOrder, markDigitalDelivered } from './lib/orderStore.js';
import { buildOrderView, sendCustomerEmail } from './lib/notify.js';
import { tokenEntregaValido, tieneArchivosDigitales, needsManualDelivery, digitalDeliveries } from './lib/digital.js';

const pagina = (titulo, mensaje, color = '#16a34a') => `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo} · EPICALCOS</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111;color:#fff;
       font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px}
  .c{max-width:460px;text-align:center}
  h1{font-size:22px;margin:0 0 10px;color:${color}}
  p{color:#bdbdbd;line-height:1.55;margin:0 0 22px}
  code{background:#222;padding:2px 6px;border-radius:4px;font-size:13px;word-break:break-all}
  a{display:inline-block;background:linear-gradient(135deg,#FF1B8D,#FF5A1F);color:#fff;
    text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px}
</style></head>
<body><div class="c"><h1>${titulo}</h1><p>${mensaje}</p>
<a href="https://epicalcos.com">Volver a EPICALCOS</a></div></body></html>`;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

export const handler = async (event) => {
  const html = (status, body) => ({
    statusCode: status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    body
  });

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const secret = process.env.DIGITAL_DELIVERY_SECRET;
  const orderId = event.queryStringParameters?.o || '';
  const token = event.queryStringParameters?.t || '';

  // Firma inválida y pedido inexistente comparten mensaje: uno distinto por caso
  // le diría a quien prueba tokens cuál está más cerca (igual que unsubscribe.js).
  const rechazo = () =>
    html(
      400,
      pagina(
        'No pudimos procesar la entrega',
        'El link no es válido. Entrá al pedido y mandale los archivos a mano.',
        '#dc2626'
      )
    );

  if (!secret || !orderId || !token || !tokenEntregaValido(orderId, token, secret)) {
    console.warn('[entregar-digital] rechazado: firma inválida o faltante');
    return rechazo();
  }

  const order = await getOrder(orderId);
  if (!order) {
    console.warn('[entregar-digital] pedido no encontrado:', orderId);
    return rechazo();
  }

  if (!tieneArchivosDigitales(order)) {
    return html(
      400,
      pagina(
        'Este pedido no tiene archivos',
        'No hay archivos imprimibles para entregar en este pedido.',
        '#dc2626'
      )
    );
  }

  // RF-7: sin el link de descarga cargado, el mail saldría con un "acá están tus
  // archivos" y ningún link adentro. Se corta antes de mandarlo.
  if (needsManualDelivery(order)) {
    const faltantes = digitalDeliveries(order)
      .filter((d) => !d.url)
      .map((d) => `<code>${esc(d.envVar)}</code>`)
      .join(' y ');
    return html(
      409,
      pagina(
        'Falta configurar el link',
        `No se mandó ningún mail. Cargá ${faltantes} en Netlify (Site settings → ` +
          'Environment variables), redeployá y volvé a tocar el botón.',
        '#f59e0b'
      )
    );
  }

  // El pago YA está confirmado: por eso se tocó el botón. Sin esto,
  // `isPendingTransfer` haría que el mail dijera "te los mandamos cuando
  // confirmemos" en vez de traer la descarga (ver digitalDeliveryHtml).
  const view = buildOrderView(order, null);
  view.paymentStatus = 'approved';

  const res = await sendCustomerEmail(view);
  if (!res.sent) {
    console.error('[entregar-digital] no se pudo enviar:', res.reason, res.detail || '');
    // No se marca como entregado: que el reintento sea posible es preferible a
    // dar por entregado algo que nunca salió.
    return html(
      502,
      pagina(
        'No se pudo enviar el mail',
        `El pedido quedó sin entregar (${esc(res.reason || 'error')}). Probá de nuevo en un rato.`,
        '#dc2626'
      )
    );
  }

  await markDigitalDelivered(orderId, { email: view.email, via: 'link-mail-interno' });
  console.log('[entregar-digital] entregado:', orderId);

  return html(
    200,
    pagina(
      'Listo, archivos enviados',
      `Le mandamos la descarga a <strong>${esc(view.email)}</strong>. Podés volver a tocar el ` +
        'botón si necesita recibirlo de nuevo.'
    )
  );
};
