import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DIGITAL_SKU } from '../config/metaCatalog.js';
// Frontend (fuente de verdad del cliente)
import {
  PROMO_END_MS as FE_END,
  PROMO_3X2,
  promo3x2 as fePromo3x2,
  isPromoActive as feActive,
  priceForSize,
  findCoupon,
  couponBundle,
  COUPONS,
  round,
  BULK_THRESHOLD,
  BULK_DISCOUNT,
  MAX_STICKER_DISCOUNT,
  PROMO_MAYORISTA_100,
  PROMO_MAYORISTA_END_MS,
  isMayoristaPromoActive,
  isMayoristaPromoSize,
  mayoristaPromoOff,
  IMPRIMIBLES,
  IMPRIMIBLE_PRINCIPAL,
  findImprimible
} from '../config/pricing.js';
// Backend: el que re-precia el checkout (rechaza si no coincide).
import {
  PROMO_END_MS as BE_END,
  PROMO_PERCENT_CAP,
  COUPON_BUNDLES,
  COUPON_ENDS_MS,
  isCouponActive as beCouponActive,
  promo3x2 as bePromo3x2,
  isPromoActive as beActive,
  MAYORISTA100_END_MS,
  MAYORISTA100_PRICE,
  MAYORISTA100_QTY,
  MAYORISTA100_SIZES,
  isMayorista100Active,
  DIGITAL_PRICES,
  FREE_SHIPPING_THRESHOLD_ROSARIO,
  isDigitalOnly,
  validateAndPriceOrder
} from '../../../netlify/functions/lib/pricing.js';

const PROMO_ELIGIBLE = new Set(['sticker', 'custom']);
const DURING_PROMO = new Date('2026-07-24T12:00:00-03:00'); // vie 24/7, promo vigente
const AFTER_PROMO = new Date('2026-07-27T12:00:00-03:00'); // lun 27/7, promo vencida
const AFTER_EMOJI50 = new Date('2026-08-05T00:30:00-03:00'); // mié 5/8, EMOJI50 ya vencido
const DURING_MAYORISTA = new Date('2026-08-10T12:00:00-03:00'); // lun 10/8, promo mayorista vigente
const AFTER_MAYORISTA = new Date('2026-08-15T00:30:00-03:00'); // sáb 15/8, promo mayorista vencida

afterEach(() => vi.useRealTimers());

/** Espejo de CartContext.pricedItems: arma el payload que MANDA el cliente. */
function clientItems(cart, { paymentMethod = 'mercadopago', coupon = '' } = {}) {
  const promoActive = feActive();
  const bundle = couponBundle(coupon); // cupón N x M (EMOJI50): anula todos los %
  const stickerUnits = cart.filter((l) => l.type === 'sticker').reduce((a, l) => a + l.quantity, 0);
  const bulkRate = !bundle && stickerUnits >= BULK_THRESHOLD && paymentMethod === 'transferencia' ? BULK_DISCOUNT : 0;
  const couponRate = bundle ? 0 : findCoupon(coupon)?.discount || 0;
  const cap = promoActive ? PROMO_3X2.percentCap : MAX_STICKER_DISCOUNT;
  const percentRate = Math.min(bulkRate + couponRate, cap);

  const grouping = bundle || (promoActive ? PROMO_3X2 : null);
  let keep = 1;
  if (grouping) {
    const prices = [];
    for (const l of cart) if (PROMO_ELIGIBLE.has(l.type)) for (let k = 0; k < l.quantity; k++) prices.push(l.basePrice);
    keep = fePromo3x2({ unitBasePrices: prices, buy: grouping.buy, pay: grouping.pay }).keepFraction;
  }

  return cart.map((l) => {
    let price;
    if (grouping && PROMO_ELIGIBLE.has(l.type)) price = round(l.basePrice * keep * (1 - percentRate));
    else if (!grouping && l.type === 'sticker') price = round(l.basePrice * (1 - percentRate));
    else price = l.basePrice;
    return { id: l.id, title: l.title, quantity: l.quantity, unit_price: price };
  });
}

