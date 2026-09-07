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
//
// ...salvo que el cupón sea `exclusivo` (EPI50): ese NO se acumula con nada —
// ni transferencia, ni volumen, ni promo por categoría, ni N x M por fecha— y
// `incluyeCustom` le extiende el % a los personalizados sueltos, que fuera de
// una promo N x M no participan de ningún cupón.
//
// ⚠️ Espejo de COUPONS en frontend/src/config/pricing.js, campo por campo
// (`discount`, `exclusivo`, `incluyeCustom`, `activa`). Se exporta para que
// promoPricing.test.js pueda comparar las dos tablas: si cambiás un cupón en un
// solo lado, el test falla antes de que lo haga un checkout real.
export const COUPONS = {
  EPICA10: { discount: 0.1 },
  EPI50: { discount: 0.5, exclusivo: true, incluyeCustom: true, activa: true }
};
const MAX_STICKER_DISCOUNT = 0.9;

// Cupones de BUNDLE (N x M sobre calcos de catálogo + personalizados: cada
// `buy` unidades, las `buy - pay` más baratas gratis). Un bundle NO es
// acumulable con ningún %: con uno aplicado no corren el 10 % por
// transferencia, el 10 % por volumen (+10 calcos) ni otro cupón, y pisa a la
// promo 3x2 por fecha si estuviera vigente.
//
// HOY NO HAY NINGUNO VIVO: EMOJI50 (2x1 por mensaje privado) venció el
// 4/8/2026 y se sacó. El motor queda: agregar `{ CODIGO: { buy, pay } }` acá y
// en COUPONS del frontend alcanza para prender otro.
// ⚠️ Espejo de los cupones con `bundle` en frontend/src/config/pricing.js.
export const COUPON_BUNDLES = {};

// Vencimiento de cada cupón (hora Argentina, inclusive). Pasado ese instante el
// cupón se trata como inexistente: no descuenta nada acá y el frontend tampoco
// lo aplica. Sin entrada, el cupón no vence nunca (es el caso de EPICA10 y EPI50).
// ⚠️ Espejo de `endsAt` en COUPONS del frontend (lo verifica promoPricing.test.js).
export const COUPON_ENDS_MS = {};

/**
 * ¿El cupón está vigente? Además del vencimiento mira el interruptor manual
 * `activa`, que es lo único que apaga un cupón sin fecha (EPI50).
 * ⚠️ Apagarlo SOLO en el frontend deja al servidor aceptando el precio con
 * descuento: hay que ponerlo en false en los DOS lados.
 */
export function isCouponActive(code, now = Date.now()) {
  const normalized = String(code || '').trim().toUpperCase();
  if (COUPONS[normalized]?.activa === false) return false;
  const end = COUPON_ENDS_MS[normalized];
  return !Number.isFinite(end) || now <= end;
}

// --- Espejo de la PROMO 3x2 de frontend/src/config/pricing.js ---
// "3x2 en TODAS las calcos": cada 3 calcos elegibles (sticker + custom), la más
// barata gratis.
//
// ⚠️ SIN FECHA DE FIN desde la spec 017 (7/9/2026). `null` en las dos puntas =
// arranca al deployar y no vence; se apaga con PROMO_ACTIVA. `Date.parse(null)`
// da NaN, y por eso el predicado pasó a `promoVigente()`: el viejo exigía
// Number.isFinite en las dos puntas y habría dejado la promo apagada para
// siempre.
//
// ⚠️ ACUMULA con el 10 % por transferencia Y con los cupones de %. Esto CAMBIÓ
// el 7/9/2026: hasta la spec 017 un cupón no sumaba nada mientras la promo
// corría. Por eso PROMO_PERCENT_CAP pasó de 0.1 a 0.2 — tiene que entrar el
// 10 % de transferencia más el 10 % de EPICA10.
// ⚠️ Si cambiás algo acá, cambialo TAMBIÉN en el frontend. El test
// src/lib/promoPricing.test.js verifica la paridad.
export const PROMO_ACTIVA = true;
export const PROMO_START_MS = Date.parse('2026-09-07T00:00:00-03:00');
export const PROMO_END_MS = Date.parse(null);
const PROMO_BUY = 3;
const PROMO_PAY = 2;
export const PROMO_PERCENT_CAP = 0.2;

