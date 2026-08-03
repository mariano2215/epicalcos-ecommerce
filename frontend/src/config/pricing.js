/**
 * Reglas comerciales de EPICALCOS — un solo lugar para editar precios y descuentos.
 */

/** Tamaños disponibles por calco y su precio unitario (ARS). Precio de vidriera = Mercado Pago (sin descuento). */
export const SIZES = [
  { id: '4cm', label: '4 cm', price: 1200 },
  { id: '6cm', label: '6 cm', price: 1600 },
  { id: '9cm', label: '9 cm', price: 2000 }
];

export const DEFAULT_SIZE = '6cm';

/**
 * Descuento por volumen en calcos sueltos: desde 10 calcos TOTALES (se pueden
 * combinar tamaños), 10 % off — pero SOLO pagando por transferencia bancaria.
 * Pagando con Mercado Pago el precio es siempre el de vidriera (sin descuento).
 */
export const BULK_THRESHOLD = 10;
export const BULK_DISCOUNT = 0.10;
export const BULK_DISCOUNT_PAYMENT_METHOD = 'transferencia';

/**
 * Cupones de descuento sobre calcos sueltos (mismo alcance que el descuento por
 * volumen: solo type === 'sticker'). Un cupón de % es ACUMULABLE con el
 * descuento por transferencia: los descuentos se SUMAN (ej. transferencia 10 %
 * + EPICA10 10 % = 20 % off), con un tope de seguridad (MAX_STICKER_DISCOUNT).
 *
 * Un cupón con `bundle` NO es de %: aplica un "N x M" (cada `buy` unidades
 * elegibles, las `buy - pay` más baratas gratis) sobre calcos de catálogo +
 * personalizados, y NO es acumulable con NINGÚN %: mientras esté aplicado no
 * corren ni el 10 % por transferencia ni el 10 % por volumen (+10 calcos) ni
 * otro cupón.
 *
 * `hidden: true` = el código NO se nombra en ninguna pantalla del sitio (ni
 * banners, ni carrito, ni checkout). HOY LOS DOS CUPONES SON OCULTOS: EPICA10
 * es solo para quien deja su mail en el popup de bienvenida (se lo muestra el
 * popup y se autocompleta en el checkout) y EMOJI50 se pasa a mano por mensaje
 * privado. El sitio los sigue aceptando si el cliente los escribe: "oculto" es
 * no publicitarlos, no un secreto criptográfico (viajan en el bundle JS).
 *
 * ⚠️ ESPEJO OBLIGATORIO en netlify/functions/lib/pricing.js (COUPONS y
 * COUPON_BUNDLES). Si agregás o cambiás un cupón acá, cambialo TAMBIÉN allá o
 * el checkout se rechaza con `price_mismatch`.
 */
export const COUPONS = {
  EPICA10: { discount: 0.10, label: 'Bienvenida 10% OFF', hidden: true },
  EMOJI50: { discount: 0, bundle: { buy: 2, pay: 1 }, label: '2x1 en calcos', hidden: true }
};
export const MAX_STICKER_DISCOUNT = 0.9;

export function findCoupon(code) {
  return COUPONS[String(code || '').trim().toUpperCase()] || null;
}

/** Bundle (N x M) del cupón, si es de ese tipo. Null para los cupones de %. */
export function couponBundle(code) {
  return findCoupon(code)?.bundle || null;
}

/**
 * ─── PROMO 3x2 (por tiempo limitado) ──────────────────────────────────────────
 * "3x2 en TODAS las calcos": cada 3 calcos elegibles, la MÁS BARATA gratis.
 * Alcance: calcos de catálogo (type 'sticker') + personalizados (type 'custom').
 * NO incluye packs mayoristas ni la promo Negocio.
 *
 * ACUMULABLE con un cupón de % (EPICA10), pero durante la promo el descuento en
 * % está topeado en `percentCap` (10 %): el cupón y el 10 % por transferencia NO se
 * suman por encima de ese tope (fuera de la promo, el tope sigue siendo
 * MAX_STICKER_DISCOUNT y el cupón sí se suma a la transferencia como siempre).
 *
 * Se auto-desactiva por fecha (sin cron): cuando `Date.now() > PROMO_END_MS`,
 * los precios, el banner y el contador vuelven solos a la normalidad.
 *
 * ⚠️ ESPEJO OBLIGATORIO: `PROMO_END_MS`, `percentCap` y la función `promo3x2`
 * están espejados en `netlify/functions/lib/pricing.js`. Si cambiás algo acá,
 * cambialo TAMBIÉN allá o el checkout se rechaza con `price_mismatch`.
 * El test `src/lib/promoPricing.test.js` verifica que ambos lados coincidan.
 */
