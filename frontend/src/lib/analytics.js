/**
 * Analytics scaffold para EPICALCOS.
 *
 * Soporta GA4 (vía gtag o GTM dataLayer) y Meta Pixel.
 *
 * GA4 se carga con el snippet de gtag.js inline en index.html (ID hardcodeado,
 * es público). El Píxel sale de VITE_META_PIXEL_ID y GTM de VITE_GTM_ID; si esa
 * env var está vacía no hay contenedor, que es el caso hoy.
 *
 * ⚠️ gtag.js NO entiende los objetos `{ event, ecommerce }` del dataLayer: ese
 * formato lo lee un contenedor de GTM, no el tag suelto. Sin el reenvío de
 * `ga4()` de acá abajo, todos los eventos se escriben en un array que nadie
 * consume — que es exactamente lo que pasaba antes de instalar el tag.
 */

const GTM_ID = import.meta.env.VITE_GTM_ID || '';
const GA4_ID = 'G-04CJ1WQRSJ'; // espejado en el snippet de index.html
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '';
const DEV = import.meta.env.DEV;

/**
 * ¿Hay que hablarle a gtag directo?
 *
 * Solo si el tag está cargado Y no hay contenedor de GTM. Con GTM presente el
 * contenedor ya lee el dataLayer y dispara sus propias etiquetas de GA4:
 * reenviar además por gtag contaría cada compra dos veces.
 */
function usaGtagDirecto() {
  return !GTM_ID && typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Traduce un evento con forma de dataLayer al formato de gtag.
 *
 * En GA4 los parámetros de ecommerce (currency, value, items, transaction_id…)
 * van al mismo nivel que el resto, así que `ecommerce` se aplana. Las
 * `user_properties` no son parámetros de evento: se setean aparte.
 */
function ga4({ event, ecommerce, user_properties: userProps, ...rest }) {
  if (!event || !usaGtagDirecto()) return;
  try {
    if (userProps) window.gtag('set', 'user_properties', userProps);
    // gtag.js procesa el push del dataLayer en el acto y le estampa sus propias
    // claves `gtm.*` al MISMO objeto que estamos por reenviar. Sin este filtro
    // viajan como parámetros del evento y ensucian el informe.
    const propios = Object.fromEntries(
      Object.entries(rest).filter(([k]) => !k.startsWith('gtm.'))
    );
    window.gtag('event', event, { ...propios, ...(ecommerce || {}) });
  } catch (err) {
    // El tracking NUNCA puede romper el flujo de compra (ver pixel()).
    debug('gtag falló', err);
  }
}

/**
 * Único punto de salida hacia Google: escribe en el dataLayer (para GTM, si
 * algún día se prende) y reenvía a gtag. Todos los `track*` de este archivo
 * pasan por acá, así que el reenvío cubre el funnel completo sin tocar
 * ninguno de los llamadores.
 */
function pushDataLayer(event) {
  if (typeof window === 'undefined') return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
  } catch (err) {
    // El tracking NUNCA puede romper el flujo de compra (ver pixel()).
    debug('dataLayer falló', err);
  }
  // El `{ ecommerce: null }` que precede a cada evento de ecommerce es un reset
  // de GTM: no lleva `event` y para gtag no significa nada.
  ga4(event);
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

// ─── Armador de packs ─────────────────────────────────────────────────────────

/** Entró al armador con un tamaño de pack elegido. */
export function trackPackBuilderStart(packSize) {
  pushDataLayer({ event: 'pack_builder_start', pack_size: packSize });
  pixelCustom('PackBuilderStart', { pack_size: packSize });
  debug('pack_builder_start', packSize);
}

/**
 * Pack completo y mandado al carrito. `units` son las calcos y `designs` los
 * diseños distintos: juntos dicen si el armador se usa para variedad o para
 * repetir el mismo diseño.
 */
export function trackPackCompleted({ packSize, units, designs, value }) {
  pushDataLayer({
    event: 'pack_completed',
    pack_size: packSize,
    pack_units: units,
    pack_designs: designs,
    value,
    currency: 'ARS'
  });
  pixelCustom('PackCompleted', { pack_size: packSize, units, value });
  debug('pack_completed', packSize, units, 'calcos /', designs, 'diseños');
}

// ─── A/B testing ──────────────────────────────────────────────────────────────

/**
 * Exposición a una variante de experimento (ver lib/experiments.js).
 *
 * Va por partida doble a propósito:
 *  - `experiment_view` como EVENTO, para contar exposiciones reales.
 *  - `user_properties.exp_{id}`, para poder segmentar CUALQUIER informe de GA4
 *    por variante (incluido `purchase`, que ocurre páginas después). Sin la
 *    propiedad de usuario habría que armar embudos a mano para cada test.
 *
 * Nunca lleva PII: el id de visitante de experiments.js es un random propio.
 */
export function trackExperimentView({ id, variant }) {
  pushDataLayer({
    event: 'experiment_view',
    experiment_id: id,
    experiment_variant: variant,
    user_properties: { [`exp_${id}`]: variant }
  });
  debug('experiment_view', id, '→', variant);
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

/**
 * Cambio de orden en la grilla de categorías. Sirve para saber si al que llega
 * al catálogo le alcanza el orden por defecto o anda buscando otra cosa.
 */
export function trackOrdenCatalogo(orden) {
  pushDataLayer({ event: 'catalogo_orden', orden });
  debug('catalogo_orden', orden);
}

export function trackLeadCapture(source = 'welcome_popup') {
  pushDataLayer({ event: 'generate_lead', lead_source: source });
  pixel('Lead', { content_name: source });
  debug('generate_lead', source);
}

/**
 * El formulario de contacto falló (spec 012). `motivo` es 'validacion',
 * 'red' o 'servidor'.
 *
 * Va sin un solo dato del formulario: nombre, mail, teléfono y ciudad son PII
 * y el dataLayer es público — cualquier extensión del navegador lo lee.
 */
export function trackContactoFormError(motivo) {
  pushDataLayer({ event: 'contacto_form_error', motivo });
  debug('contacto_form_error', motivo);
}

/** Click a Instagram, con el contexto de dónde salió (espeja trackWhatsappClick). */
export function trackInstagramClick(contexto = 'contacto') {
  pushDataLayer({ event: 'instagram_click', instagram_context: contexto });
  debug('instagram_click', contexto);
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
