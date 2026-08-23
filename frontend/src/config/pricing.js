/**
 * Reglas comerciales de EPICALCOS — un solo lugar para editar precios y descuentos.
 */
import { formatPrice } from '../lib/formato.js';

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
 * `exclusivo: true` = un cupón de % que NO se acumula con nada, igual que un
 * bundle: mientras esté aplicado no corren el 10 % por transferencia, el 10 %
 * por volumen, el % de una promo por categoría ni la agrupación N x M de una
 * promo por fecha. Su % es el descuento final y no depende del medio de pago
 * ni de la cantidad.
 *
 * POR QUÉ ES UN FLAG Y NO UN TOPE MÁS BAJO: el tope (MAX_STICKER_DISCOUNT) es
 * una red de seguridad, no una regla de negocio. Usarlo para "que no pase de
 * 50" haría que el descuento real cambie según cómo pague el cliente — y lo
 * que se prometió por privado es 50 %, siempre.
 *
 * `incluyeCustom: true` = el % también alcanza a los personalizados sueltos
 * (líneas `custom`), que fuera de una promo N x M no participan de ningún
 * cupón. Es opt-in por cupón para no cambiarle el precio a EPICA10.
 *
 * `hidden: true` = el código NO se nombra en ninguna pantalla del sitio (ni
 * banners, ni carrito, ni checkout). LOS DOS CUPONES VIVOS SON OCULTOS:
 * EPICA10 se entrega a quien deja su mail en el popup de bienvenida (se lo
 * muestra el popup y se autocompleta en el checkout), y EPI50 lo manda Mariano
 * a mano por privado. El sitio los acepta igual si el cliente los escribe:
 * "oculto" es no publicitarlo, no un secreto criptográfico (viaja en el bundle
 * JS). De ahí que EPI50 tenga interruptor: ver `activa`.
 *
 * `endsAt` = fecha de vencimiento (hora Argentina, inclusive). Pasado ese
 * instante el cupón deja de existir para todo el sitio: no se aplica en el
 * carrito ni en el checkout (que responde "no existe o venció") y el servidor
 * tampoco lo acepta. Sin `endsAt`, no vence nunca.
 *
 * `activa: false` = interruptor manual, aparte del vencimiento. Existe para los
 * cupones SIN fecha: un 50 % reutilizable que se filtra no se apaga solo. Vive
 * dentro de `isCouponActive()` —el único filtro por el que pasan `findCoupon` y
 * `couponBundle`— justo para que apagarlo sea UNA línea de cada lado y el cupón
 * desaparezca a la vez del carrito, del checkout y del servidor.
 *
 * EMOJI50 (2x1 por mensaje privado) venció el 4/8/2026 y se sacó de acá: era
 * una entrada muerta. El MOTOR de bundles sigue intacto — para prender otro
 * alcanza con agregar `bundle: { buy, pay }` acá y en COUPON_BUNDLES del server.
 *
 * ⚠️ ESPEJO OBLIGATORIO en netlify/functions/lib/pricing.js (COUPONS,
 * COUPON_BUNDLES y COUPON_ENDS_MS). Si agregás, vencés o cambiás un cupón acá
 * —incluidos `discount`, `exclusivo`, `incluyeCustom` y `activa`— cambialo
 * TAMBIÉN allá o el checkout se rechaza con `price_mismatch`. El test
 * `promoPricing.test.js` compara las dos tablas campo por campo.
 */
export const COUPONS = {
  EPICA10: { discount: 0.10, label: 'Bienvenida 10% OFF', hidden: true },
  /**
   * 50 % off por menor, para mandar POR PRIVADO (spec 009). Alcanza calcos de
   * catálogo y personalizados sueltos; los packs, negocio, fijos y digitales
   * quedan afuera solos, porque no participan de ningún % (ver `lineBase` del
   * servidor).
   *
   * ⚠️ Baja el subtotal, así que ALEJA del envío gratis: con 50 % off hace
   * falta el DOBLE de precio de lista para cruzar el umbral de la zona
   * ($70.000 en Rosario, $100.000 en el resto del país). Es correcto según la
   * regla de envíos y está aceptado en specs/009-cupon-epi50 §9.1 — no se
   * arregla regalando el envío (hay precedente de lo que costó ese atajo, más
   * abajo en este mismo archivo).
   */
  EPI50: {
    discount: 0.50,
    label: '50% OFF',
    hidden: true,
    exclusivo: true,
    incluyeCustom: true,
    activa: true
  }
};
export const MAX_STICKER_DISCOUNT = 0.9;