// Carrito de prueba: catálogo (2×6cm + 1×9cm) + personalizados (10× vinilo 4cm) + un pack (excluido).
const cart = [
  { id: 'sticker:goku:6cm', title: 'Goku 6cm', type: 'sticker', basePrice: priceForSize('6cm'), quantity: 2 },
  { id: 'sticker:naruto:9cm', title: 'Naruto 9cm', type: 'sticker', basePrice: priceForSize('9cm'), quantity: 1 },
  { id: 'custom:4cm:silueta:1', title: 'Custom 4cm x10', type: 'custom', basePrice: 1200, quantity: 10 },
  { id: 'pack:mayorista:6cm:1', title: 'Pack Mayorista', type: 'pack', basePrice: round(priceForSize('6cm') * 0.5), quantity: 100 }
];
const retiro = { methodValue: 'retiro' };
const price = (items, id) => items.find((i) => i.id === id).unit_price;

describe('promo3x2 — mecánica y paridad frontend ↔ backend', () => {
  it('constantes espejadas idénticas', () => {
    expect(FE_END).toBe(BE_END);
    expect(PROMO_3X2.percentCap).toBe(PROMO_PERCENT_CAP);
    expect(Number.isFinite(FE_END)).toBe(true);
  });

  it('cada 3 unidades regala la MÁS BARATA', () => {
    expect(fePromo3x2({ unitBasePrices: [2000, 1200, 1600] })).toEqual({
      freeUnits: 1,
      discount: 1200,
      keepFraction: (4800 - 1200) / 4800
    });
    expect(fePromo3x2({ unitBasePrices: [1600, 1600] }).freeUnits).toBe(0); // <3 → nada
    expect(fePromo3x2({ unitBasePrices: Array(6).fill(1000) }).freeUnits).toBe(2); // 6 → 2 gratis
    expect(fePromo3x2({ unitBasePrices: [] })).toEqual({ freeUnits: 0, discount: 0, keepFraction: 1 });
  });

  it('el helper del front y el del back dan lo mismo para varias bolsas', () => {
    const bolsas = [[1200], [1200, 1600, 2000], [2000, 2000, 1200, 1200, 1600], Array(13).fill(0).map((_, i) => 1000 + i * 100)];
    for (const b of bolsas) {
      expect(bePromo3x2(b)).toEqual(fePromo3x2({ unitBasePrices: b }));
    }
  });

  it('isPromoActive coincide en ambos lados', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING_PROMO);
    expect(feActive()).toBe(true);
    expect(beActive()).toBe(true);
    vi.setSystemTime(AFTER_PROMO);
    expect(feActive()).toBe(false);
    expect(beActive()).toBe(false);
  });
});