// Espejo de promoVigente() del frontend: una punta ausente (NaN) significa "sin
// límite de ese lado".
export function promoVigente({ activa = true, startMs, endMs }, now = Date.now()) {
  if (!activa) return false;
  if (Number.isFinite(startMs) && now < startMs) return false;
  if (Number.isFinite(endMs) && now > endMs) return false;
  return true;
}

export function isPromoActive(now = Date.now()) {
  return promoVigente({ activa: PROMO_ACTIVA, startMs: PROMO_START_MS, endMs: PROMO_END_MS }, now);
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
// --- Espejo de la PROMO 2x1 POR CATEGORÍA de frontend/src/config/pricing.js ---
// Cada 2 calcos de estas categorías, la más barata gratis. Convive con el 3x2
// general: `repartoPromos` decide en qué bolsa conviene poner cada unidad.
//
// ⚠️ Si agregás o sacás una categoría acá y no en el frontend, TODO checkout
// con un calco de esa categoría se rechaza con price_mismatch.
export const CATEGORIAS_2X1 = ['anime', 'argentina', 'disney', 'frases'];
export const PROMO_2X1_ACTIVA = true;
export const PROMO_2X1_START_MS = Date.parse('2026-09-07T00:00:00-03:00');
export const PROMO_2X1_END_MS = Date.parse(null);
const PROMO_2X1_BUY = 2;
const PROMO_2X1_PAY = 1;

export function is2x1Active(now = Date.now()) {
  return promoVigente(
    { activa: PROMO_2X1_ACTIVA, startMs: PROMO_2X1_START_MS, endMs: PROMO_2X1_END_MS },
    now
  );
}

/** ¿Esta línea entra en el 2x1 por categoría? Se decide por el id, como Argentina. */
export function esPromo2x1(lineId, now = Date.now()) {
  if (!is2x1Active(now)) return false;
  const parts = String(lineId || '').split(':');
  if (parts[0] !== 'sticker') return false;
  return CATEGORIAS_2X1.includes(categoriaDeStickerId(parts[1]));
}

/**
 * Reparte las unidades elegibles entre el 2x1 por categoría y el 3x2 general,
 * quedándose con el reparto que MÁS le conviene al cliente.
 *
 * ⚠️ ESPEJO LITERAL de repartoPromos() en frontend/src/config/pricing.js. Mismo
 * orden de recorrido de `k`, mismos dos candidatos por `k`, y el desempate es
 * `>` (gana el primero encontrado) — con `>=` de un lado y `>` del otro, dos
 * repartos empatados podrían devolver `freeUnits` distintos.
 *
 * POR QUÉ NO ES "2x1 primero y el sobrante al 3x2": esa regla deja que agregar
 * un calco BAJE el total hasta $800. Ver el comentario largo del frontend y
 * specs/017-todas-las-ofertas/design.md §11.
 *
 * `g2x1` / `g3x2` en null = esa promo no corre. Se pasan desde afuera para que
 * los dos lados puedan decidir la vigencia con su propio reloj y esta función
 * quede pura.
 */
export function repartoPromos({ unidadesCategoria = [], unidadesResto = [], g2x1, g3x2 }) {
  const base = [...unidadesCategoria, ...unidadesResto].reduce((a, c) => a + c, 0);
  const vacio = { freeUnits: 0, discount: 0, keepFraction: 1 };

  if (!g2x1) {
    if (!g3x2) return vacio;
    const r = promo3x2([...unidadesCategoria, ...unidadesResto], g3x2.buy, g3x2.pay);
    return { ...r, keepFraction: base > 0 ? (base - r.discount) / base : 1 };
  }

  const b = unidadesCategoria.slice().sort((x, y) => x - y);
  let mejor = { freeUnits: 0, discount: 0 };

  for (let k = 0; k <= b.length; k++) {
    for (const pick of [b.slice(0, k), b.slice(b.length - k)]) {
      const rest = [...b];
      for (const v of pick) {
        const i = rest.indexOf(v);
        if (i >= 0) rest.splice(i, 1);
      }
      const r1 = promo3x2(pick, g2x1.buy, g2x1.pay);
      const r2 = g3x2
        ? promo3x2([...unidadesResto, ...rest], g3x2.buy, g3x2.pay)
        : { freeUnits: 0, discount: 0 };
      const discount = r1.discount + r2.discount;
      if (discount > mejor.discount) {
        mejor = { freeUnits: r1.freeUnits + r2.freeUnits, discount };
      }
    }
  }

  return { ...mejor, keepFraction: base > 0 ? (base - mejor.discount) / base : 1 };
}

// --- Ventana del cupón de bienvenida (espejo de la spec 017) ---
// EPICA10 vence 10 minutos después de que el popup lo entrega. Es POR USUARIO,
// así que el instante de emisión viaja en el payload (`couponIssuedAt`).
//
// ⚠️ ESE DATO LO MANDA EL CLIENTE Y ES FALSIFICABLE. Está aceptado
// explícitamente (decisión de Mariano, 7/9/2026): hoy EPICA10 no vence nunca,
// así que quien edite localStorage no queda mejor de lo que ya está. ESTA
// VALIDACIÓN NO ES UN CONTROL DE SEGURIDAD — ataja el caso honesto y nada más.
//
// La tolerancia es para no rechazarle la compra a alguien con el reloj corrido,
// que en celulares es común. El frontend valida SIN tolerancia, así la pantalla
// nunca promete un descuento que acá se caiga.
export const CUPON_VENTANA_MS = 10 * 60 * 1000;
export const CUPON_TOLERANCIA_MS = 60 * 1000;
export const CUPONES_CON_VENTANA = ['EPICA10'];

export function cuponTieneVentana(code) {
  return CUPONES_CON_VENTANA.includes(String(code || '').trim().toUpperCase());
}

/**
 * ¿La ventana de este cupón sigue abierta?
 * `emitidoEn` ausente = no vino del popup (lo tipearon a mano o vino por URL):
 * no hay ventana que controlar y el cupón vale.
 */
export function ventanaCuponAbierta(emitidoEn, now = Date.now(), tolerancia = CUPON_TOLERANCIA_MS) {
  const ts = Number(emitidoEn);
  if (!Number.isFinite(ts)) return true;
  if (ts > now + tolerancia) return false; // emisión en el futuro: no se cree
  return now - ts <= CUPON_VENTANA_MS + tolerancia;
}

const WHOLESALE_QTY = 100; // pack mayorista: MÍNIMO 100 calcos (sin tope), 50 % off
const WHOLESALE_DISCOUNT = 0.5;

// --- Espejo de la PROMO MAYORISTA 100 × $39.999 de frontend/src/config/pricing.js ---
// Pack de EXACTAMENTE 100 calcos (los diseños que quiera el cliente, catálogo y/o
// propios) a precio fijo, SOLO en 4 y 6 cm y solo hasta MAYORISTA100_END_MS.
// La línea es `pack:mayorista100:{size}:{ts}` con quantity = 1 (1 línea = 1 pack).
// No confundir con la promo NEGOCIO (100u de un solo diseño en 6 cm).
// ⚠️ Si cambiás algo acá, cambialo TAMBIÉN en el frontend (lo verifica promoPricing.test.js).
// ⚠️ Sin fecha de fin desde la spec 017 (antes: 14/8/2026). Se apaga con
// MAYORISTA100_ACTIVA. Espejo de PROMO_MAYORISTA_100 del frontend.
export const MAYORISTA100_START_MS = Date.parse('2026-09-07T00:00:00-03:00');
export const MAYORISTA100_END_MS = Date.parse(null);
export const MAYORISTA100_PRICE = 39999;
export const MAYORISTA100_QTY = 100;
export const MAYORISTA100_SIZES = ['4cm', '6cm'];
// Interruptor manual, espejo de PROMO_MAYORISTA_100.activa del frontend. Apagar
// la promo SOLO en el frontend deja al servidor aceptando la línea del pack.
export const MAYORISTA100_ACTIVA = true;

export function isMayorista100Active(now = Date.now()) {
  return promoVigente(
    { activa: MAYORISTA100_ACTIVA, startMs: MAYORISTA100_START_MS, endMs: MAYORISTA100_END_MS },
    now
  );
}

// --- Espejo de la PROMO ARGENTINA 50 % de frontend/src/config/pricing.js ---
// Lunes 17, martes 18 y miércoles 19 de agosto de 2026: los calcos de catálogo
// de la categoría `argentina` a mitad de precio.
//
// Es la única promo con FECHA DE INICIO: antes del lunes el precio válido sigue
// siendo el de lista, así que se miran las DOS puntas.
//
// ACUMULA con el 10 % por transferencia y con el cupón (los % se suman), con el
// tope MAX_STICKER_DISCOUNT.
// ⚠️ Si cambiás el %, la categoría o las fechas, cambialo TAMBIÉN en el
// frontend (lo verifica promoPricing.test.js).
export const ARGENTINA_CATEGORIA = 'argentina';
export const ARGENTINA_DISCOUNT = 0.5;
export const ARGENTINA_START_MS = Date.parse('2026-08-17T00:00:00-03:00');
export const ARGENTINA_END_MS = Date.parse('2026-08-19T23:59:59-03:00');
// Interruptor manual, espejo de PROMO_ARGENTINA.activa del frontend.
export const ARGENTINA_ACTIVA = true;

export function isArgentinaActive(now = Date.now()) {
  return (
    ARGENTINA_ACTIVA &&
    Number.isFinite(ARGENTINA_START_MS) &&
    Number.isFinite(ARGENTINA_END_MS) &&
    now >= ARGENTINA_START_MS &&
    now <= ARGENTINA_END_MS
  );
}

/**
 * La categoría de un id de calco: `argentina-72` → `argentina`.
 * Se saca el ÚLTIMO tramo `-{número}`: varias categorías tienen guiones propios
 * (`autos-y-motos-127`), así que partir por el primero daría `autos`.
 */
export function categoriaDeStickerId(stickerId) {
  return String(stickerId || '').replace(/-\d+$/, '');
}

/** ¿Esta línea entra en la promo de Argentina ahora mismo? Se decide por el id. */
export function esPromoArgentina(lineId, now = Date.now()) {
  if (!isArgentinaActive(now)) return false;
  const parts = String(lineId || '').split(':');
  if (parts[0] !== 'sticker') return false;
  return categoriaDeStickerId(parts[1]) === ARGENTINA_CATEGORIA;
}

// --- NO hay packs con el envío incluido (espejo del bloque homónimo del front) ---
// El envío gratis se gana SOLO cruzando el umbral de la zona. Existió un
// FREE_SHIPPING_PACK_TYPES que lo ponía en 0 por tener una línea de pack en el
// carrito: con eso, la promo de 100 calcos a $39.999 viajó gratis a Buenos
// Aires. Ver el comentario largo en frontend/src/config/pricing.js antes de
// reponer cualquier atajo parecido.
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

// --- Espejo de IMPRIMIBLES en frontend/src/config/pricing.js (producto DIGITAL) ---
// Packs de archivos que se entregan POR MAIL. Precio FIJO siempre: la línea
// `digital:{id}` nunca es `discountable` (ningún cupón, ni el 10 % por
// transferencia, ni las promos N x M la tocan) y NO suma para el envío gratis
// (ver `physicalTotal` en validateAndPriceOrder). Cantidad: exactamente 1.
// ⚠️ Si cambiás un precio acá, cambialo TAMBIÉN en el frontend
// (lo verifica frontend/src/lib/promoPricing.test.js).
export const DIGITAL_PRICES = {
  'pack-stickers': 9999
};

/** true si TODAS las líneas del pedido son archivos digitales (no hay nada que enviar). */
export function isDigitalOnly(items) {
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.every((i) => String(i?.id ?? '').startsWith('digital:'))
  );
}