/**
 * ¿El cupón sigue vigente en este instante? Sin `endsAt`, no vence nunca —
 * pero `activa: false` lo apaga igual, sin tocar ninguna fecha.
 */
export function isCouponActive(coupon, now = Date.now()) {
  if (coupon?.activa === false) return false;
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
 * ¿Este cupón anula TODOS los demás descuentos?
 *
 * Es el predicado que decide, en un solo lugar, los tres puntos donde el
 * carrito y el servidor se preguntan lo mismo: si corre el 10 % por
 * transferencia/volumen, si corre la agrupación N x M de una promo por fecha y
 * si corre el % de una promo por categoría. Antes el código preguntaba
 * `!bundle` en los tres; ahora un cupón `exclusivo` entra por la misma puerta.
 */
export function couponAnulaTodo(code, now = Date.now()) {
  const coupon = findCoupon(code, now);
  return Boolean(coupon?.bundle || coupon?.exclusivo);
}

/** ¿El % de este cupón alcanza también a los personalizados sueltos (`custom`)? */
export function couponIncluyeCustom(code, now = Date.now()) {
  return Boolean(findCoupon(code, now)?.incluyeCustom);
}

/**
 * ─── PROMO 3x2 — VIVA del jue 20/8 23:00 al lun 24/8 23:59 de 2026 ───────────
 *
 * "3x2 en TODAS las calcos": cada 3 calcos elegibles, la MÁS BARATA gratis.
 * Alcance: calcos de catálogo (type 'sticker') + personalizados (type 'custom')
 * — o sea, todo lo minorista. NO incluye packs, mayorista, Negocio, productos
 * de precio fijo ni digitales: esas líneas ya traen su precio final.
 *
 * TIENE FECHA DE INICIO, no solo de fin. La promo arranca a las 23:00 de un
 * jueves y nadie va a estar deployando a esa hora: `isPromoActive()` mira las
 * DOS puntas, así que alcanza con deployar antes y la promo se enciende y se
 * apaga sola. Antes de `startsAt` el precio válido sigue siendo el de lista —
 * si mirara solo el fin, deployar hoy la prendería en el acto.
 *
 * ACUMULA con el 10 % por transferencia y con NADA MÁS. Los cupones de % NO se
 * combinan con la promo (decisión de Mariano, 20/8/2026): mientras la promo
 * corre, un cupón como EPICA10 no suma nada — ver `couponRate` en
 * CartContext.pricedItems y en validateAndPriceOrder. `percentCap` (10 %) es el
 * techo del % que puede correr encima del 3x2, y hoy el único que llega ahí es
 * el de transferencia.
 *
 * EPI50 es la excepción, y no por un caso especial: es `exclusivo`, así que
 * anula la agrupación N x M entera y corre solo su 50 %. Quien tiene ese código
 * no ve 3x2; ve mitad de precio.
 *
 * ⚠️ ESPEJO OBLIGATORIO: `PROMO_START_MS`, `PROMO_END_MS`, `percentCap` y la
 * función `promo3x2` están espejados en `netlify/functions/lib/pricing.js`. Si
 * cambiás algo acá, cambialo TAMBIÉN allá o el checkout se rechaza con
 * `price_mismatch`. El test `src/lib/promoPricing.test.js` verifica que ambos
 * lados coincidan, en los cuatro bordes de la ventana.
 */
export const PROMO_3X2 = {
  /** Arranca el jueves 20/8 a las 23:00, hora Argentina (UTC−03:00). */
  startsAt: '2026-08-20T23:00:00-03:00',
  /** Fin de la promo, hora Argentina. Inclusive: termina al cerrar el lunes. */
  endsAt: '2026-08-24T23:59:59-03:00',
  buy: 3,
  pay: 2,
  /** Tope del descuento en % que corre ENCIMA del 3x2 (hoy: solo transferencia). */
  percentCap: 0.10
  // Ojo: NO agregar acá el código de un cupón para mostrarlo en el banner —
  // los cupones son ocultos (ver COUPONS arriba).
};

export const PROMO_START_MS = Date.parse(PROMO_3X2.startsAt);
export const PROMO_END_MS = Date.parse(PROMO_3X2.endsAt);

/** ¿La promo 3x2 está vigente en este instante? Mira las dos puntas. */
export function isPromoActive(now = Date.now()) {
  return (
    Number.isFinite(PROMO_START_MS) &&
    Number.isFinite(PROMO_END_MS) &&
    now >= PROMO_START_MS &&
    now <= PROMO_END_MS
  );
}

/**
 * N x M sobre una "bolsa" de unidades elegibles (cada `buy`, se regalan las
 * `buy - pay` más baratas). Genérica: la usa la promo 3x2 por fecha y también
 * un cupón de bundle, si hay alguno vivo.
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
const MAYORISTA100_QTY = 100;
const MAYORISTA100_PRICE = 39999;

/**
 * EL objeto de la promo: economía (qty/price/sizes/endsAt), interruptor
 * (`activa`) y copy (`titulo`/`subtitulo`) en un solo lugar. La barra del
 * header, la card del hero, el cartel de /mayorista, el blurb de /categorias y
 * el filtro de packs de /armar-pack leen TODOS de acá. Antes cada uno tenía su
 * propio texto y su propia fecha escrita a mano.
 *
 * La FECHA de cierre nunca se escribe: se deriva de `endsAt` con `endLabel()`.
 */
export const PROMO_MAYORISTA_100 = {
  id: 'mayorista100',
  /**
   * Interruptor manual, aparte del vencimiento. Sirve para bajar la promo antes
   * de tiempo sin tocar la fecha (y para volver a subirla sin recordar cuál era).
   * ⚠️ ESPEJADO en netlify/functions/lib/pricing.js (MAYORISTA100_ACTIVA): si acá
   * queda en false y allá no, el servidor sigue aceptando la línea del pack.
   */
  activa: true,
  /** Fin de la promo, hora Argentina (UTC−03:00). Inclusive: termina al cerrar ese día. */
  endsAt: '2026-08-14T23:59:59-03:00',
  qty: MAYORISTA100_QTY,
  price: MAYORISTA100_PRICE,
  /** Tamaños habilitados. El 9 cm queda afuera a propósito. */
  sizes: ['4cm', '6cm'],
  /** Copy. El precio sale del config, no escrito a mano. */
  titulo: `${MAYORISTA100_QTY} CALCOS A ${formatPrice(MAYORISTA100_PRICE)}`,
  subtitulo: `Elegís los ${MAYORISTA100_QTY} diseños · 4 y 6 cm`
};

export const PROMO_MAYORISTA_END_MS = Date.parse(PROMO_MAYORISTA_100.endsAt);

/** ¿La promo de 100 calcos a precio fijo está vigente en este instante? */
export function isMayoristaPromoActive(now = Date.now()) {
  return (
    PROMO_MAYORISTA_100.activa &&
    Number.isFinite(PROMO_MAYORISTA_END_MS) &&
    now <= PROMO_MAYORISTA_END_MS
  );
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
 * El % más alto que alcanza la promo entre sus tamaños — el "HASTA 75% OFF" de
 * la card del hero. Derivado: escrito a mano, un cambio de precio dejaba el
 * cartel prometiendo un descuento que ya no existía.
 */
export function mayoristaPromoOffMax() {
  return Math.max(...PROMO_MAYORISTA_100.sizes.map(mayoristaPromoOff));
}

/**
 * ─── PROMO POR CATEGORÍA — ARGENTINA 50 % OFF ─────────────────────────────────
 *
 * Lunes 17, martes 18 y miércoles 19 de agosto de 2026: todos los calcos de
 * catálogo de la categoría `argentina` a mitad de precio.
 *
 * Es la primera promo con FECHA DE INICIO además de vencimiento — las otras
 * arrancan al deployarse. Por eso `isArgentinaPromoActive()` mira las dos
 * puntas: antes del lunes el precio tiene que seguir siendo el de lista.
 *
 * ACUMULA con el resto de los %: se SUMA al 10 % por transferencia y al cupón,
 * con el tope de seguridad MAX_STICKER_DISCOUNT (decisión de Mariano, 11/8/2026
 * — un calco de Argentina puede terminar 60 % off pagando por transferencia con
 * EPICA10). Los packs, negocio y fijos quedan afuera: ya traen su precio final.
 *
 * ⚠️ ESPEJO OBLIGATORIO en netlify/functions/lib/pricing.js
 * (PROMO_ARGENTINA / esPromoArgentina). Si cambiás el %, la categoría o las
 * fechas acá y no allá, TODO checkout con un calco de Argentina se rechaza con
 * `price_mismatch`. El test `src/lib/promoPricing.test.js` verifica la paridad.
 */
export const PROMO_ARGENTINA = {
  id: 'argentina50',
  /** Interruptor manual, aparte de las fechas (mismo criterio que la mayorista). */
  activa: true,
  /** Slug de la categoría en oferta, tal como viene en catalog.json. */
  categoria: 'argentina',
  discount: 0.5,
  /** Arranca el lunes 17 a las 00:00, hora Argentina (UTC−03:00). */
  startsAt: '2026-08-17T00:00:00-03:00',
  /** Termina al cerrar el miércoles 19, inclusive. */
  endsAt: '2026-08-19T23:59:59-03:00',
  /** Copy del cartel. El % sale del config, no escrito a mano. */
  titulo: 'ARGENTINA 50% OFF',
  subtitulo: 'Toda la categoría Argentina a mitad de precio'
};

export const PROMO_ARGENTINA_START_MS = Date.parse(PROMO_ARGENTINA.startsAt);
export const PROMO_ARGENTINA_END_MS = Date.parse(PROMO_ARGENTINA.endsAt);

/** ¿La promo de Argentina está vigente en este instante? */
export function isArgentinaPromoActive(now = Date.now()) {
  return (
    PROMO_ARGENTINA.activa &&
    Number.isFinite(PROMO_ARGENTINA_START_MS) &&
    Number.isFinite(PROMO_ARGENTINA_END_MS) &&
    now >= PROMO_ARGENTINA_START_MS &&
    now <= PROMO_ARGENTINA_END_MS
  );
}

/**
 * La categoría de un id de calco del catálogo: `argentina-72` → `argentina`.
 *
 * Se saca el ÚLTIMO tramo `-{número}` y no el primero: hay 61 categorías y
 * varias tienen guiones propios (`rosario-central-77`, `coca-cola-pepsi-5`), así
 * que partir por el primer guión daría `rosario` y rompería la comparación.
 */
export function categoriaDeStickerId(stickerId) {
  return String(stickerId || '').replace(/-\d+$/, '');
}

/** ¿Esta CATEGORÍA está en promo ahora mismo? (`argentina` → sí durante la ventana). */
export function esCategoriaEnPromoArgentina(slug, now = Date.now()) {
  return isArgentinaPromoActive(now) && slug === PROMO_ARGENTINA.categoria;
}

/** ¿Este DISEÑO del catálogo está en promo ahora mismo? (`argentina-72` → sí). */
export function esStickerEnPromoArgentina(stickerId, now = Date.now()) {
  return esCategoriaEnPromoArgentina(categoriaDeStickerId(stickerId), now);
}

/**
 * ¿Esta LÍNEA del carrito entra en la promo de Argentina ahora mismo?
 *
 * Se decide por el ID de la línea y no por el campo `category` que guarda el
 * carrito: el servidor solo recibe el id, así que mirando lo mismo de los dos
 * lados el espejo no se puede desincronizar.
 */
export function esPromoArgentina(lineId, now = Date.now()) {
  const parts = String(lineId || '').split(':');
  if (parts[0] !== 'sticker') return false;
  return esStickerEnPromoArgentina(parts[1], now);
}

/**
 * Precio de VIDRIERA de un calco del catálogo: el de lista, o la mitad si está
 * en la promo de Argentina.
 *
 * "Vidriera" = lo que se muestra en la grilla y en la ficha. NO incluye el 10 %
 * por transferencia ni el cupón: esos dependen del carrito entero (medio de
 * pago, cantidad total) y se resuelven en `pricedItems`. Mostrarlos acá daría
 * un precio que después no se puede sostener con un solo calco en el carrito.
 *
 * Devuelve también el precio tachado, para poder mostrar el antes/después sin
 * que cada pantalla lo calcule por su cuenta.
 *
 * @returns {{ price: number, listPrice: number, enPromo: boolean }}
 */
export function precioVidriera(stickerId, sizeId, now = Date.now()) {
  const listPrice = priceForSize(sizeId);
  const enPromo = esStickerEnPromoArgentina(stickerId, now);
  return {
    price: enPromo ? round(listPrice * (1 - PROMO_ARGENTINA.discount)) : listPrice,
    listPrice,
    enPromo
  };
}

/**
 * Precio de VIDRIERA de una LÍNEA del carrito: el de lista, o el de la promo por
 * categoría si esa línea entra.
 *
 * Es el hermano de `precioVidriera()` —que recibe stickerId + tamaño, para la
 * grilla y la ficha— pero para lo que tiene el carrito: la línea ya armada.
 * Decide por el ID de la línea, igual que `esPromoArgentina` y que el servidor,
 * así que los dos lados miran el mismo dato y el espejo no se desincroniza.
 *
 * POR QUÉ EXISTE: sin esto, el carrito mostraba `basePrice` (el precio de
 * LISTA) mientras la grilla, la ficha y el total del checkout ya mostraban el
 * descuento. Con la promo de Argentina, el mismo calco valía $800 en la grilla,
 * $1.600 en el carrito y $800 en el checkout — el precio "subía al doble" justo
 * en la pantalla donde se decide seguir o abandonar. De regalo, la barra de
 * envío gratis prometía un umbral que el checkout no reconocía y `add_to_cart`
 * le reportaba el doble a GA4 y a Meta.
 *
 * ⚠️ NO incluye el 10 % por volumen, el cupón ni el 10 % por transferencia: esos
 * dependen del carrito ENTERO (cantidad, medio de pago) y se resuelven en
 * `pricedItems`. Mismo criterio que `precioVidriera` — ver su comentario. La
 * promo por categoría es distinta: depende SOLO del diseño, así que se puede
 * mostrar desde que el calco entra al carrito.
 *
 * ⚠️ EL RESULTADO NO SE PERSISTE NUNCA. Se deriva en cada render desde
 * `Date.now()`. Guardarlo en `basePrice` al agregar parece lo obvio y es una
 * trampa: un carrito guardado durante la promo y retomado después mandaría $800
 * cuando el servidor ya espera $1.600, y el `price_mismatch` no le trabaría esa
 * línea sino TODO el checkout. Hay precedente de ese daño en `esCustomViejo()`
 * del CartContext.
 */
export function precioVidrieraLinea(line, now = Date.now()) {
  const base = Number(line?.basePrice) || 0;
  return esPromoArgentina(line?.id, now)
    ? round(base * (1 - PROMO_ARGENTINA.discount))
    : base;
}

/**
 * ─── NO HAY PACKS CON EL ENVÍO INCLUIDO ───────────────────────────────────────
 * El envío gratis se gana de UNA sola forma: cruzando el umbral de la zona
 * (`freeShippingThresholdRosario` / `freeShippingThresholdNational` en
 * config/site.js). Ninguna promo, pack ni cupón lo regala por su cuenta.
 *
 * POR QUÉ ESTÁ ESCRITO ACÁ EN NEGATIVO: existió un `FREE_SHIPPING_PACK_TYPES`
 * (`['mayorista', 'mayorista100']`) que ponía el envío en 0 con solo tener una
 * línea de pack en el carrito, sin mirar zona ni monto. Con eso, un pedido de la
 * promo de 100 calcos a $39.999 viajó GRATIS a Buenos Aires: $8.500 de Correo
 * Argentino salidos del margen de una venta de $39.999.
 *
 * ⚠️ El umbral nacional bajó a $50.000 el 21/8/2026 (decisión de Mariano). Antes
 * eran $75.000, elegidos justamente porque abajo de eso el correo se come la
 * ganancia: con $50.000, un pedido al interior viaja gratis resignando los
 * $8.500 de Correo Argentino, o sea el 17 % de esa venta. Es una decisión
 * comercial tomada a la vista de ese número, no un descuido.
 *
 * Si mañana hace falta una promo con el envío puesto, NO se hace reponiendo este
 * atajo: se sube el precio del pack por encima del umbral, o se declara como
 * una regla de negocio propia con su spec — y se piensa antes qué pasa cuando
 * ese pack viaja a Ushuaia.
 */

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
    price: 9999,
    /**
     * Precio de lista TACHADO — solo display, no se cobra ni se manda al
     * servidor: el checkout cobra `price` y nada más. Mismo criterio que
     * `NEGOCIO.listPrice`, y por eso no necesita espejo (el servidor no lo
     * conoce ni tiene por qué).
     * ⚠️ Si lo cambiás, el % del cartel se recalcula solo — sale de
     * `imprimibleOff()`, no está escrito a mano en ninguna pantalla.
     */
    listPrice: 39999,
    /**
     * Cantidad de diseños del pack — es EL argumento de venta de la card.
     * ⚠️ Poné acá el número real: se muestra en la página, en el Home y en el
     * catálogo de Meta. Si lo dejás en null, la card no promete ninguna cantidad.
     */
    disenos: 5000,
    emoji: '🖨️',
    /** Formato de los archivos que recibe (se listan en la ficha del producto). */
    formatos: 'PNG y PDF listos para imprimir',
    /** Qué recibe, en una línea, para el carrito y el mail. */
    resumen: 'Archivos digitales — te llegan por mail'
  }
];

/** El pack principal: el que se muestra como card grande en /archivos-imprimibles. */
export const IMPRIMIBLE_PRINCIPAL = IMPRIMIBLES[0];

/**
 * % de descuento del pack contra su precio de lista. 0 si no tiene `listPrice`.
 * Derivado a propósito: escrito a mano, un cambio de precio dejaba el cartel
 * prometiendo un descuento que ya no existía (mismo problema que resolvió
 * `mayoristaPromoOff`).
 */
export function imprimibleOff(pack) {
  if (!pack?.listPrice || pack.listPrice <= pack.price) return 0;
  return Math.round((1 - pack.price / pack.listPrice) * 100);
}

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
