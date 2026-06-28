import { Router } from 'express';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { registrarPedidoEnCRM } from '../services/notion.js';

const router = Router();

const getClient = () => {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token || token === 'TU_ACCESS_TOKEN') {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado');
  }
  return new MercadoPagoConfig({ accessToken: token });
};

router.post('/create-preference', async (req, res, next) => {
  try {
    const { items, payer, shipping } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items_empty' });
    }
    if (!payer?.email || !payer?.name) {
      return res.status(400).json({ error: 'payer_invalid' });
    }

    const client = getClient();
    const preferenceClient = new Preference(client);

    const orderId = `EPI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backend = process.env.BACKEND_URL || 'http://localhost:3001';

    // Items principales del carrito
    const mpItems = items.map((item) => ({
      id: String(item.id),
      title: String(item.title),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      currency_id: 'ARS'
    }));

    // Si hay costo de envío, agregarlo como item separado (mejor breakdown en MP)
    const shippingCost = Number(shipping?.cost) || 0;
    if (shippingCost > 0) {
      mpItems.push({
        id: 'shipping',
        title: `Envío — ${shipping?.method || 'a coordinar'}`,
        quantity: 1,
        unit_price: shippingCost,
        currency_id: 'ARS'
      });
    }

    const body = {
      items: mpItems,
      payer: {
        name: payer.name,
        email: payer.email
      },
      back_urls: {
        success: `${frontend}/pago-exitoso`,
        failure: `${frontend}/pago-error`,
        pending: `${frontend}/pago-pendiente`
      },
      auto_return: 'approved',
      external_reference: orderId,
      metadata: {
        buyer_name: payer.name,
        buyer_phone: payer.phone,
        buyer_dni: payer.dni,
        shipping_method: shipping?.method,
        shipping_cost: shippingCost,
        shipping_city: shipping?.city,
        shipping_province: shipping?.province,
        shipping_zip_code: shipping?.zipCode,
        shipping_address: payer?.address,
        comments: shipping?.comments
      },
      notification_url: `${backend}/api/webhooks/mercadopago`
    };

    const preference = await preferenceClient.create({ body });

    // Registrar en Notion CRM (sin bloquear la respuesta si falla)
    const total = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0) + shippingCost;
    registrarPedidoEnCRM({ payer, shipping, items, total, orderId }).catch(() => {});

    res.json({
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      external_reference: orderId
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Webhook placeholder. En producción debería:
 * - Validar la notificación con Mercado Pago consultando el pago por su id.
 * - Actualizar el estado de la orden en una base de datos.
 * - Disparar emails al comprador y al equipo de EPICALCOS.
 * - Actualizar stock real.
 */
router.post('/webhooks/mercadopago', (req, res) => {
  console.log('[mp webhook]', JSON.stringify(req.body));
  res.status(200).json({ received: true });
});

export default router;
