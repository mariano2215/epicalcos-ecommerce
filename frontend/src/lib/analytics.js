/**
 * Analytics scaffold para EPICALCOS.
 *
 * Soporta GA4 (vía gtag o GTM dataLayer) y Meta Pixel.
 * Mientras los IDs estén vacíos en .env, las funciones loguean en consola en dev y no envían nada en prod.
 *
 * Para activar:
 *   1. Crear .env en /frontend con:
 *        VITE_GTM_ID=GTM-XXXXXXX
 *        VITE_GA4_ID=G-XXXXXXXXXX
 *        VITE_META_PIXEL_ID=1234567890
 *   2. Hacer `npm run build` y redeployar.
 *   3. El snippet GTM en index.html se activa automáticamente si VITE_GTM_ID está definido.
 */

const GTM_ID = import.meta.env.VITE_GTM_ID || '';
const GA4_ID = import.meta.env.VITE_GA4_ID || '';
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '';
const DEV = import.meta.env.DEV;

function pushDataLayer(event) {
  if (typeof window === 'undefined') return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
  } catch (err) {
    // El tracking NUNCA puede romper el flujo de compra (ver pixel()).
    debug('dataLayer falló', err);
  }
}

/**
 * Meta Pixel. El try/catch es obligatorio: dentro del navegador embebido de
 * Instagram/Facebook, `fbevents.js` corre en un entorno con storage y cookies
 * restringidos y puede tirar una excepción sincrónica. Sin esta guarda, un
 * fallo de tracking aborta el checkout (era el bug de "No pudimos registrar tu
 * pedido" al entrar desde una publicidad de Instagram).
 */
function pixel(eventName, data = {}, options) {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq !== 'function') return;
  try {
    if (options) {
      window.fbq('track', eventName, data, options);
    } else {
      window.fbq('track', eventName, data);
    }
  } catch (err) {
    debug('fbq track falló', err);
  }
}

/** Eventos NO estándar de Meta (los del configurador) → trackCustom. */
function pixelCustom(eventName, data = {}) {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq !== 'function') return;
  try {
    window.fbq('trackCustom', eventName, data);
  } catch (err) {
    debug('fbq trackCustom falló', err);
  }
}

function debug(...args) {
  if (DEV) console.log('[analytics]', ...args);
}

const toItems = (items) =>
  items.map((i) => ({
    item_id: i.id,
    item_name: i.name,
    item_category: i.categoryLabel || i.category,
    price: i.price,
    quantity: i.quantity || 1
  }));

const sum = (items) => items.reduce((acc, i) => acc + i.price * (i.quantity || 1), 0);

/**
 * `content_id` que Meta debe matchear con el catálogo: el SKU del catálogo si el
 * ítem lo tiene (`catalogSku`), si no el id interno. Ver src/config/metaCatalog.js.
 */
const contentId = (p) => p.catalogSku || p.id;

// ─── GA4 e-commerce events ────────────────────────────────────────────────────

export function trackViewItem(product) {
  const data = {
    event: 'view_item',
    ecommerce: {
      currency: 'ARS',
      value: product.price,
      items: toItems([{ ...product, quantity: 1 }])
    }
  };
  pushDataLayer({ ecommerce: null });
  pushDataLayer(data);
  pixel('ViewContent', {
    content_ids: [contentId(product)],
    content_name: product.name,
    content_type: 'product',
    currency: 'ARS',
    value: product.price
  });
  debug('view_item', product.id);
}

export function trackSelectItem(product, listName = 'catalog') {
  pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event: 'select_item',
    ecommerce: {
      item_list_name: listName,
      items: toItems([{ ...product, quantity: 1 }])
    }
  });
  debug('select_item', product.id);
}

/**
 * Impresión de una lista de productos (grilla de categoría, sugeridos, etc.).
 * Sin esto no se puede calcular la tasa vista-de-lista → click → carrito, que
 * es el primer escalón real del funnel.
 *
 * Se mandan hasta MAX_LIST_ITEMS: una categoría puede tener cientos de diseños
 * y GA4 rechaza los payloads grandes.
 */
const MAX_LIST_ITEMS = 30;

export function trackViewItemList(items, listName, listId) {
  if (!items?.length) return;
  const shown = items.slice(0, MAX_LIST_ITEMS);
  pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event: 'view_item_list',
    ecommerce: {
      item_list_name: listName,
      item_list_id: listId || listName,
      items: toItems(shown.map((i) => ({ ...i, quantity: 1 })))
    }
  });
  debug('view_item_list', listName, shown.length, 'de', items.length);
}

/** Medio de pago elegido en el checkout (Mercado Pago o transferencia). */
export function trackAddPaymentInfo(items, paymentMethod, coupon) {
  pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event: 'add_payment_info',
    ecommerce: {
      currency: 'ARS',
      value: sum(items),
      payment_type: paymentMethod,
      ...(coupon ? { coupon } : {}),
      items: toItems(items)
    }
  });
  debug('add_payment_info', paymentMethod);
}

/** Click al botón de WhatsApp, con el contexto de dónde salió. */
export function trackWhatsappClick(context = 'floating') {
  pushDataLayer({ event: 'whatsapp_click', whatsapp_context: context });
  pixelCustom('WhatsappClick', { context });
  debug('whatsapp_click', context);
}