// --- Espejo de frontend/src/config/personalizados.js (calcos personalizados) ---
// Un calco personalizado vale lo MISMO que uno del catálogo, según su tamaño:
//   unitario = SIZE_PRICES[tamaño]
// No hay recargo por material ni mínimo de compra (antes eran 10 unidades), así
// que no hace falta ninguna grilla extra: el precio por tamaño es el SIZE_PRICES
// de arriba. El test frontend/src/lib/precioPersonalizados.test.js lo verifica.

// --- Espejo de frontend/src/config/site.js (envío) ---
// ⚠️ El test frontend/src/lib/envio.test.js verifica que estos números sean los
// mismos que los de frontend/src/config/site.js.
export const FREE_SHIPPING_THRESHOLD_ROSARIO = 35000;
// Envío gratis a TODO EL PAÍS (ciudades próximas + interior) desde este monto.
// En Rosario manda el umbral de arriba, que es más bajo.
export const FREE_SHIPPING_THRESHOLD_NATIONAL = 50000;
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
  // 'digital' = el pedido es solo archivos: no hay nada que despachar.
  // No hay tercer caso: ningún pack, promo ni cupón saltea los umbrales.
  if (method === 'retiro' || method === 'digital') return 0;
  const zone = shippingZone(city, province);
  if (zone === 'rosario') {
    return subtotal >= FREE_SHIPPING_THRESHOLD_ROSARIO ? 0 : SHIPPING_COST.rosario;
  }
  // Resto del país (ciudades próximas + interior): gratis desde el umbral nacional.
  if (subtotal >= FREE_SHIPPING_THRESHOLD_NATIONAL) return 0;
  return SHIPPING_COST[zone];
}

