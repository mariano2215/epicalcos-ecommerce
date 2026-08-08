/**
 * Traspaso del pedido REAL desde el checkout a la pantalla de gracias.
 *
 * EL PROBLEMA QUE RESUELVE
 * /pago-exitoso disparaba `purchase` con `subtotal` del CartContext, que se
 * calcula con `basePrice` — el precio de LISTA. Los descuentos (3x2, cupón,
 * 10 % por transferencia) se aplican en `pricedItems()`, que vive solo dentro
 * del checkout y no sobrevive al redirect a Mercado Pago. Resultado: GA4 y el
 * Píxel reportaban un `value` inflado y `shipping: 0` siempre, mientras la API
 * de conversiones (server) mandaba el monto correcto. Dos números distintos
 * para la misma venta, y el ROAS de las campañas calculado sobre el equivocado.
 *
 * CÓMO
 * El checkout guarda acá el pedido ya preciado (ítems al precio pagado, envío,
 * total, cupón) justo antes de mandar al cliente a pagar. sessionStorage
 * sobrevive al redirect de Mercado Pago en la misma pestaña — es el mismo
 * mecanismo que ya usa CUSTOM_SPEC_STORAGE_KEY para el CTA de WhatsApp.
 *
 * `consumePurchase()` LEE Y BORRA: si el cliente refresca /pago-exitoso, el
 * segundo intento no encuentra nada y no se duplica el evento.
 */
const KEY = 'epicalcos.purchase.v1';

/**
 * @param {{ orderId: string, items: Array, itemsTotal: number,
 *           shippingCost: number, total: number, coupon?: string,
 *           paymentMethod: 'mercadopago'|'transferencia' }} order
 */
export function stashPurchase(order) {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        orderId: order.orderId,
        // Solo lo que necesita el evento: sin blobs ni URLs de Cloudinary.
        items: order.items.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          categoryLabel: i.categoryLabel,
          catalogSku: i.catalogSku,
          size: i.size,
          price: i.price,
          quantity: i.quantity
        })),
        itemsTotal: order.itemsTotal,
        shippingCost: order.shippingCost,
        total: order.total,
        coupon: order.coupon || null,
        paymentMethod: order.paymentMethod
      })
    );
  } catch {
    /* sessionStorage lleno o bloqueado: el tracking nunca rompe la compra */
  }
}

/** Devuelve el pedido guardado y lo borra. Null si no hay (o si ya se consumió). */
export function consumePurchase() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw);
    return parsed?.items?.length ? parsed : null;
  } catch {
    return null;
  }
}