describe('checkout end-to-end: lo que manda el cliente == lo que valida el server', () => {
  it('promo activa, sin cupón (MP): 3x2 y el server acepta', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING_PROMO);
    // 13 elegibles → 4 gratis (los 4 más baratos = 4×1200). eligibleBase=17200, keep=12400/17200.
    const keep = 12400 / 17200;
    const items = clientItems(cart);
    expect(price(items, 'sticker:goku:6cm')).toBe(round(1600 * keep));
    expect(price(items, 'sticker:naruto:9cm')).toBe(round(2000 * keep));
    expect(price(items, 'custom:4cm:silueta:1')).toBe(round(1200 * keep));
    expect(price(items, 'pack:mayorista:6cm:1')).toBe(round(1600 * 0.5)); // pack intacto

    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago' });
    expect(res.ok).toBe(true);
  });

  it('promo activa + EPICA10 (transferencia): 3x2 y % topeado en 10%, el server acepta', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING_PROMO);
    const items = clientItems(cart, { paymentMethod: 'transferencia', coupon: 'EPICA10' });
    // transferencia 10% + EPICA10 10% = 20% pero el tope de promo lo deja en 10%.
    const keep = 12400 / 17200;
    expect(price(items, 'custom:4cm:silueta:1')).toBe(round(1200 * keep * 0.9));
    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10' });
    expect(res.ok).toBe(true);
    expect(res.couponApplied).toBe('EPICA10');
  });

  it('fuera de la promo vuelve TODO a la normalidad (custom sin cupón, pack intacto)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(AFTER_PROMO);
    const items = clientItems(cart, { paymentMethod: 'transferencia', coupon: 'EPICA10' });
    // El carrito tiene 3 calcos de catálogo (<10): no llega al 10% por transferencia,
    // así que el sticker solo recibe el 10% del cupón. Custom sin cupón; pack intacto.
    expect(price(items, 'sticker:goku:6cm')).toBe(round(1600 * 0.9));
    expect(price(items, 'custom:4cm:silueta:1')).toBe(1200);
    expect(price(items, 'pack:mayorista:6cm:1')).toBe(round(1600 * 0.5));
    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10' });
    expect(res.ok).toBe(true);
  });

  it('con ≥10 calcos: fuera de promo 20% acumulable; en promo, 3x2 con % topeado en 10%', () => {
    const bulkCart = [{ id: 'sticker:goku:6cm', title: 'Goku x10', type: 'sticker', basePrice: 1600, quantity: 10 }];

    // Fuera de promo: transferencia 10% + EPICA10 10% = 20% (tope 90%).
    vi.useFakeTimers();
    vi.setSystemTime(AFTER_PROMO);
    let items = clientItems(bulkCart, { paymentMethod: 'transferencia', coupon: 'EPICA10' });
    expect(price(items, 'sticker:goku:6cm')).toBe(round(1600 * 0.8));
    expect(validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10' }).ok).toBe(true);

    // En promo: 10 unidades → 3 gratis (keep = 0.7); % topeado en 10% aunque haya transf + cupón.
    vi.setSystemTime(DURING_PROMO);
    items = clientItems(bulkCart, { paymentMethod: 'transferencia', coupon: 'EPICA10' });
    expect(price(items, 'sticker:goku:6cm')).toBe(round(1600 * 0.7 * 0.9)); // = 1008
    expect(validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10' }).ok).toBe(true);
  });

  it('EMOJI50 (2x1 oculto) fuera de promo: catálogo + personalizados, pack intacto', () => {
    vi.useFakeTimers();
    vi.setSystemTime(AFTER_PROMO);
    // 13 elegibles → 6 gratis (los 6 más baratos = 6×1200). eligibleBase=17200, keep=10000/17200.
    const keep = 10000 / 17200;
    const items = clientItems(cart, { coupon: 'EMOJI50' });
    expect(price(items, 'sticker:goku:6cm')).toBe(round(1600 * keep));
    expect(price(items, 'sticker:naruto:9cm')).toBe(round(2000 * keep));
    expect(price(items, 'custom:4cm:silueta:1')).toBe(round(1200 * keep));
    expect(price(items, 'pack:mayorista:6cm:1')).toBe(round(1600 * 0.5)); // pack intacto

    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago', couponCode: 'EMOJI50' });
    expect(res.ok).toBe(true);
    expect(res.couponApplied).toBe('EMOJI50');
  });

  it('EMOJI50 NO es acumulable: ni 10% por transferencia ni 10% desde 10 calcos', () => {
    vi.useFakeTimers();
    vi.setSystemTime(AFTER_PROMO);
    const bulkCart = [{ id: 'sticker:goku:6cm', title: 'Goku x10', type: 'sticker', basePrice: 1600, quantity: 10 }];

    // Sin cupón y con transferencia, ese carrito sí tiene el 10% por volumen.
    expect(price(clientItems(bulkCart, { paymentMethod: 'transferencia' }), 'sticker:goku:6cm')).toBe(round(1600 * 0.9));

    // Con EMOJI50: solo el 2x1 (10 unidades → 5 gratis, keep = 0.5), sin ningún %.
    const mp = clientItems(bulkCart, { coupon: 'EMOJI50' });
    const transfer = clientItems(bulkCart, { paymentMethod: 'transferencia', coupon: 'EMOJI50' });
    expect(price(mp, 'sticker:goku:6cm')).toBe(800);
    expect(price(transfer, 'sticker:goku:6cm')).toBe(800); // el medio de pago no cambia nada
    expect(
      validateAndPriceOrder({ items: transfer, shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EMOJI50' }).ok
    ).toBe(true);

    // Si el cliente intenta sumarle el 10% al 2x1, el server lo rechaza.
    const tramposo = transfer.map((i) => ({ ...i, unit_price: round(i.unit_price * 0.9) }));
    const res = validateAndPriceOrder({ items: tramposo, shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EMOJI50' });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('price_mismatch');
  });

  it('EMOJI50 durante la promo 3x2: manda el 2x1 del cupón, sin %', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING_PROMO);
    const keep = 10000 / 17200; // 2x1, no el 3x2
    const items = clientItems(cart, { paymentMethod: 'transferencia', coupon: 'EMOJI50' });
    expect(price(items, 'custom:4cm:silueta:1')).toBe(round(1200 * keep));
    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EMOJI50' });
    expect(res.ok).toBe(true);
  });

  it('los cupones de bundle están espejados frontend ↔ backend', () => {
    vi.useFakeTimers();
    vi.setSystemTime(AFTER_PROMO);
    const feBundles = Object.fromEntries(
      Object.entries(COUPONS).filter(([, c]) => c.bundle).map(([code, c]) => [code, c.bundle])
    );
    expect(feBundles).toEqual(COUPON_BUNDLES);
    expect(couponBundle('emoji50')).toEqual({ buy: 2, pay: 1 }); // case-insensitive
  });

  it('los vencimientos de cupón están espejados frontend ↔ backend', () => {
    const feEnds = Object.fromEntries(
      Object.entries(COUPONS).filter(([, c]) => c.endsAt).map(([code, c]) => [code, Date.parse(c.endsAt)])
    );
    expect(feEnds).toEqual(COUPON_ENDS_MS);
    expect(Number.isFinite(COUPON_ENDS_MS.EMOJI50)).toBe(true);
  });

  it('EMOJI50 vencido: no aplica en el cliente ni en el server (EPICA10 sigue vivo)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(AFTER_EMOJI50);

    // El cliente deja de reconocerlo: sin bundle, sin descuento.
    expect(couponBundle('EMOJI50')).toBeNull();
    expect(findCoupon('EMOJI50')).toBeNull();
    expect(beCouponActive('EMOJI50')).toBe(false);

    // El carrito se cotiza a precio de lista aunque el cliente mande el código.
    const bulkCart = [{ id: 'sticker:goku:6cm', title: 'Goku x10', type: 'sticker', basePrice: 1600, quantity: 10 }];
    const items = clientItems(bulkCart, { coupon: 'EMOJI50' });
    expect(price(items, 'sticker:goku:6cm')).toBe(1600);
    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago', couponCode: 'EMOJI50' });
    expect(res.ok).toBe(true);
    expect(res.couponApplied).toBeNull();

    // Y si intenta cobrar el 2x1 con el cupón vencido, el server lo rechaza.
    const conBundle = bulkCart.map((l) => ({ id: l.id, title: l.title, quantity: l.quantity, unit_price: 800 }));
    const rechazado = validateAndPriceOrder({ items: conBundle, shipping: retiro, paymentMethod: 'mercadopago', couponCode: 'EMOJI50' });
    expect(rechazado.ok).toBe(false);
    expect(rechazado.error).toBe('price_mismatch');

    // EPICA10 (el del popup de bienvenida) no vence: sigue dando su 10 %.
    expect(findCoupon('EPICA10')?.discount).toBe(0.10);
    expect(beCouponActive('EPICA10')).toBe(true);
    const conEpica = clientItems(bulkCart, { coupon: 'EPICA10' });
    expect(price(conEpica, 'sticker:goku:6cm')).toBe(round(1600 * 0.9));
    expect(
      validateAndPriceOrder({ items: conEpica, shipping: retiro, paymentMethod: 'mercadopago', couponCode: 'EPICA10' }).couponApplied
    ).toBe('EPICA10');
  });

  it('la promo mayorista (100 calcos a $39.999) está espejada frontend ↔ backend', () => {
    expect(PROMO_MAYORISTA_END_MS).toBe(MAYORISTA100_END_MS);
    expect(PROMO_MAYORISTA_100.price).toBe(MAYORISTA100_PRICE);
    expect(PROMO_MAYORISTA_100.qty).toBe(MAYORISTA100_QTY);
    expect(PROMO_MAYORISTA_100.sizes).toEqual(MAYORISTA100_SIZES);
    expect(Number.isFinite(PROMO_MAYORISTA_END_MS)).toBe(true);

    // Solo 4 y 6 cm: el 9 cm queda afuera a propósito.
    expect(isMayoristaPromoSize('4cm')).toBe(true);
    expect(isMayoristaPromoSize('6cm')).toBe(true);
    expect(isMayoristaPromoSize('9cm')).toBe(false);

    // El % que se muestra es el real contra el precio de lista de cada tamaño.
    expect(mayoristaPromoOff('4cm')).toBe(Math.round((1 - 39999 / (1200 * 100)) * 100));
    expect(mayoristaPromoOff('6cm')).toBe(Math.round((1 - 39999 / (1600 * 100)) * 100));

    vi.useFakeTimers();
    vi.setSystemTime(DURING_MAYORISTA);
    expect(isMayoristaPromoActive()).toBe(true);
    expect(isMayorista100Active()).toBe(true);
    vi.setSystemTime(AFTER_MAYORISTA);
    expect(isMayoristaPromoActive()).toBe(false);
    expect(isMayorista100Active()).toBe(false);
  });

  it('promo mayorista: el server acepta el pack de 100 a $39.999 en 4 y 6 cm', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING_MAYORISTA);
    // 1 línea = 1 pack de 100 calcos. Convive con calcos sueltos, que siguen a precio de lista.
    const items = [
      { id: 'pack:mayorista100:4cm:1', title: 'Pack Mayorista PROMO x100 · 4 cm', quantity: 1, unit_price: 39999 },
      { id: 'pack:mayorista100:6cm:2', title: 'Pack Mayorista PROMO x100 · 6 cm', quantity: 1, unit_price: 39999 },
      { id: 'sticker:goku:6cm', title: 'Goku 6cm', quantity: 2, unit_price: 1600 }
    ];
    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago' });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(39999 * 2 + 3200);
  });

  it('promo mayorista: el pack NO recibe cupón ni 10% por transferencia', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING_MAYORISTA);
    const items = [
      { id: 'pack:mayorista100:4cm:1', title: 'Pack Mayorista PROMO x100', quantity: 1, unit_price: 39999 }
    ];
    expect(
      validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10' }).ok
    ).toBe(true);

    // Si el cliente le descuenta el 10% al pack, el server lo rechaza.
    const tramposo = [{ ...items[0], unit_price: round(39999 * 0.9) }];
    const res = validateAndPriceOrder({ items: tramposo, shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10' });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('price_mismatch');
  });

  it('promo mayorista: el server rechaza 9 cm y rechaza la promo vencida', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING_MAYORISTA);
    const nueveCm = [
      { id: 'pack:mayorista100:9cm:1', title: 'Pack Mayorista PROMO x100 · 9 cm', quantity: 1, unit_price: 39999 }
    ];
    expect(validateAndPriceOrder({ items: nueveCm, shipping: retiro, paymentMethod: 'mercadopago' }).error).toBe(
      'item_invalid'
    );

    // Vencida: aunque quede una línea vieja en el localStorage de alguien, no se cobra.
    vi.setSystemTime(AFTER_MAYORISTA);
    const vencida = [
      { id: 'pack:mayorista100:4cm:1', title: 'Pack Mayorista PROMO x100', quantity: 1, unit_price: 39999 }
    ];
    expect(validateAndPriceOrder({ items: vencida, shipping: retiro, paymentMethod: 'mercadopago' }).error).toBe(
      'item_invalid'
    );

    // Y el pack mayorista de siempre (50% off, sin promo) sigue funcionando.
    const normal = [
      { id: 'pack:mayorista:4cm:1', title: 'Pack Mayorista x100 · 4 cm', quantity: 100, unit_price: 600 }
    ];
    expect(validateAndPriceOrder({ items: normal, shipping: retiro, paymentMethod: 'mercadopago' }).ok).toBe(true);
  });

  it('un precio adulterado se rechaza con price_mismatch', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING_PROMO);
    const items = clientItems(cart);
    items[0].unit_price -= 100; // el cliente "se hace el vivo"
    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago' });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('price_mismatch');
  });
});

