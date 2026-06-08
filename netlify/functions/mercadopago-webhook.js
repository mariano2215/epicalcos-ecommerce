/**
 * Netlify Function: POST /api/mercadopago-webhook
 * Recibe notificaciones IPN/Webhook de Mercado Pago.
 *
 * Por ahora solo loguea — listo para que cuando agreguemos base de datos
 * actualice la orden, dispare emails y reduzca stock.
 *
 * Para activar en MP:
 *   Panel Mercado Pago → Tu app → Webhooks → URL:
 *   https://epicalcos-ecommerce.netlify.app/api/mercadopago-webhook
 *   Eventos a escuchar: payment
 */
import { MercadoPagoConfig, Payment } from 'mercadopago';

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
  const paymentId =
    payload?.data?.id ||
    event.queryStringParameters?.['data.id'] ||
    event.queryStringParameters?.id;

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

      // TODO próxima fase:
      //   - Buscar/crear orden por external_reference
      //   - Actualizar estado: approved | pending | rejected | refunded | cancelled
      //   - Si approved: enviar email al cliente + notificar a EPICALCOS
      //   - Reducir stock en base de datos
    } catch (err) {
      console.error('[mp-webhook] error fetching payment:', err);
    }
  }

  // Mercado Pago espera 200 rápido; si demorás, reintenta.
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
