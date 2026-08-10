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
 * banners, ni carrito, ni checkout). HOY EL ÚNICO CUPÓN VIVO ES EPICA10, y es
 * oculto: solo para quien deja su mail en el popup de bienvenida (se lo muestra
 * el popup y se autocompleta en el checkout). El sitio lo sigue aceptando si el
 * cliente lo escribe: "oculto" es no publicitarlo, no un secreto criptográfico
 * (viaja en el bundle JS).
 *
 * `endsAt` = fecha de vencimiento (hora Argentina, inclusive). Pasado ese
 * instante el cupón deja de existir para todo el sitio: no se aplica en el
 * carrito ni en el checkout (que responde "no existe o venció") y el servidor
 * tampoco lo acepta. EMOJI50 (2x1 por mensaje privado) se apaga solo el martes
 * 4/8/2026 a las 23:59; no hace falta tocar nada ese día.
 *
 * ⚠️ ESPEJO OBLIGATORIO en netlify/functions/lib/pricing.js (COUPONS,
 * COUPON_BUNDLES y COUPON_ENDS_MS). Si agregás, vencés o cambiás un cupón acá,
 * cambialo TAMBIÉN allá o el checkout se rechaza con `price_mismatch`.
 */
export const COUPONS = {
  EPICA10: { discount: 0.10, label: 'Bienvenida 10% OFF', hidden: true },
  EMOJI50: {
    discount: 0,
    bundle: { buy: 2, pay: 1 },
    label: '2x1 en calcos',
    hidden: true,
    endsAt: '2026-08-04T23:59:59-03:00'
  }
};
export const MAX_STICKER_DISCOUNT = 0.9;

/** ¿El cupón sigue vigente en este instante? Sin `endsAt`, no vence nunca. */
export function isCouponActive(coupon, now = Date.now()) {
  if (!coupon?.endsAt) return true;
  const end = Date.parse(coupon.endsAt);
  return !Number.isFinite(end) || now <= end;
}

/** El cupón, si existe Y no venció. Null en cualquier otro caso. */
export function findCoupon(code, now = Date.now()) {
  const coupon = COUPONS[String(code || '').trim().toUpperCase()] || null;
  return coupon && isCouponActive(coupon, now) ? coupon : null;
}

