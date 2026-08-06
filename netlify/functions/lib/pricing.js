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
export const SIZE_PRICES = { '4cm': 1200, '6cm': 1600, '9cm': 2000 };
const BULK_THRESHOLD = 10; // desde 10 calcos sueltos TOTALES (combinables), 10 % off
const BULK_DISCOUNT = 0.1;
const BULK_DISCOUNT_PAYMENT_METHOD = 'transferencia'; // el 10 % solo aplica pagando por transferencia

// Cupones de descuento (mismo alcance que el descuento por volumen: solo
// calcos sueltos). El cupón de % es ACUMULABLE con el 10 % por transferencia:
// los descuentos se SUMAN (ej. transferencia 10 % + EPICA10 10 % = 20 % off),
// con un tope de seguridad para no llegar a precio negativo.
const COUPONS = { EPICA10: 0.1 };
const MAX_STICKER_DISCOUNT = 0.9;

// Cupones de BUNDLE (N x M sobre calcos de catálogo + personalizados: cada
// `buy` unidades, las `buy - pay` más baratas gratis). EMOJI50 = 2x1, cupón
// OCULTO que no se anuncia en el sitio (se pasa por mensaje privado) y que NO
// es acumulable con ningún %: con el bundle aplicado no corren el 10 % por
// transferencia, el 10 % por volumen (+10 calcos) ni otro cupón. También pisa
// a la promo 3x2 por fecha si estuviera vigente.
// ⚠️ Espejo de COUPONS/EMOJI50 en frontend/src/config/pricing.js.
export const COUPON_BUNDLES = { EMOJI50: { buy: 2, pay: 1 } };

// Vencimiento de cada cupón (hora Argentina, inclusive). Pasado ese instante el
// cupón se trata como inexistente: no descuenta nada acá y el frontend tampoco
// lo aplica. EMOJI50 se apaga solo el martes 4/8/2026 a las 23:59.
// ⚠️ Espejo de `endsAt` en COUPONS del frontend (lo verifica promoPricing.test.js).
export const COUPON_ENDS_MS = { EMOJI50: Date.parse('2026-08-04T23:59:59-03:00') };

export function isCouponActive(code, now = Date.now()) {
  const end = COUPON_ENDS_MS[String(code || '').trim().toUpperCase()];
  return !Number.isFinite(end) || now <= end;
}

// --- Espejo de la PROMO 3x2 de frontend/src/config/pricing.js ---
// "3x2 en TODAS las calcos": cada 3 calcos elegibles (sticker + custom), la más
// barata gratis. ACUMULABLE con EPICA10, pero durante la promo el % está topeado
// en PROMO_PERCENT_CAP (10 %). Se auto-desactiva por fecha (hora Argentina).
// ⚠️ Si cambiás algo acá, cambialo TAMBIÉN en el frontend. El test
// src/lib/promoPricing.test.js verifica la paridad.
export const PROMO_END_MS = Date.parse('2026-07-26T23:59:59-03:00');
const PROMO_BUY = 3;
const PROMO_PAY = 2;
export const PROMO_PERCENT_CAP = 0.1;

export function isPromoActive(now = Date.now()) {
  return Number.isFinite(PROMO_END_MS) && now <= PROMO_END_MS;
}

// 3x2 sobre una bolsa de unidades elegibles: se regalan las (buy-pay) más
// baratas por cada `buy`. Devuelve keepFraction = fracción del subtotal elegible
// que SE PAGA (se aplica uniforme a cada línea → precio por unidad positivo,
// verificable idéntico en el cliente; MP no admite líneas negativas).
export function promo3x2(unitBasePrices, buy = PROMO_BUY, pay = PROMO_PAY) {
  const n = unitBasePrices.length;
  const eligibleBase = unitBasePrices.reduce((a, b) => a + b, 0);
  const freeUnits = Math.floor(n / buy) * (buy - pay);
  if (eligibleBase <= 0 || freeUnits <= 0) {
    return { freeUnits: 0, discount: 0, keepFraction: 1 };
  }
  const sorted = [...unitBasePrices].sort((a, b) => a - b);
  let discount = 0;
  for (let k = 0; k < freeUnits; k++) discount += sorted[k];
  return { freeUnits, discount, keepFraction: (eligibleBase - discount) / eligibleBase };
}
const WHOLESALE_QTY = 100; // pack mayorista: MÍNIMO 100 calcos (sin tope), 50 % off
const WHOLESALE_DISCOUNT = 0.5;
const PERSONALIZADOS_MIN = 10; // personalizados: mínimo 10 calcos, 10 % off
const PERSONALIZADOS_DISCOUNT = 0.1;
const NEGOCIO_PRICE = 39999; // promo negocio: 100u 6 cm precio fijo, 1 por línea
const FIXED_PRICES = {
  'tatuajes-hoja': 12000,
  // Fotos Polaroid x10 por tamaño — espejo de POLAROID_SIZES del frontend.
  'polaroid-x10-5x8': 9000,
  'polaroid-x10-7x10': 12000,
  'polaroid-x10-9x13': 15000
};