export const PROMO_3X2 = {
  /** Fin de la promo, en hora de Argentina (UTC−03:00). Inclusive: termina al cerrar el domingo. */
  endsAt: '2026-07-26T23:59:59-03:00',
  buy: 3,
  pay: 2,
  /** Tope del descuento en % durante la promo (transferencia + cupón no superan esto). */
  percentCap: 0.10
  // Ojo: NO agregar acá el código de un cupón para mostrarlo en el banner —
  // los cupones son ocultos (ver COUPONS arriba).
};

export const PROMO_END_MS = Date.parse(PROMO_3X2.endsAt);

/** ¿La promo 3x2 está vigente en este instante? */
export function isPromoActive(now = Date.now()) {
  return Number.isFinite(PROMO_END_MS) && now <= PROMO_END_MS;
}

/**
 * N x M sobre una "bolsa" de unidades elegibles (cada `buy`, se regalan las
 * `buy - pay` más baratas). Genérica: la usa la promo 3x2 por fecha y también
 * el cupón de bundle (EMOJI50 = 2x1).
 * Devuelve el ahorro y `keepFraction` = fracción del
 * subtotal elegible que efectivamente SE PAGA. Se aplica uniforme a cada línea
 * (así el precio por unidad queda POSITIVO y verificable idéntico en el server;
 * Mercado Pago no admite líneas con precio ≤ 0, por eso no se manda un ítem de
 * descuento negativo).
 *
 * @param {{ unitBasePrices: number[], buy?: number, pay?: number }} args
 * @returns {{ freeUnits: number, discount: number, keepFraction: number }}
 */
export function promo3x2({ unitBasePrices, buy = PROMO_3X2.buy, pay = PROMO_3X2.pay }) {
  const n = unitBasePrices.length;
  const eligibleBase = unitBasePrices.reduce((a, b) => a + b, 0);
  const freeUnits = Math.floor(n / buy) * (buy - pay);
  if (eligibleBase <= 0 || freeUnits <= 0) {
    return { freeUnits: 0, discount: 0, keepFraction: 1 };
  }
  // Se regalan las MÁS BARATAS: ordenar asc y sumar las primeras `freeUnits`.
  const sorted = [...unitBasePrices].sort((a, b) => a - b);
  let discount = 0;
  for (let k = 0; k < freeUnits; k++) discount += sorted[k];
  return { freeUnits, discount, keepFraction: (eligibleBase - discount) / eligibleBase };
}

/** Clave de localStorage donde el popup de bienvenida guarda el código para prellenarlo en el checkout. */
export const WELCOME_COUPON_STORAGE_KEY = 'epicalcos.welcomeCoupon';

/** Clave de sessionStorage donde el checkout guarda la spec de los personalizados para el CTA de WhatsApp en /pago-exitoso. */
export const CUSTOM_SPEC_STORAGE_KEY = 'epicalcos.customSpec';

/** Pack mayorista: DESDE 100 calcos (mínimo, sin tope), 50 % off en todos los tamaños. */
export const WHOLESALE_QTY = 100;
export const WHOLESALE_DISCOUNT = 0.5;

/** Personalizados: mínimo 10 calcos, 10 % off ya incluido. */
export const PERSONALIZADOS_MIN = 10;
export const PERSONALIZADOS_DISCOUNT = 0.10;

/**
 * Promo Negocio: 100 calcos de un solo diseño en 6 cm, precio fijo.
 * `listPrice` es el precio de lista tachado (solo display, no se cobra);
 * `price` es el que viaja al checkout y está espejado en netlify/functions/lib/pricing.js.
 */
export const NEGOCIO = { qty: 100, size: '6cm', price: 39999, listPrice: 96999 };

/** Productos de precio fijo. */
export const TATUAJES = { id: 'tatuajes-hoja', name: 'Tatuajes temporales · x hoja', price: 12000 };
/**
 * Fotos Polaroid: pack de 10 fotos en 3 tamaños. El id que viaja al carrito es
 * `polaroid-x10-{size.id}` (espejado en netlify/functions/lib/pricing.js).
 * `POLAROID.price` queda como precio de referencia para el feed de Meta (mediana).
 */
export const POLAROID_SIZES = [
  { id: '5x8',  label: '5 × 8 cm',  tag: 'Mini',                        price: 9000 },
  { id: '7x10', label: '7 × 10 cm', tag: 'Medianas',                    price: 12000 },
  { id: '9x13', label: '9 × 13 cm', tag: 'Grandes · Polaroid original', price: 15000 }
];
export const POLAROID = { id: 'polaroid-x10', name: 'Fotos Polaroid · x10', price: 12000 };

export function priceForSize(sizeId) {
  return SIZES.find((s) => s.id === sizeId)?.price ?? SIZES[0].price;
}

export function sizeLabel(sizeId) {
  return SIZES.find((s) => s.id === sizeId)?.label ?? sizeId;
}

/** Redondeo a entero (los precios base son redondos, así MP recibe enteros limpios). */
export const round = (n) => Math.round(n);