/** Bundle (N x M) del cupón, si es de ese tipo y sigue vigente. Null si no. */
export function couponBundle(code, now = Date.now()) {
  return findCoupon(code, now)?.bundle || null;
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

/**
 * ─── PROMO MAYORISTA: 100 CALCOS A $39.999 (por tiempo limitado) ──────────────
 * En /mayorista, un pack de EXACTAMENTE 100 calcos a precio fijo $39.999. Los
 * 100 pueden ser 100 diseños DISTINTOS (catálogo) y/o diseños propios subidos
 * en el mismo armador.
 *
 * SOLO en 4 y 6 cm: si el cliente elige 9 cm, el armador vuelve solo al pack
 * mayorista de siempre (desde 100 calcos, 50 % off, sin tope).
 *
 * ⚠️ NO confundir con la Promo Negocio (`NEGOCIO`, más abajo): esa es 100
 * calcos de UN SOLO diseño (el logo del cliente) en 6 cm, y sigue viva aparte.
 *
 * La línea que viaja al carrito es `pack:mayorista100:{size}:{ts}` con
 * quantity = 1 (1 línea = 1 pack de 100) y basePrice = `price`. No participa de
 * cupones, del 10 % por transferencia ni de promos N x M (como todo pack).
 *
 * Se auto-desactiva por fecha (sin cron): pasado `endsAt` el armador vuelve al
 * pack normal, el banner y el contador desaparecen y el servidor deja de
 * aceptar la línea.
 *
 * ⚠️ ESPEJO OBLIGATORIO en netlify/functions/lib/pricing.js (MAYORISTA100_*).
 * El test `src/lib/promoPricing.test.js` verifica que ambos lados coincidan.
 */
export const PROMO_MAYORISTA_100 = {
  /** Fin de la promo, hora Argentina (UTC−03:00). Inclusive: termina al cerrar el viernes 14/8. */
  endsAt: '2026-08-14T23:59:59-03:00',
  qty: 100,
  price: 39999,
  /** Tamaños habilitados. El 9 cm queda afuera a propósito. */
  sizes: ['4cm', '6cm']
};

export const PROMO_MAYORISTA_END_MS = Date.parse(PROMO_MAYORISTA_100.endsAt);

/** ¿La promo de 100 calcos a $39.999 está vigente en este instante? */
export function isMayoristaPromoActive(now = Date.now()) {
  return Number.isFinite(PROMO_MAYORISTA_END_MS) && now <= PROMO_MAYORISTA_END_MS;
}

/** ¿Ese tamaño entra en la promo? (4 y 6 cm sí, 9 cm no). */
export function isMayoristaPromoSize(sizeId) {
  return PROMO_MAYORISTA_100.sizes.includes(sizeId);
}

/** Precio de lista de las 100 calcos en ese tamaño (para el tachado). */
export function mayoristaPromoListPrice(sizeId) {
  return priceForSize(sizeId) * PROMO_MAYORISTA_100.qty;
}

/** % de descuento real de la promo contra el precio de lista de ese tamaño. */
export function mayoristaPromoOff(sizeId) {
  return Math.round((1 - PROMO_MAYORISTA_100.price / mayoristaPromoListPrice(sizeId)) * 100);
}

/**
 * ─── PACKS CON EL ENVÍO INCLUIDO ──────────────────────────────────────────────
 * Tipos de línea `pack:{tipo}:…` que se llevan el envío puesto: mientras haya
 * una de estas líneas en el carrito, el envío vale 0 sin importar la zona ni el
 * subtotal.
 *
 * POR QUÉ: la oferta más agresiva del año (100 calcos a $39.999) terminaba
 * pagando $8.500 de Correo Argentino al interior. El cliente leía el precio
 * grande y después la letra chica, que es exactamente la forma de perder la
 * venta en el último paso.
 *
 * ⚠️ ESPEJO OBLIGATORIO en netlify/functions/lib/pricing.js
 * (FREE_SHIPPING_PACK_TYPES). El servidor NUNCA confía en el flag que manda el
 * cliente: lo deriva del id de la línea, igual que el precio. Si acá agregás un
 * tipo y allá no, el checkout muestra $0 y Mercado Pago cobra el envío igual.
 * El test `src/lib/envio.test.js` verifica la paridad.
 */
export const FREE_SHIPPING_PACK_TYPES = ['mayorista', 'mayorista100'];

/** ¿El id de esta línea es un pack que trae el envío incluido? */
export function packIncludesShipping(lineId) {
  const parts = String(lineId || '').split(':');
  return parts[0] === 'pack' && FREE_SHIPPING_PACK_TYPES.includes(parts[1]);
}

/**
 * ¿Esta línea del carrito trae el envío incluido?
 *
 * Mira el flag `envioGratis` que le pone `addPack`, pero cae al id si no está:
 * un carrito guardado en localStorage ANTES de este cambio no tiene el flag, y
 * sin el fallback el cliente vería el envío cobrado hasta vaciar el carrito.
 */
export function lineaConEnvioGratis(line) {
  return line?.envioGratis === true || packIncludesShipping(line?.id);
}

/**
 * ─── ESCALERA DE PACKS DE CATÁLOGO (/armar-pack) ──────────────────────────────
 * Los escalones x10 / x20 / x50. El x100 NO está acá: tiene regla propia en el
 * servidor (mayorista 50 % off, o la promo de precio fijo) y su card se arma
 * aparte en la página, porque el copy y el precio dependen de la promo.
 *
 * `ocultarDurantePromo` = mientras la promo de 100 calcos a precio fijo esté
 * viva, ese escalón NO se muestra. Con 100 calcos a $39.999, un pack de 20 o de
 * 50 al precio de lista sale MÁS y trae MENOS producto (el x50 son $72.000 por
 * la mitad de calcos): deja la escalera dada vuelta y destruye el ancla del
 * calco suelto. Se OCULTAN, no se borran — cuando la promo vence vuelven solos.
 */
export const CATALOG_PACKS = [
  {
    qty: 10,
    label: 'Para empezar',
    tagline: 'El mínimo para que arranque el descuento por volumen.'
  },
  {
    qty: 20,
    label: 'Más variedad',
    tagline: 'Alcanza para llenar la notebook y el termo, y regalar algunas.',
    destacado: true,
    ocultarDurantePromo: true
  },
  {
    qty: 50,
    label: 'Para fanáticos',
    tagline: 'Cincuenta diseños distintos, o los que más te gustan repetidos.',
    ocultarDurantePromo: true
  }
];

/** Cantidades que tienen armador propio en /armar-pack?n=… (todas, aunque su card esté oculta). */
export const CATALOG_PACK_QTYS = CATALOG_PACKS.map((p) => p.qty);

/**
 * Los escalones que se muestran ahora mismo. Con la promo activa queda solo el
 * x10; al vencer vuelven los tres. El armador `?n=20` / `?n=50` sigue andando
 * siempre: ocultar la card no es romperle el link a quien ya lo tenía guardado.
 */
export function visibleCatalogPacks(promoMayoristaActiva) {
  return CATALOG_PACKS.filter((p) => !(promoMayoristaActiva && p.ocultarDurantePromo));
}

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

/**
 * ─── ARCHIVOS IMPRIMIBLES (producto DIGITAL) ─────────────────────────────────
 * Packs de archivos listos para imprimir. NO se produce, NO se envía y NO se
 * entrega en mano: llega POR MAIL a la casilla que el cliente deja en el checkout.
 *
 * Precio FIJO SIEMPRE: la línea `digital:{id}` no participa de NINGÚN descuento
 * —ni cupones, ni el 10 % por transferencia, ni el 10 % por volumen, ni las
 * promos N x M (3x2 / 2x1)— ni suma para el envío gratis. Un archivo no tiene
 * costo marginal ni logística, así que regalarlo dentro de un 3x2 o usarlo para
 * cruzar el umbral de envío gratis sería plata perdida.
 *
 * Cantidad SIEMPRE 1: comprar el mismo archivo dos veces no tiene sentido, así
 * que `addDigital` (CartContext) no acumula la línea si ya está en el carrito.
 *
 * ⚠️ ESPEJO OBLIGATORIO en netlify/functions/lib/pricing.js (DIGITAL_PRICES) y,
 * para el link de descarga que va en el mail, en netlify/functions/lib/digital.js.
 * El test `src/lib/promoPricing.test.js` verifica que los precios coincidan.
 */
export const IMPRIMIBLES = [
  {
    id: 'pack-stickers',
    /** Nombre que ve el cliente (carrito, checkout, mail y CRM). */
    name: 'Pack de stickers imprimibles',
    price: 5999,
    /**
     * Cantidad de diseños del pack — es EL argumento de venta de la card.
     * ⚠️ Poné acá el número real: se muestra en la página, en el Home y en el
     * catálogo de Meta. Si lo dejás en null, la card no promete ninguna cantidad.
     */
    disenos: null,
    emoji: '🖨️',
    /** Formato de los archivos que recibe (se listan en la ficha del producto). */
    formatos: 'PNG y PDF listos para imprimir',
    /** Qué recibe, en una línea, para el carrito y el mail. */
    resumen: 'Archivos digitales — te llegan por mail'
  }
];

/** El pack principal: el que se muestra como card grande en /archivos-imprimibles. */
export const IMPRIMIBLE_PRINCIPAL = IMPRIMIBLES[0];

/** Un pack digital por id (null si no existe). */
export function findImprimible(id) {
  return IMPRIMIBLES.find((p) => p.id === id) || null;
}

export function priceForSize(sizeId) {
  return SIZES.find((s) => s.id === sizeId)?.price ?? SIZES[0].price;
}

export function sizeLabel(sizeId) {
  return SIZES.find((s) => s.id === sizeId)?.label ?? sizeId;
}

/** Redondeo a entero (los precios base son redondos, así MP recibe enteros limpios). */
export const round = (n) => Math.round(n);