/** Envío calculado antes del checkout (ver components/ShippingInfo.jsx). */
export function trackShippingCalculated({ zone, cost }) {
  pushDataLayer({ event: 'shipping_calculated', shipping_zone: zone, shipping_cost: cost });
  debug('shipping_calculated', zone, cost);
}

export function trackAddToCart(product, quantity = 1) {
  pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'ARS',
      value: product.price * quantity,
      items: toItems([{ ...product, quantity }])
    }
  });
  pixel('AddToCart', {
    content_ids: [contentId(product)],
    content_name: product.name,
    content_type: 'product',
    currency: 'ARS',
    value: product.price * quantity
  });
  debug('add_to_cart', product.id, 'x', quantity);
}

export function trackRemoveFromCart(item) {
  pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event: 'remove_from_cart',
    ecommerce: {
      currency: 'ARS',
      value: item.price * item.quantity,
      items: toItems([item])
    }
  });
  debug('remove_from_cart', item.id);
}

export function trackViewCart(items) {
  pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event: 'view_cart',
    ecommerce: { currency: 'ARS', value: sum(items), items: toItems(items) }
  });
  debug('view_cart', items.length, 'items');
}

export function trackBeginCheckout(items) {
  pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event: 'begin_checkout',
    ecommerce: { currency: 'ARS', value: sum(items), items: toItems(items) }
  });
  pixel('InitiateCheckout', {
    contents: items.map((i) => ({ id: contentId(i), quantity: i.quantity })),
    content_type: 'product',
    currency: 'ARS',
    value: sum(items),
    num_items: items.reduce((a, i) => a + i.quantity, 0)
  });
  debug('begin_checkout', items.length, 'items');
}

export function trackAddShippingInfo(items, shippingTier) {
  pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event: 'add_shipping_info',
    ecommerce: {
      currency: 'ARS',
      value: sum(items),
      shipping_tier: shippingTier,
      items: toItems(items)
    }
  });
  debug('add_shipping_info', shippingTier);
}

/**
 * @param {{ orderId: string, items: Array, total: number, shipping?: number,
 *           coupon?: string|null, paymentMethod?: string }} order
 *        `total` es lo que REALMENTE paga el cliente (ítems con descuento +
 *        envío), no el precio de lista. `paymentMethod` viaja como parámetro
 *        propio para poder separar en GA4 las ventas por transferencia —que se
 *        registran antes de recibir el comprobante— de las de Mercado Pago.
 */
export function trackPurchase({ orderId, items, total, shipping, coupon, paymentMethod }) {
  pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event: 'purchase',
    payment_method: paymentMethod,
    ecommerce: {
      transaction_id: orderId,
      currency: 'ARS',
      value: total,
      shipping,
      ...(coupon ? { coupon } : {}),
      items: toItems(items)
    }
  });
  // eventID = mismo event_id que manda el webhook de MP por la API de
  // conversiones (netlify/functions/lib/metaCapi.js) → Meta deduplica y el
  // Purchase cuenta una sola vez aunque lleguen los dos.
  pixel(
    'Purchase',
    {
      contents: items.map((i) => ({ id: contentId(i), quantity: i.quantity })),
      content_type: 'product',
      currency: 'ARS',
      value: total,
      num_items: items.reduce((a, i) => a + i.quantity, 0)
    },
    { eventID: `purchase-${orderId}` }
  );
  debug('purchase', orderId, total);
}

export function trackSearch(query) {
  pushDataLayer({ event: 'search', search_term: query });
  pixel('Search', { search_string: query });
  debug('search', query);
}

/** Búsqueda que devolvió 0 resultados → mide la fuga de tráfico del estado vacío. */
export function trackSearchNoResults(term) {
  pushDataLayer({ event: 'search_no_results', search_term: term });
  pixel('Search', { search_string: term });
  debug('search_no_results', term);
}

export function trackLeadCapture(source = 'welcome_popup') {
  pushDataLayer({ event: 'generate_lead', lead_source: source });
  pixel('Lead', { content_name: source });
  debug('generate_lead', source);
}

// ─── Configurador de personalizados ───────────────────────────────────────────

/** Primera interacción con el configurador (una vez por sesión de página). */
export function trackPersonalizadoInicio() {
  pushDataLayer({ event: 'personalizado_inicio' });
  pixelCustom('PersonalizadoInicio');
  debug('personalizado_inicio');
}

/** Cada paso completado del configurador. */
export function trackPersonalizadoPaso(paso, valor) {
  pushDataLayer({ event: 'personalizado_paso', paso, valor });
  pixelCustom('PersonalizadoPaso', { paso, valor });
  debug('personalizado_paso', paso, valor);
}

/** Archivo válido cargado en el configurador. */
export function trackPersonalizadoArchivo(info = {}) {
  pushDataLayer({ event: 'personalizado_archivo_cargado', ...info });
  pixelCustom('PersonalizadoArchivo', info);
  debug('personalizado_archivo_cargado', info);
}

/** Configuración completa cotizada en vivo. */
export function trackPersonalizadoPrecio({ valor, material, cantidad }) {
  pushDataLayer({ event: 'personalizado_precio_calculado', valor, material, cantidad });
  pixelCustom('PersonalizadoPrecio', { valor, material, cantidad });
  debug('personalizado_precio_calculado', valor, material, cantidad);
}

export const analyticsConfig = { GTM_ID, GA4_ID, PIXEL_ID };
