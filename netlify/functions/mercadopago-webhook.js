/**
 * Netlify Function: POST /api/mercadopago-webhook
 * Recibe notificaciones IPN/Webhook de Mercado Pago y, cuando un pago se
 * aprueba, envía un mail a EPICALCOS con TODOS los datos del pedido y/o crea
 * una fila en el CRM (Notion).
 *
 * Para activar en MP:
 *   Panel Mercado Pago → Tu app → Webhooks → URL:
 *   https://epicalcos-ecommerce.netlify.app/api/mercadopago-webhook
 *   Eventos a escuchar: payment
 *
 * Variables de entorno (ver netlify/functions/lib/notify.js para el detalle):
 *   MERCADOPAGO_ACCESS_TOKEN   (obligatoria)
 *   RESEND_API_KEY + NOTIFY_EMAIL_TO          → mail
 *   NOTION_TOKEN + NOTION_DATABASE_ID         → CRM Notion
 */
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getOrder, markNotified } from './lib/orderStore.js';
import { buildOrderView, notifyOrder } from './lib/notify.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    /* tolerar body raro */
  }

  console.log('[mp-webhook]', JSON.stringify({ query: event.queryStringParameters, body: payload }));

  // type=payment, data.id = id del pago en MP
  const type = payload?.type || event.queryStringParameters?.type || event.queryStringParameters?.topic;
  const paymentId =
    payload?.data?.id ||
    event.queryStringParameters?.['data.id'] ||
    event.queryStringParameters?.id;

  // Solo nos interesan notificaciones de pago.
  if (type && type !== 'payment') {
    return { statusCode: 200, body: JSON.stringify({ received: true, ignored: type }) };
  }

  if (paymentId && process.env.MERCADOPAGO_ACCESS_TOKEN) {
    try {
      const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
      const paymentClient = new Payment(client);
      const payment = await paymentClient.get({ id: paymentId });

      console.log('[mp-webhook] payment detail:', {
        id: payment.id,
        status: payment.status,
        external_reference: payment.external_reference,
        amount: payment.transaction_amount
      });

      // Solo notificamos pagos aprobados (evita avisos por intentos rechazados).
      if (payment.status === 'approved') {
        const orderId = payment.external_reference;
        const stored = await getOrder(orderId);

        // Evitar mails duplicados: MP reintenta el webhook varias veces.
        if (stored?.notifiedAt) {
          console.log('[mp-webhook] pedido ya notificado, se omite:', orderId);
        } else {
          const view = buildOrderView(stored, payment);
          const result = await notifyOrder(view);
          console.log('[mp-webhook] notificaciones:', JSON.stringify(result));
          await markNotified(orderId, {
            id: payment.id,
            status: payment.status,
            amount: payment.transaction_amount
          });
        }
      }
    } catch (err) {
      console.error('[mp-webhook] error fetching/notifying payment:', err);
    }
  }

  // Mercado Pago espera 200 rápido; si demorás, reintenta.
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
