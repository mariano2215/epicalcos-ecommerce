/**
 * Reglas de precio y envío del lado del SERVIDOR.
 *
 * Espejo de frontend/src/config/pricing.js y frontend/src/config/site.js.
 * Existe porque los precios que llegan a create-preference vienen del navegador
 * y cualquiera puede manipularlos (DevTools/curl): acá se recalcula el precio
 * de cada item a partir de su id y se rechaza el pedido si no coincide.
 *
 * ⚠️ Si cambiás un precio o regla en el frontend, cambialo TAMBIÉN acá.
 */

// --- Espejo de frontend/src/config/pricing.js ---
const SIZE_PRICES = { '4cm': 1000, '6cm': 1500, '9cm': 2000 };
const BULK_THRESHOLD = 10; // desde 10 calcos sueltos, 10 % off
const BULK_DISCOUNT = 0.1;
const WHOLESALE_QTY = 100; // pack mayorista: exactamente 100 calcos, 25 % off
const WHOLESALE_DISCOUNT = 0.25;
const PERSONALIZADOS_MIN = 10; // personalizados: mínimo 10 calcos, 10 % off
const PERSONALIZADOS_DISCOUNT = 0.1;
const NEGOCIO_PRICE = 40000; // promo negocio: 100u 6 cm precio fijo, 1 por línea
const FIXED_PRICES = {
  'tatuajes-hoja': 12000,
  'polaroid-x10': 10000
};

// --- Espejo de frontend/src/config/site.js (envío) ---
const FREE_SHIPPING_THRESHOLD_ROSARIO = 50000;
const SHIPPING_COST = { rosario: 3500, nearby: 5000, interior: 8000 };
const NEARBY_CITIES = ['funes', 'granadero baigorria', 'villa gobernador galvez'];

// --- Límites anti-abuso del payload ---
const MAX_LINES = 30;
const MAX_QTY_PER_LINE = 1000;
const MAX_TITLE_LENGTH = 150;

const round = Math.round;