// --- Espejo de frontend/src/config/personalizados.js (calcos personalizados) ---
// Un calco personalizado vale lo MISMO que uno del catálogo, según su tamaño:
//   unitario = SIZE_PRICES[tamaño]
// No hay recargo por material ni mínimo de compra (antes eran 10 unidades), así
// que no hace falta ninguna grilla extra: el precio por tamaño es el SIZE_PRICES
// de arriba. El test frontend/src/lib/precioPersonalizados.test.js lo verifica.

// --- Espejo de frontend/src/config/site.js (envío) ---
const FREE_SHIPPING_THRESHOLD_ROSARIO = 50000;
const SHIPPING_COST = { rosario: 4500, nearby: 6500, interior: 8500 }; // rosario=motomensajería, interior=Correo Argentino
const NEARBY_CITIES = ['funes', 'granadero baigorria', 'villa gobernador galvez'];

// --- Límites anti-abuso del payload ---
// El configurador de /personalizados agrega UNA línea por diseño subido y admite
// hasta ARCHIVO.maxArchivos (100) archivos por pedido, así que el tope tiene que
// dejar pasar esas 100 líneas más los calcos de catálogo del mismo carrito.
// ⚠️ Si sube el tope de archivos del frontend, subí este también.
const MAX_LINES = 130;
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
 * Precio de LISTA por unidad de un item según su id, antes de descuentos por
 * cupón/transferencia/promo. Los ids los genera el frontend con estructura fija:
 *   sticker:{stickerId}:{size} · pack:{tipo}:{size}:{ts} · negocio:{ts} · fixed:{productId}
 *   custom:{tamano}:{corte}:{ts}
 *
 * `discountable` marca las líneas que participan de los descuentos a calcos
 * sueltos (cupón/transferencia/promo 3x2): SOLO catálogo (sticker) y
 * personalizados (custom). Los packs/negocio/fijos ya traen su precio final.
 *
 * @param {string} id
 * @param {number} quantity cantidad de la línea (para validar packs/custom)
 * @returns {{ base: number, kind: string, discountable: boolean } | { error: string }}
 */
function lineBase(id, quantity) {
  const parts = String(id).split(':');
  const kind = parts[0];

  if (kind === 'sticker') {
    const base = SIZE_PRICES[parts[2]];
    if (!base) return { error: `tamaño inválido en "${id}"` };
    return { base, kind, discountable: true };
  }

  if (kind === 'pack') {
    const packType = parts[1];
    const base = SIZE_PRICES[parts[2]];
    if (!base) return { error: `tamaño inválido en "${id}"` };
    if (packType === 'mayorista') {
      if (quantity < WHOLESALE_QTY)
        return { error: `pack mayorista: mínimo ${WHOLESALE_QTY} calcos` };
      return { base: round(base * (1 - WHOLESALE_DISCOUNT)), kind, discountable: false };
    }
    if (packType === 'personalizados') {
      if (quantity < PERSONALIZADOS_MIN)
        return { error: `personalizados: mínimo ${PERSONALIZADOS_MIN} calcos` };
      return { base: round(base * (1 - PERSONALIZADOS_DISCOUNT)), kind, discountable: false };
    }
    return { error: `tipo de pack desconocido en "${id}"` };
  }

  if (kind === 'negocio') {
    if (quantity !== 1) return { error: 'promo negocio: 1 unidad por línea' };
    return { base: NEGOCIO_PRICE, kind, discountable: false };
  }

  if (kind === 'fixed') {
    const price = FIXED_PRICES[parts[1]];
    if (!price) return { error: `producto desconocido "${id}"` };
    return { base: price, kind, discountable: false };
  }

  // custom:{tamano}:{corte}:{ts} — calco personalizado, al precio del catálogo.
  // El corte (parts[2]) es especificación pura y no afecta el precio, y no hay
  // mínimo de compra: cualquier cantidad ≥ 1 es válida.
  if (kind === 'custom') {
    const base = SIZE_PRICES[parts[1]];
    if (!base) return { error: `tamaño inválido en "${id}"` };
    return { base, kind, discountable: true };
  }

  return { error: `item desconocido "${id}"` };
}