export function shippingMethodLabel(method, city, province) {
  if (method === 'digital') return 'Entrega por email';
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
    if (packType === 'mayorista100') {
      // Promo por tiempo limitado: 1 línea = 1 pack de 100 calcos a precio fijo.
      if (!isMayorista100Active())
        return { error: 'la promo de 100 calcos a $39.999 ya terminó — recargá la página' };
      if (!MAYORISTA100_SIZES.includes(parts[2]))
        return { error: 'la promo de 100 calcos es solo en 4 y 6 cm' };
      return { base: MAYORISTA100_PRICE, kind, discountable: false };
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

  // digital:{packId} — pack de archivos imprimibles. Precio fijo, sin descuentos
  // y SIEMPRE 1 unidad: el mismo archivo dos veces no es un pedido válido.
  if (kind === 'digital') {
    const price = DIGITAL_PRICES[parts[1]];
    if (!price) return { error: `archivo digital desconocido "${id}"` };
    if (quantity !== 1) return { error: 'archivos imprimibles: 1 unidad por línea' };
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
 * @param {{ items: Array<{id, title, quantity, unit_price}>, shipping?: object, paymentMethod?: string, couponCode?: string, couponIssuedAt?: number }} payload
 * @returns {{ ok: true, items: Array, itemsTotal: number, shippingCost: number,
 *             shippingMethod: string, methodValue: string, couponApplied: string|null }
 *          | { ok: false, error: string, detail?: string }}
 */
export function validateAndPriceOrder({ items, shipping, paymentMethod, couponCode, couponIssuedAt }) {
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
  // y no requiere umbral de cantidad ni medio de pago. El de bundle (2x1) y el
  // `exclusivo` (EPI50) NO se acumulan con nada: anulan todos los %.
  // Un cupón vencido o apagado (`activa: false`) es como si no existiera.
  const rawCoupon = String(couponCode || '').trim().toUpperCase();
  // Ventana por usuario (spec 017): pasados los 10 min desde que el popup lo
  // entregó, EPICA10 deja de descontar. Un cupón vencido NO rechaza el pedido:
  // se ignora y se cobra sin él. Rechazar dejaría a alguien sin poder comprar
  // por un descuento, que es exactamente lo contrario de lo que se busca.
  const ventanaOk = !cuponTieneVentana(rawCoupon) || ventanaCuponAbierta(couponIssuedAt);
  const normalizedCoupon = isCouponActive(rawCoupon) && ventanaOk ? rawCoupon : '';
  const coupon = COUPONS[normalizedCoupon] || null;
  const bundle = COUPON_BUNDLES[normalizedCoupon] || null;
  // ⚠️ DESDE LA SPEC 017 el cupón de % SÍ se acumula con la promo N x M (antes
  // quedaba anulado). Ver el aviso en el bloque de PROMO_ACTIVA.
  const promoActive = isPromoActive();
  const promo2x1Active = is2x1Active();
  const algunaPromoNxM = promoActive || promo2x1Active;
  const couponDiscount = bundle ? 0 : coupon?.discount || 0;
  const couponApplied = bundle || couponDiscount > 0 ? normalizedCoupon : null;
  // `anulaTodo` = este cupón es el ÚNICO descuento que corre. Espejo de
  // couponAnulaTodo() del frontend. Los tres usos de abajo (volumen, agrupación
  // N x M y promo por categoría) preguntaban `!bundle`: ahora el cupón
  // exclusivo entra por la misma puerta en vez de tener su propio camino.
  const anulaTodo = Boolean(bundle) || Boolean(coupon?.exclusivo);
  // El % de este cupón, ¿alcanza también a los personalizados sueltos?
  const incluyeCustom = Boolean(coupon?.incluyeCustom);

  // El 10 % por volumen aplica a calcos sueltos cuando el carrito suma ≥ 10
  // calcos TOTALES (se pueden combinar tamaños) Y el pago es por transferencia.
  const stickerUnits = clean
    .filter((i) => i.id.startsWith('sticker:'))
    .reduce((a, i) => a + i.quantity, 0);
  const bulkDiscount =
    !anulaTodo && stickerUnits >= BULK_THRESHOLD && paymentMethod === BULK_DISCOUNT_PAYMENT_METHOD ? BULK_DISCOUNT : 0;

  // Durante la promo 3x2 el % (cupón + transferencia) queda topeado en
  // PROMO_PERCENT_CAP (10 %); fuera de la promo, el tope es MAX_STICKER_DISCOUNT.
  //
  // El tope sigue a la promo REAL, no a la fecha: un cupón que la anula
  // (`anulaTodo`) deja al pedido sin 3x2, así que tampoco corre su tope. Sin
  // este `!anulaTodo`, EPI50 caído en una ventana de 3x2 daría 10 % en vez del
  // 50 % prometido — y el cliente vería el descuento derretirse por una promo
  // que ni siquiera se le está aplicando.
  const cap = algunaPromoNxM && !anulaTodo ? PROMO_PERCENT_CAP : MAX_STICKER_DISCOUNT;
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

  // N x M: DOS bolsas desde la spec 017 — las unidades de las categorías del
  // 2x1 y el resto. `repartoPromos` elige el reparto que más le conviene al
  // cliente y devuelve un keepFraction ÚNICO y uniforme por línea, igual que
  // antes. Un cupón de bundle pisa las dos promos y vuelve a la bolsa única.
  //
  // ⚠️ Espejo de `derived` + `pricedItems` del CartContext: si acá se arman las
  // bolsas con otro criterio que allá, el keepFraction difiere y TODO checkout
  // con calcos se rechaza.
  const grouping = bundle || (!anulaTodo && algunaPromoNxM ? { buy: PROMO_BUY, pay: PROMO_PAY } : null);
  let keepFraction = 1;
  if (grouping) {
    const unidadesCategoria = [];
    const unidadesResto = [];
    const todas = [];
    clean.forEach((item, idx) => {
      if (!bases[idx].discountable) return;
      const bolsa = esPromo2x1(item.id) ? unidadesCategoria : unidadesResto;
      for (let k = 0; k < item.quantity; k++) {
        todas.push(bases[idx].base);
        bolsa.push(bases[idx].base);
      }
    });
    keepFraction = bundle
      ? promo3x2(todas, bundle.buy, bundle.pay).keepFraction
      : repartoPromos({
          unidadesCategoria,
          unidadesResto,
          g2x1: promo2x1Active ? { buy: PROMO_2X1_BUY, pay: PROMO_2X1_PAY } : null,
          g3x2: promoActive ? { buy: PROMO_BUY, pay: PROMO_PAY } : null
        }).keepFraction;
  }

  // El 50 % de Argentina es POR LÍNEA (solo esa categoría), así que no entra en
  // `percentRate`, que es uno solo para todo el carrito: se suma encima y se
  // vuelve a topear. Espejo de `rateDe` en el CartContext del frontend.
  //
  // Con un cupón que anula todo (bundle o `exclusivo`) no corre: esos cupones
  // anulan TODOS los % por definición, y el 50 % de Argentina es uno más. Si no,
  // un 2x1 sobre calcos ya regalados al 50 % los dejaría casi en cero, y EPI50
  // sobre un calco de Argentina daría 90 % en vez del 50 % prometido.
  const rateDe = (id) =>
    !anulaTodo && esPromoArgentina(id)
      ? Math.min(percentRate + ARGENTINA_DISCOUNT, MAX_STICKER_DISCOUNT)
      : percentRate;

  const priced = [];
  for (let idx = 0; idx < clean.length; idx++) {
    const item = clean[idx];
    const lb = bases[idx];
    let expected;
    if (!lb.discountable) {
      expected = lb.base; // packs / negocio / fijos: ya traen su precio final.
    } else if (grouping) {
      // Elegibles (catálogo + personalizados): N x M y luego el % (0 con bundle).
      expected = round(lb.base * keepFraction * (1 - rateDe(item.id)));
    } else if (lb.kind === 'sticker' || (incluyeCustom && lb.kind === 'custom')) {
      // Fuera de promo, el cupón/transferencia solo tocan calcos de catálogo —
      // salvo que el cupón traiga `incluyeCustom` (EPI50), que suma los
      // personalizados sueltos. Ojo: esto NO extiende el 10 % por volumen, que
      // se sigue contando solo con líneas `sticker:` (ver stickerUnits arriba).
      expected = round(lb.base * (1 - rateDe(item.id)));
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

  // Los archivos digitales no se despachan: no cuentan para el umbral de envío
  // gratis. Sin esto, sumar un pack de $9.999 al carrito acercaría el pedido a
  // los umbrales sin agregar un solo gramo a la caja.
  const physicalTotal = priced.reduce(
    (a, i, idx) => (bases[idx].kind === 'digital' ? a : a + i.unit_price * i.quantity),
    0
  );

  // Envío: SIEMPRE recalculado en el servidor (se ignora shipping.cost del cliente).
  // methodValue es 'retiro' | 'envio' | 'digital'; si un cliente viejo no lo
  // manda, se deriva del label.
  //
  // 'digital' NO se acepta del cliente: lo decide el servidor mirando las líneas
  // del pedido (un pedido de solo archivos no tiene entrega). Si el cliente lo
  // manda con productos físicos adentro, es un carrito desactualizado —
  // aceptarlo sería regalarle el envío.
  const digitalOnly = isDigitalOnly(clean);
  const claimed =
    shipping?.methodValue ||
    (/retiro/i.test(String(shipping?.method || '')) ? 'retiro' : 'envio');
  if (!digitalOnly && claimed === 'digital') {
    return {
      ok: false,
      error: 'shipping_invalid',
      detail: 'tu pedido tiene productos que se envían — recargá la página'
    };
  }
  const methodValue = digitalOnly ? 'digital' : claimed;
  if (methodValue !== 'retiro' && methodValue !== 'envio' && methodValue !== 'digital') {
    return { ok: false, error: 'shipping_invalid', detail: 'método de envío desconocido' };
  }
  // El envío sale de la zona y del subtotal FÍSICO, y de nada más. Si el
  // payload trae un `envioGratis`, acá no se lee: no existe forma de que el
  // cliente se regale el correo.
  const shippingCost = calculateShipping({
    method: methodValue,
    subtotal: physicalTotal,
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