function normalize(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function shippingZone(city, province) {
  const c = normalize(city);
  const p = normalize(province);
  if (p === 'santa fe') {
    if (c === 'rosario') return 'rosario';
    if (NEARBY_CITIES.includes(c)) return 'nearby';
  }
  return 'interior';
}

export function calculateShipping({ method, subtotal = 0, city, province }) {
  if (method === 'retiro') return 0;
  const zone = shippingZone(city, province);
  if (zone === 'rosario') {
    return subtotal >= FREE_SHIPPING_THRESHOLD_ROSARIO ? 0 : SHIPPING_COST.rosario;
  }
  return SHIPPING_COST[zone];
}

export function shippingMethodLabel(method, city, province) {
  if (method === 'retiro') return 'Retiro en Rosario';
  const zone = shippingZone(city, province);
  if (zone === 'rosario') return 'Envío a Rosario';
  if (zone === 'nearby') return 'Envío a ciudad próxima';
  return 'Envío al resto del país';
}

/**
 * Precio unitario esperado para un item según su id.
 * Los ids los genera el frontend con estructura fija:
 *   sticker:{stickerId}:{size} · pack:{tipo}:{size}:{ts} · negocio:{ts} · fixed:{productId}
 * @param {string} id
 * @param {number} quantity cantidad de la línea (para validar packs)
 * @param {boolean} bulkActive si el carrito llegó al umbral de descuento por volumen
 * @returns {{ price: number } | { error: string }}
 */
function expectedUnitPrice(id, quantity, bulkActive) {
  const parts = String(id).split(':');
  const kind = parts[0];

  if (kind === 'sticker') {
    const base = SIZE_PRICES[parts[2]];
    if (!base) return { error: `tamaño inválido en "${id}"` };
    return { price: bulkActive ? round(base * (1 - BULK_DISCOUNT)) : base };
  }

  if (kind === 'pack') {
    const packType = parts[1];
    const base = SIZE_PRICES[parts[2]];
    if (!base) return { error: `tamaño inválido en "${id}"` };
    if (packType === 'mayorista') {
      if (quantity !== WHOLESALE_QTY)
        return { error: `pack mayorista debe ser de ${WHOLESALE_QTY} calcos` };
      return { price: round(base * (1 - WHOLESALE_DISCOUNT)) };
    }
    if (packType === 'personalizados') {
      if (quantity < PERSONALIZADOS_MIN)
        return { error: `personalizados: mínimo ${PERSONALIZADOS_MIN} calcos` };
      return { price: round(base * (1 - PERSONALIZADOS_DISCOUNT)) };
    }
    return { error: `tipo de pack desconocido en "${id}"` };
  }

  if (kind === 'negocio') {
    if (quantity !== 1) return { error: 'promo negocio: 1 unidad por línea' };
    return { price: NEGOCIO_PRICE };
  }

  if (kind === 'fixed') {
    const price = FIXED_PRICES[parts[1]];
    if (!price) return { error: `producto desconocido "${id}"` };
    return { price };
  }

  return { error: `item desconocido "${id}"` };
}

/**
 * Valida y re-precia un pedido completo con las reglas del servidor.
 * Nunca confía en unit_price ni en shipping.cost del cliente.
 *
 * @param {{ items: Array<{id, title, quantity, unit_price}>, shipping?: object }} payload
 * @returns {{ ok: true, items: Array, itemsTotal: number, shippingCost: number,
 *             shippingMethod: string, methodValue: string }
 *          | { ok: false, error: string, detail?: string }}
 */
export function validateAndPriceOrder({ items, shipping }) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: 'items_empty' };
  }
  if (items.length > MAX_LINES) {
    return { ok: false, error: 'too_many_lines', detail: `máximo ${MAX_LINES} líneas` };
  }

  // Normalizar y validar formas básicas antes de calcular precios.
  const clean = [];
  for (const raw of items) {
    const id = String(raw?.id ?? '');
    const title = String(raw?.title ?? '').slice(0, MAX_TITLE_LENGTH).trim();
    const quantity = Number(raw?.quantity);
    const unitPrice = Number(raw?.unit_price);
    if (!id || !title) return { ok: false, error: 'item_invalid', detail: `item sin id/título` };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      return { ok: false, error: 'quantity_invalid', detail: `cantidad inválida en "${id}"` };
    }
    if (!Number.isFinite(unitPrice)) {
      return { ok: false, error: 'price_invalid', detail: `precio inválido en "${id}"` };
    }
    clean.push({ id, title, quantity, unitPrice });
  }

  // El 10 % por volumen aplica a calcos sueltos cuando el carrito suma ≥ 10.
  const stickerUnits = clean
    .filter((i) => i.id.startsWith('sticker:'))
    .reduce((a, i) => a + i.quantity, 0);
  const bulkActive = stickerUnits >= BULK_THRESHOLD;

  const priced = [];
  for (const item of clean) {
    const expected = expectedUnitPrice(item.id, item.quantity, bulkActive);
    if (expected.error) {
      return { ok: false, error: 'item_invalid', detail: expected.error };
    }
    if (expected.price !== item.unitPrice) {
      console.warn(
        `[pricing] precio adulterado o desactualizado en "${item.id}": ` +
          `recibido ${item.unitPrice}, esperado ${expected.price}`
      );
      return {
        ok: false,
        error: 'price_mismatch',
        detail: `el precio de "${item.title}" no coincide con el vigente — recargá la página`
      };
    }
    priced.push({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      unit_price: expected.price,
      currency_id: 'ARS'
    });
  }

  const itemsTotal = priced.reduce((a, i) => a + i.unit_price * i.quantity, 0);

  // Envío: SIEMPRE recalculado en el servidor (se ignora shipping.cost del cliente).
  // methodValue es 'retiro' | 'envio'; si un cliente viejo no lo manda, se deriva del label.
  const methodValue =
    shipping?.methodValue ||
    (/retiro/i.test(String(shipping?.method || '')) ? 'retiro' : 'envio');
  if (methodValue !== 'retiro' && methodValue !== 'envio') {
    return { ok: false, error: 'shipping_invalid', detail: 'método de envío desconocido' };
  }
  const shippingCost = calculateShipping({
    method: methodValue,
    subtotal: itemsTotal,
    city: shipping?.city,
    province: shipping?.province
  });

  return {
    ok: true,
    items: priced,
    itemsTotal,
    shippingCost,
    shippingMethod: shippingMethodLabel(methodValue, shipping?.city, shipping?.province),
    methodValue
  };
}