/**
 * Valida y re-precia un pedido completo con las reglas del servidor.
 * Nunca confía en unit_price ni en shipping.cost del cliente.
 *
 * @param {{ items: Array<{id, title, quantity, unit_price}>, shipping?: object, paymentMethod?: string, couponCode?: string }} payload
 * @returns {{ ok: true, items: Array, itemsTotal: number, shippingCost: number,
 *             shippingMethod: string, methodValue: string, couponApplied: string|null }
 *          | { ok: false, error: string, detail?: string }}
 */
export function validateAndPriceOrder({ items, shipping, paymentMethod, couponCode }) {
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

  // Cupón: el de % es ACUMULABLE con el descuento por transferencia (se SUMAN)
  // y no requiere umbral de cantidad ni medio de pago. El de bundle (2x1) NO se
  // acumula con nada: anula todos los %.
  // Un cupón vencido (COUPON_ENDS_MS) es como si no existiera.
  const rawCoupon = String(couponCode || '').trim().toUpperCase();
  const normalizedCoupon = isCouponActive(rawCoupon) ? rawCoupon : '';
  const bundle = COUPON_BUNDLES[normalizedCoupon] || null;
  const couponDiscount = bundle ? 0 : COUPONS[normalizedCoupon] || 0;
  const couponApplied = bundle || couponDiscount > 0 ? normalizedCoupon : null;

  // El 10 % por volumen aplica a calcos sueltos cuando el carrito suma ≥ 10
  // calcos TOTALES (se pueden combinar tamaños) Y el pago es por transferencia.
  const stickerUnits = clean
    .filter((i) => i.id.startsWith('sticker:'))
    .reduce((a, i) => a + i.quantity, 0);
  const bulkDiscount =
    !bundle && stickerUnits >= BULK_THRESHOLD && paymentMethod === BULK_DISCOUNT_PAYMENT_METHOD ? BULK_DISCOUNT : 0;

  // Durante la promo 3x2 el % (cupón + transferencia) queda topeado en
  // PROMO_PERCENT_CAP (10 %); fuera de la promo, el tope es MAX_STICKER_DISCOUNT.
  const promoActive = isPromoActive();
  const cap = promoActive ? PROMO_PERCENT_CAP : MAX_STICKER_DISCOUNT;
  const percentRate = Math.min(bulkDiscount + couponDiscount, cap);

  // Pre-pass: base de lista + validaciones de forma de cada línea.
  const bases = [];
  for (const item of clean) {
    const lb = lineBase(item.id, item.quantity);
    if (lb.error) {
      return { ok: false, error: 'item_invalid', detail: lb.error };
    }
    bases.push(lb);
  }

  // N x M: bolsa común de unidades elegibles (sticker + custom), se regalan las
  // más baratas de cada `buy` → keepFraction uniforme por línea. Vale el bundle
  // del cupón (2x1) y, si no hay, la promo 3x2 por fecha.
  const grouping = bundle || (promoActive ? { buy: PROMO_BUY, pay: PROMO_PAY } : null);
  let keepFraction = 1;
  if (grouping) {
    const unitBasePrices = [];
    clean.forEach((item, idx) => {
      if (bases[idx].discountable) {
        for (let k = 0; k < item.quantity; k++) unitBasePrices.push(bases[idx].base);
      }
    });
    keepFraction = promo3x2(unitBasePrices, grouping.buy, grouping.pay).keepFraction;
  }

  const priced = [];
  for (let idx = 0; idx < clean.length; idx++) {
    const item = clean[idx];
    const lb = bases[idx];
    let expected;
    if (!lb.discountable) {
      expected = lb.base; // packs / negocio / fijos: ya traen su precio final.
    } else if (grouping) {
      // Elegibles (catálogo + personalizados): N x M y luego el % (0 con bundle).
      expected = round(lb.base * keepFraction * (1 - percentRate));
    } else if (lb.kind === 'sticker') {
      // Fuera de promo, el cupón/transferencia solo tocan calcos de catálogo.
      expected = round(lb.base * (1 - percentRate));
    } else {
      expected = lb.base; // custom fuera de promo: precio por volumen, sin cupón.
    }
    if (expected !== item.unitPrice) {
      console.warn(
        `[pricing] precio adulterado o desactualizado en "${item.id}": ` +
          `recibido ${item.unitPrice}, esperado ${expected}`
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
      unit_price: expected,
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
    methodValue,
    couponApplied
  };
}
