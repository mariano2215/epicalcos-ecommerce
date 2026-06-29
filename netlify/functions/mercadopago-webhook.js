/**
 * Netlify Function: POST /api/mercadopago-webhook
 * Recibe notificaciones IPN/Webhook de Mercado Pago. En cada cambio de estado:
 *   - Actualiza el CRM de Notion: el lead "Checkout iniciado" pasa a
 *     Pagado / Pendiente / Rechazado (ver _notion.js).
 *   - Cuando el pago queda APROBADO, manda el mail del pedido a EPICALCOS con
 *     TODOS los datos (recuperados de Netlify Blobs) y con dedup para no repetir
 *     el aviso si Mercado Pago reintenta el webhook (ver lib/notify.js).
 *
 * Para activar en MP:
 *   Panel Mercado Pago → Tu app → Webhooks → URL:
 *   https://epicalcos-ecommerce.netlify.app/api/mercadopago-webhook
 *   Eventos a escuchar: payment
 *
 * Variables de entorno:
 *   MERCADOPAGO_ACCESS_TOKEN                  (obligatoria)
 *   RESEND_API_KEY + NOTIFY_EMAIL_TO/FROM     → mail (ver lib/notify.js)
 *   NOTION_TOKEN + NOTION_CRM_DATABASE_ID     → CRM Notion (ver _notion.js)
 */
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getOrder, markNotified } from './lib/orderStore.js';
import { buildOrderView, sendOrderEmail } from './lib/notify.js';
import { actualizarEstadoPedido, mapEstado } from './_notion.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch { /* tolerar body raro */ }

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

      const orderId = payment.external_reference;
      const meta = payment.metadata || {};
      const items = payment.additional_info?.items || [];

      // 1) CRM Notion: reflejar el estado en cualquier cambio de pago.
      //    Si tenemos el pageId (guardado en el metadata al iniciar el checkout)
      //    actualizamos esa fila; si no, la creamos desde los datos del pago.
      //    actualizarEstadoPedido nunca lanza, pero lo envolvemos por las dudas.
      try {
        const notionPageId = meta.notion_page_id;
        await actualizarEstadoPedido({
          pageId: notionPageId,
          estado: mapEstado(payment.status),
          total: payment.transaction_amount,
          fallback: notionPageId
            ? null
            : {
                orderId,
                total: payment.transaction_amount,
                items,
                payer: {
                  name: meta.buyer_name || payment.payer?.first_name,
                  email: payment.payer?.email,
                  phone: meta.buyer_phone,
                  address: meta.shipping_address
                },
                shipping: {
                  method: meta.shipping_method,
                  city: meta.shipping_city,
                  province: meta.shipping_province,
                  zipCode: meta.shipping_zip_code,
                  comments: meta.comments
                }
              }
        });
      } catch (notionErr) {
        console.error('[mp-webhook] notion sync error:', notionErr);
      }

      // 2) Mail: solo cuando el pago queda aprobado. Recupera el pedido completo
      //    de Blobs y evita duplicados (MP reintenta el webhook varias veces).
      if (payment.status === 'approved') {
        const stored = await getOrder(orderId);
        if (stored?.notifiedAt) {
          console.log('[mp-webhook] pedido ya notificado, se omite:', orderId);
        } else {
          const view = buildOrderView(stored, payment);
          const result = await sendOrderEmail(view);
          console.log('[mp-webhook] mail:', JSON.stringify(result));
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