/**
 * ARCHIVOS IMPRIMIBLES — el producto digital.
 *
 * Las dos reglas que lo definen y que el servidor tiene que hacer cumplir sí o
 * sí: precio FIJO (ningún descuento lo toca) y SIN ENVÍO (ni cobrado, ni usado
 * para llegar al umbral de envío gratis).
 */
describe('archivos imprimibles (producto digital)', () => {
  const pack = IMPRIMIBLE_PRINCIPAL;
  const linea = (unitPrice = pack.price, quantity = 1) => ({
    id: `digital:${pack.id}`,
    title: pack.name,
    quantity,
    unit_price: unitPrice
  });
  const envioRosario = { methodValue: 'envio', city: 'Rosario', province: 'Santa Fe' };

  it('los precios del frontend y del backend coinciden (si no, price_mismatch en cada compra)', () => {
    for (const p of IMPRIMIBLES) {
      expect(DIGITAL_PRICES[p.id]).toBe(p.price);
    }
    // Y al revés: un pack en el server que el frontend no conoce no se puede comprar.
    for (const id of Object.keys(DIGITAL_PRICES)) {
      expect(findImprimible(id)).not.toBeNull();
    }
  });

  it('se cobra a precio de lista y sin envío', () => {
    const res = validateAndPriceOrder({ items: [linea()], shipping: envioRosario, paymentMethod: 'mercadopago' });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(pack.price);
    expect(res.shippingCost).toBe(0);
    expect(res.shippingMethod).toBe('Entrega por email');
    expect(res.methodValue).toBe('digital');
  });

  it('NO acepta cupones, ni el 10% por transferencia, ni la promo 3x2', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING_PROMO); // 3x2 vigente: igual no lo toca

    // A precio de lista pasa, aunque venga con cupón y transferencia.
    expect(
      validateAndPriceOrder({
        items: [linea()],
        shipping: retiro,
        paymentMethod: 'transferencia',
        couponCode: 'EPICA10'
      }).ok
    ).toBe(true);

    // Con cualquier descuento aplicado, se rechaza.
    const conDescuento = validateAndPriceOrder({
      items: [linea(round(pack.price * 0.9))],
      shipping: retiro,
      paymentMethod: 'transferencia',
      couponCode: 'EPICA10'
    });
    expect(conDescuento.ok).toBe(false);
    expect(conDescuento.error).toBe('price_mismatch');
  });

  it('no entra en la bolsa del 3x2: no regala calcos ni se lleva un calco gratis', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING_PROMO);
    // 2 calcos + 1 archivo: si el archivo contara como tercera unidad elegible,
    // el 3x2 regalaría uno. No cuenta, así que los dos calcos van a precio lleno.
    const items = [
      { id: 'sticker:goku:6cm', title: 'Goku 6cm', quantity: 2, unit_price: 1600 },
      linea()
    ];
    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago' });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(1600 * 2 + pack.price);
  });

  it('no acerca al envío gratis: el umbral mira solo lo que se despacha', () => {
    // Se arma un carrito que queda JUSTO debajo del umbral de Rosario en calcos
    // y JUSTO arriba sumándole el pack digital. Los montos salen del umbral y no
    // escritos a mano: cuando el umbral bajó de $50.000 a $25.000, un carrito
    // fijo de $46.000 dejó de estar debajo y el test medía otra cosa.
    const unidad = 2000; // calco de 9 cm
    const cantidad = Math.ceil((FREE_SHIPPING_THRESHOLD_ROSARIO - pack.price) / unidad);
    const fisico = unidad * cantidad;
    expect(fisico).toBeLessThan(FREE_SHIPPING_THRESHOLD_ROSARIO);
    expect(fisico + pack.price).toBeGreaterThanOrEqual(FREE_SHIPPING_THRESHOLD_ROSARIO);

    const items = [
      { id: 'sticker:goku:9cm', title: 'Goku 9cm', quantity: cantidad, unit_price: unidad },
      linea()
    ];
    const res = validateAndPriceOrder({ items, shipping: envioRosario, paymentMethod: 'mercadopago' });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(fisico + pack.price); // el total SÍ pasa el umbral
    expect(res.shippingCost).toBe(4500); // …pero el envío se sigue cobrando
  });

  it('con productos físicos en el carrito, el envío se cobra normal', () => {
    const items = [
      { id: 'sticker:goku:6cm', title: 'Goku 6cm', quantity: 1, unit_price: 1600 },
      linea()
    ];
    const res = validateAndPriceOrder({ items, shipping: envioRosario, paymentMethod: 'mercadopago' });
    expect(res.ok).toBe(true);
    expect(res.methodValue).toBe('envio');
    expect(res.shippingCost).toBe(4500);
  });

  it("un carrito con físicos que se declara 'digital' se rechaza (envío gratis trucho)", () => {
    const items = [
      { id: 'sticker:goku:6cm', title: 'Goku 6cm', quantity: 1, unit_price: 1600 },
      linea()
    ];
    const res = validateAndPriceOrder({
      items,
      shipping: { methodValue: 'digital', city: 'Rosario', province: 'Santa Fe' },
      paymentMethod: 'mercadopago'
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('shipping_invalid');
  });

  it('rechaza cantidades distintas de 1 y packs inexistentes', () => {
    expect(
      validateAndPriceOrder({ items: [linea(pack.price, 2)], shipping: retiro, paymentMethod: 'mercadopago' }).error
    ).toBe('item_invalid');

    expect(
      validateAndPriceOrder({
        items: [{ id: 'digital:pack-inventado', title: 'Pack trucho', quantity: 1, unit_price: 1 }],
        shipping: retiro,
        paymentMethod: 'mercadopago'
      }).error
    ).toBe('item_invalid');
  });

  it('isDigitalOnly distingue el carrito 100% digital del mixto', () => {
    expect(isDigitalOnly([linea()])).toBe(true);
    expect(isDigitalOnly([linea(), { id: 'sticker:goku:6cm' }])).toBe(false);
    expect(isDigitalOnly([])).toBe(false);
  });

  it('el SKU que manda el píxel es el mismo que el del feed de Meta', () => {
    // El registro de SKUs es append-only: al pack NO le tocó el número que
    // seguía a las otras líneas especiales, sino el siguiente libre del
    // catálogo entero. Escribirlo "a ojo" en metaCatalog.js manda content_ids
    // que no existen en el catálogo y la atribución de Meta se pierde en
    // silencio — de ahí este test.
    const dir = dirname(fileURLToPath(import.meta.url));
    const registry = JSON.parse(
      readFileSync(join(dir, '..', '..', 'public', 'data', 'skus.json'), 'utf8')
    );
    expect(DIGITAL_SKU[pack.id]).toBe(registry.byKey['linea:archivos-imprimibles']);
  });
});
