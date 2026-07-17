/**
 * Netlify Function: POST /api/mercadopago-webhook
 * Recibe notificaciones IPN/Webhook de Mercado Pago. En cada cambio de estado:
 *   - Actualiza el CRM de Notion: el lead "Checkout iniciado" pasa a
 *     Pagado / Pendiente / Rechazado (ver _notion.js).
 *   - Cuando el pago queda APROBADO, manda dos mails: el aviso interno a
 *     EPICALCOS con TODOS los datos y la confirmación con el resumen del pedido
 *     al cliente (recuperados de Netlify Blobs), con dedup para no repetir
 *     los avisos si Mercado Pago reintenta el webhook (ver lib/notify.js).
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
import { buildOrderView, sendOrderEmail, sendCustomerEmail } from './lib/notify.js';
import { actualizarEstadoPedido, mapEstado } from './_notion.js';
import { verifyMpSignature } from './lib/mpSignature.js';
import { notifyCrm, buildCrmOrder } from './lib/crmWebhook.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Verificar que la notificación venga firmada por Mercado Pago (HMAC con la
  // firma secreta del panel). Firma inválida → 401. Ver lib/mpSignature.js
  // para el comportamiento cuando falta la firma o el secret.
  const sig = verifyMpSignature(event);
  if (!sig.ok) {
    console.warn('[mp-webhook] firma rechazada:', sig.mode);
    return { statusCode: 401, body: JSON.stringify({ error: 'invalid_signature' }) };
  }
  if (sig.mode !== 'valid') {
    console.warn('[mp-webhook] firma no verificada (se procesa igual):', sig.mode);
  } else {
    console.log('[mp-webhook] firma ok');
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

      // 2) Mails: solo cuando el pago queda aprobado. Recupera el pedido completo
      //    de Blobs y evita duplicados (MP reintenta el webhook varias veces).
      //    Se manda el aviso interno a EPICALCOS y la confirmación al cliente.
      if (payment.status === 'approved') {
        const stored = await getOrder(orderId);

        // CRM interno (app.epicalcos.com): registra el pago aprobado.
        // No-op sin CRM_WEBHOOK_URL/SECRET; nunca lanza. Idempotente por
        // paymentId, así que los reintentos de MP no duplican pagos.
        const crmOrder = buildCrmOrder(stored ?? {
          orderId,
          itemsTotal: payment.transaction_amount,
          total: payment.transaction_amount,
          payer: { name: meta.buyer_name, email: payment.payer?.email, phone: meta.buyer_phone, address: meta.shipping_address },
          shipping: { method: meta.shipping_method, city: meta.shipping_city, province: meta.shipping_province, zipCode: meta.shipping_zip_code, cost: meta.shipping_cost || 0 },
          items: items.map((i) => ({ title: i.title, quantity: Number(i.quantity) || 1, unit_price: Number(i.unit_price) || 0 }))
        });
        if (crmOrder) {
          await notifyCrm('order.paid', {
            ...crmOrder,
            paymentStatus: 'paid',
            paymentId: String(payment.id),
            total: payment.transaction_amount
          });
        }

        if (stored?.notifiedAt) {
          console.log('[mp-webhook] pedido ya notificado, se omite:', orderId);
        } else {
          const view = buildOrderView(stored, payment);
          const [internal, customer] = await Promise.all([
            sendOrderEmail(view),
            sendCustomerEmail(view)
          ]);
          console.log('[mp-webhook] mail interno:', JSON.stringify(internal));
          console.log('[mp-webhook] mail cliente:', JSON.stringify(customer));
          // Solo marcamos como notificado si el aviso interno salió: si Resend
          // falló, dejamos que el reintento de MP vuelva a intentarlo en vez de
          // perder el pedido para siempre.
          if (internal.sent) {
            await markNotified(orderId, {
              id: payment.id,
              status: payment.status,
              amount: payment.transaction_amount
            });
          } else {
            console.error(
              '[mp-webhook] no se marca como notificado: falló el mail interno',
              internal.reason
            );
          }
        }
      }
    } catch (err) {
      console.error('[mp-webhook] error fetching/notifying payment:', err);
    }
  }

  // Mercado Pago espera 200 rápido; si demorás, reintenta.
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
