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
import { sendPurchaseEvent } from './lib/metaCapi.js';

/**
 * Corre una promesa con techo de tiempo. Netlify mata la función a los 10 s y
 * varias de estas integraciones (Blobs, Meta CAPI) no tienen timeout propio:
 * una sola colgada se lleva puesto el mail del pedido, que es lo único que no
 * se puede perder. Nunca lanza: devuelve `porDefecto` si se pasa del tiempo.
 */
const conLimite = (promesa, ms, etiqueta, porDefecto = null) =>
  Promise.race([
    Promise.resolve(promesa).catch((err) => {
      console.error(`[mp-webhook] ${etiqueta} falló:`, err?.message || err);
      return porDefecto;
    }),
    new Promise((resolve) =>
      setTimeout(() => {
        console.error(`[mp-webhook] ${etiqueta} superó ${ms} ms — se continúa sin eso`);
        resolve(porDefecto);
      }, ms)
    )
  ]);

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

      // El pedido guardado (si Blobs responde) enriquece tanto el mail como el
      // CRM. Con techo de tiempo: Blobs está caído en runtime y `getOrder` no
      // tiene timeout propio, así que una lectura colgada bloqueaba el mail.
      const isRejected = ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(payment.status);
      const stored =
        payment.status === 'approved' || isRejected
          ? await conLimite(getOrder(orderId), 2000, 'getOrder (Blobs)')
          : null;

      // 2) MAILS: lo primero después de tener el pago. Iban al final, detrás del
      //    webhook del CRM y de Meta CAPI — y Meta CAPI no tiene timeout: una
      //    llamada colgada a Graph se comía los 10 s de la función y Netlify la
      //    mataba ANTES de mandar el mail. MP reintentaba y chocaba con lo mismo.
      //    El aviso del pedido no depende más de que anden las integraciones.
      if (payment.status === 'approved') {
        if (stored?.notifiedAt) {
          console.log('[mp-webhook] pedido ya notificado, se omite:', orderId);
        } else {
          // buildOrderView es puro pero toca datos que vienen de afuera: si
          // llegara a romper, no puede llevarse el mail puesto.
          let view;
          try {
            view = buildOrderView(stored, payment);
          } catch (err) {
            console.error('[mp-webhook] buildOrderView falló, se arma lo mínimo:', err?.message || err);
            view = {
              orderId: orderId || 'sin-referencia',
              name: meta.buyer_name || '—',
              email: meta.buyer_email || payment.payer?.email || '—',
              items: [],
              total: payment.transaction_amount,
              amountPaid: payment.transaction_amount,
              paymentStatus: payment.status,
              paymentId: payment.id
            };
          }

          // Los reintentos del webhook ya no dependen del dedup de Blobs (que
          // hoy no persiste): sendOrderEmail/sendCustomerEmail mandan con
          // Idempotency-Key por pedido, así que Resend no manda dos veces
          // el mismo mail aunque MP notifique tres veces.
          const corte = Date.now() + 6000;
          const [internal, customer] = await Promise.all([
            sendOrderEmail(view, { deadline: corte }),
            sendCustomerEmail(view, { deadline: corte })
          ]);
          console.log('[mp-webhook] mail interno:', JSON.stringify(internal));
          console.log('[mp-webhook] mail cliente:', JSON.stringify(customer));

          // Solo marcamos como notificado si el aviso interno salió: si Resend
          // falló, dejamos que el reintento de MP vuelva a intentarlo en vez de
          // perder el pedido para siempre.
          if (internal.sent) {
            await conLimite(
              markNotified(orderId, {
                id: payment.id,
                status: payment.status,
                amount: payment.transaction_amount
              }),
              1500,
              'markNotified (Blobs)'
            );
          } else {
            console.error(
              '[mp-webhook] PAGO APROBADO SIN AVISO:',
              orderId,
              internal.reason,
              internal.detail || ''
            );
          }
        }
      }

      // 3) CRM interno (app.epicalcos.com): registra el pago aprobado o deja
      //    constancia del rechazo/devolución en el pedido. No-op sin
      //    CRM_WEBHOOK_URL/SECRET; nunca lanza. Idempotente por paymentId,
      //    así que los reintentos de MP no duplican pagos.
      if (payment.status === 'approved' || isRejected) {
        const crmOrder = buildCrmOrder(stored ?? {
          orderId,
          itemsTotal: payment.transaction_amount,
          total: payment.transaction_amount,
          payer: { name: meta.buyer_name, email: payment.payer?.email, phone: meta.buyer_phone, address: meta.shipping_address },
          shipping: { method: meta.shipping_method, city: meta.shipping_city, province: meta.shipping_province, zipCode: meta.shipping_zip_code, cost: meta.shipping_cost || 0 },
          items: items.map((i) => ({ title: i.title, quantity: Number(i.quantity) || 1, unit_price: Number(i.unit_price) || 0 }))
        });
        if (crmOrder) {
          await notifyCrm(isRejected ? 'order.rejected' : 'order.paid', {
            ...crmOrder,
            paymentStatus: isRejected ? 'rejected' : 'paid',
            paymentId: String(payment.id),
            total: payment.transaction_amount
          });
        }
      }

      // 4) Meta Conversions API: Purchase server-side con event_id
      //    `purchase-{orderId}`, el mismo que dispara el píxel del navegador en
      //    /pago-exitoso → Meta deduplica. Va ÚLTIMO y con techo de tiempo: es
      //    tracking, y el tracking nunca puede costar un aviso de venta.
      if (payment.status === 'approved') {
        const capi = await conLimite(
          sendPurchaseEvent({ orderId, order: stored, payment }),
          2500,
          'meta capi',
          { sent: false, reason: 'timeout' }
        );
        console.log('[mp-webhook] meta capi:', JSON.stringify(capi));
      }
    } catch (err) {
      console.error('[mp-webhook] error fetching/notifying payment:', err);
    }
  }

  // Mercado Pago espera 200 rápido; si demorás, reintenta.
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
