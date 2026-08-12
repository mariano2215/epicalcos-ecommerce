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
  mayoristaPromoOffMax,
  IMPRIMIBLES,
  IMPRIMIBLE_PRINCIPAL,
  findImprimible,
  PROMO_ARGENTINA,
  PROMO_ARGENTINA_START_MS,
  PROMO_ARGENTINA_END_MS,
  isArgentinaPromoActive,
  categoriaDeStickerId,
  esPromoArgentina as feEsPromoArgentina,
  precioVidriera,
  precioVidrieraLinea
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
  MAYORISTA100_ACTIVA,
  isMayorista100Active,
  DIGITAL_PRICES,
  FREE_SHIPPING_THRESHOLD_ROSARIO,
  isDigitalOnly,
  validateAndPriceOrder,
  ARGENTINA_CATEGORIA,
  ARGENTINA_DISCOUNT,
  ARGENTINA_START_MS,
  ARGENTINA_END_MS,
  ARGENTINA_ACTIVA,
  isArgentinaActive,
  esPromoArgentina as beEsPromoArgentina
} from '../../../netlify/functions/lib/pricing.js';

const PROMO_ELIGIBLE = new Set(['sticker', 'custom']);
const DURING_PROMO = new Date('2026-07-24T12:00:00-03:00'); // vie 24/7, promo vigente
const AFTER_PROMO = new Date('2026-07-27T12:00:00-03:00'); // lun 27/7, promo vencida
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

  // El 50 % de Argentina se suma por línea y se vuelve a topear (ver CartContext).
  const rateDe = (l) =>
    !bundle && feEsPromoArgentina(l.id)
      ? Math.min(percentRate + PROMO_ARGENTINA.discount, MAX_STICKER_DISCOUNT)
      : percentRate;

  return cart.map((l) => {
    let price;
    if (grouping && PROMO_ELIGIBLE.has(l.type)) price = round(l.basePrice * keep * (1 - rateDe(l)));
    else if (!grouping && l.type === 'sticker') price = round(l.basePrice * (1 - rateDe(l)));
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

  it('los cupones de bundle están espejados frontend ↔ backend', () => {
    vi.useFakeTimers();
    vi.setSystemTime(AFTER_PROMO);
    const feBundles = Object.fromEntries(
      Object.entries(COUPONS).filter(([, c]) => c.bundle).map(([code, c]) => [code, c.bundle])
    );
    expect(feBundles).toEqual(COUPON_BUNDLES);
    // Hoy no hay ninguno vivo (EMOJI50 venció el 4/8 y se sacó). El motor N x M
    // queda: si mañana se prende otro, esta igualdad lo obliga a estar en ambos lados.
    expect(COUPON_BUNDLES).toEqual({});
  });

  it('los vencimientos de cupón están espejados frontend ↔ backend', () => {
    const feEnds = Object.fromEntries(
      Object.entries(COUPONS).filter(([, c]) => c.endsAt).map(([code, c]) => [code, Date.parse(c.endsAt)])
    );
    expect(feEnds).toEqual(COUPON_ENDS_MS);
  });

  it('un cupón que no existe no descuenta nada (EPICA10 sigue vivo)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(AFTER_PROMO);

    // EMOJI50 se sacó del config: el cliente y el server lo tratan como inexistente.
    expect(couponBundle('EMOJI50')).toBeNull();
    expect(findCoupon('EMOJI50')).toBeNull();

    // El carrito se cotiza a precio de lista aunque el cliente mande el código.
    const bulkCart = [{ id: 'sticker:goku:6cm', title: 'Goku x10', type: 'sticker', basePrice: 1600, quantity: 10 }];
    const items = clientItems(bulkCart, { coupon: 'EMOJI50' });
    expect(price(items, 'sticker:goku:6cm')).toBe(1600);
    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago', couponCode: 'EMOJI50' });
    expect(res.ok).toBe(true);
    expect(res.couponApplied).toBeNull();

    // Y si intenta cobrarse un 2x1 con un cupón que no existe, el server lo rechaza.
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
    // El interruptor manual también está espejado: apagarlo solo en el frontend
    // dejaría al servidor aceptando la línea del pack.
    expect(PROMO_MAYORISTA_100.activa).toBe(MAYORISTA100_ACTIVA);

    // Solo 4 y 6 cm: el 9 cm queda afuera a propósito.
    expect(isMayoristaPromoSize('4cm')).toBe(true);
    expect(isMayoristaPromoSize('6cm')).toBe(true);
    expect(isMayoristaPromoSize('9cm')).toBe(false);

    // El % que se muestra es el real contra el precio de lista de cada tamaño.
    expect(mayoristaPromoOff('4cm')).toBe(Math.round((1 - 39999 / (1200 * 100)) * 100));
    expect(mayoristaPromoOff('6cm')).toBe(Math.round((1 - 39999 / (1600 * 100)) * 100));
    // El "HASTA X% OFF" de la card del hero es el mayor de los dos, calculado.
    expect(mayoristaPromoOffMax()).toBe(Math.max(mayoristaPromoOff('4cm'), mayoristaPromoOff('6cm')));

    // El copy sale del config y trae el precio ya formateado.
    expect(PROMO_MAYORISTA_100.id).toBe('mayorista100');
    expect(PROMO_MAYORISTA_100.titulo).toContain(String(PROMO_MAYORISTA_100.qty));
    expect(PROMO_MAYORISTA_100.titulo).toContain('39.999');

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
    // y JUSTO arriba sumándole el pack digital. Los montos se derivan del umbral
    // y no se escriben a mano: con un carrito fijo, mover el umbral deja el test
    // pasando pero midiendo otra cosa.
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

describe('promo ARGENTINA 50% (lun 17 · mar 18 · mié 19 de agosto de 2026)', () => {
  const ANTES = new Date('2026-08-16T23:30:00-03:00'); // dom 16, todavía no arrancó
  const DURANTE = new Date('2026-08-18T12:00:00-03:00'); // mar 18, en plena promo
  const DESPUES = new Date('2026-08-20T00:30:00-03:00'); // jue 20, ya terminó

  // Carrito con una línea de Argentina y una de otra categoría, para que se vea
  // que el 50% NO se derrama al resto del catálogo.
  const carritoAr = [
    { id: 'sticker:argentina-72:6cm', title: 'Argentina #72', type: 'sticker', basePrice: priceForSize('6cm'), quantity: 6 },
    { id: 'sticker:anime-3:6cm', title: 'Anime #3', type: 'sticker', basePrice: priceForSize('6cm'), quantity: 6 },
    { id: 'pack:mayorista:6cm:1', title: 'Pack Mayorista', type: 'pack', basePrice: round(priceForSize('6cm') * 0.5), quantity: 100 }
  ];

  it('constantes espejadas idénticas front ↔ back', () => {
    expect(PROMO_ARGENTINA.categoria).toBe(ARGENTINA_CATEGORIA);
    expect(PROMO_ARGENTINA.discount).toBe(ARGENTINA_DISCOUNT);
    expect(PROMO_ARGENTINA_START_MS).toBe(ARGENTINA_START_MS);
    expect(PROMO_ARGENTINA_END_MS).toBe(ARGENTINA_END_MS);
    expect(PROMO_ARGENTINA.activa).toBe(ARGENTINA_ACTIVA);
    expect(Number.isFinite(PROMO_ARGENTINA_START_MS)).toBe(true);
    expect(PROMO_ARGENTINA_START_MS).toBeLessThan(PROMO_ARGENTINA_END_MS);
  });

  it('la ventana abre el lunes 17 a las 00:00 y cierra el miércoles 19 a las 23:59', () => {
    vi.useFakeTimers();
    for (const [t, esperado] of [[ANTES, false], [DURANTE, true], [DESPUES, false]]) {
      vi.setSystemTime(t);
      expect(isArgentinaPromoActive()).toBe(esperado);
      expect(isArgentinaActive()).toBe(esperado); // el server dice lo mismo
    }
    // Los bordes exactos, que es donde se cae una promo mal fechada.
    vi.setSystemTime(new Date(PROMO_ARGENTINA_START_MS - 1));
    expect(isArgentinaPromoActive()).toBe(false);
    vi.setSystemTime(new Date(PROMO_ARGENTINA_START_MS));
    expect(isArgentinaPromoActive()).toBe(true);
    vi.setSystemTime(new Date(PROMO_ARGENTINA_END_MS));
    expect(isArgentinaPromoActive()).toBe(true);
    vi.setSystemTime(new Date(PROMO_ARGENTINA_END_MS + 1));
    expect(isArgentinaPromoActive()).toBe(false);
  });

  it('la categoría sale del id sin romper los slugs con guiones', () => {
    expect(categoriaDeStickerId('argentina-72')).toBe('argentina');
    expect(categoriaDeStickerId('autos-y-motos-127')).toBe('autos-y-motos');
    expect(categoriaDeStickerId('futbol-boca-5')).toBe('futbol-boca');
    expect(categoriaDeStickerId('anime-1')).toBe('anime');
  });

  it('solo entra el catálogo de argentina: ni otras categorías, ni packs, ni custom', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    for (const [id, esperado] of [
      ['sticker:argentina-1:4cm', true],
      ['sticker:argentina-129:9cm', true],
      ['sticker:anime-3:6cm', false],
      // Una categoría que TERMINA en algo parecido no entra: se compara exacto.
      ['sticker:futbol-argentina-5:6cm', false],
      ['custom:6cm:silueta:1', false],
      ['pack:mayorista100:6cm:1', false],
      ['negocio:1', false]
    ]) {
      expect(feEsPromoArgentina(id)).toBe(esperado);
      expect(beEsPromoArgentina(id)).toBe(esperado); // espejo
    }
  });

  it('fuera de la ventana no descuenta nada, ni antes ni después', () => {
    vi.useFakeTimers();
    for (const t of [ANTES, DESPUES]) {
      vi.setSystemTime(t);
      const items = clientItems(carritoAr);
      expect(price(items, 'sticker:argentina-72:6cm')).toBe(1600);
      const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago' });
      expect(res.ok).toBe(true);
    }
  });

  it('durante la promo: Argentina a mitad de precio y el resto intacto', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    const items = clientItems(carritoAr);
    expect(price(items, 'sticker:argentina-72:6cm')).toBe(800);
    expect(price(items, 'sticker:anime-3:6cm')).toBe(1600);
    expect(price(items, 'pack:mayorista:6cm:1')).toBe(800); // el pack ya valía 800, no se toca
    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago' });
    expect(res.ok).toBe(true);
  });

  it('ACUMULA: 50% + 10% por transferencia = 60% (y el resto solo 10%)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    const items = clientItems(carritoAr, { paymentMethod: 'transferencia' });
    expect(price(items, 'sticker:argentina-72:6cm')).toBe(round(1600 * 0.4)); // 640
    expect(price(items, 'sticker:anime-3:6cm')).toBe(round(1600 * 0.9)); // 1440
    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'transferencia' });
    expect(res.ok).toBe(true);
  });

  it('ACUMULA: 50% + transferencia + EPICA10 = 70%', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    const items = clientItems(carritoAr, { paymentMethod: 'transferencia', coupon: 'EPICA10' });
    expect(price(items, 'sticker:argentina-72:6cm')).toBe(round(1600 * 0.3)); // 480
    expect(price(items, 'sticker:anime-3:6cm')).toBe(round(1600 * 0.8)); // 1280
    const res = validateAndPriceOrder({
      items, shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10'
    });
    expect(res.ok).toBe(true);
    expect(res.couponApplied).toBe('EPICA10');
  });

  it('nunca pasa del tope de seguridad', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    const items = clientItems(carritoAr, { paymentMethod: 'transferencia', coupon: 'EPICA10' });
    const unit = price(items, 'sticker:argentina-72:6cm');
    expect(unit).toBeGreaterThanOrEqual(round(1600 * (1 - MAX_STICKER_DISCOUNT)));
  });

  it('un precio de Argentina sin el descuento se rechaza (y con él, se acepta)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    const base = [{ id: 'sticker:argentina-72:6cm', title: 'Argentina #72', quantity: 2, unit_price: 1600 }];
    const malo = validateAndPriceOrder({ items: base, shipping: retiro, paymentMethod: 'mercadopago' });
    expect(malo.ok).toBe(false);
    expect(malo.error).toBe('price_mismatch');

    const bueno = validateAndPriceOrder({
      items: [{ ...base[0], unit_price: 800 }], shipping: retiro, paymentMethod: 'mercadopago'
    });
    expect(bueno.ok).toBe(true);
  });

  it('el precio con descuento QUEDA RECHAZADO una vez que la promo termina', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DESPUES);
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:argentina-72:6cm', title: 'Argentina #72', quantity: 2, unit_price: 800 }],
      shipping: retiro,
      paymentMethod: 'mercadopago'
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('price_mismatch');
  });

  it('no se pisa con la mayorista: cuando arranca Argentina, la de 100 ya venció', () => {
    expect(PROMO_ARGENTINA_START_MS).toBeGreaterThan(MAYORISTA100_END_MS);
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    expect(isMayorista100Active()).toBe(false);
    expect(isMayoristaPromoActive()).toBe(false);
    expect(feActive()).toBe(false); // la 3x2 también está vencida
  });
});

/**
 * ─── EL CARRITO MUESTRA LO QUE EL CLIENTE PAGA ────────────────────────────────
 *
 * Los tests de arriba cubren un eje: "lo que el cliente MANDA == lo que el
 * servidor VALIDA". Este bloque cubre el otro, que no tenía ninguno y por eso
 * dejó pasar el defecto de la spec 001: "lo que el cliente VE == lo que PAGA".
 *
 * El carrito mostraba `basePrice` (precio de lista) mientras la grilla, la ficha
 * y el total del checkout ya mostraban la promo por categoría: el mismo calco de
 * Argentina valía $800 en la grilla, $1.600 en el carrito y $800 en el checkout.
 */
describe('el carrito muestra lo que el cliente paga (spec 001)', () => {
  const ANTES = new Date('2026-08-16T23:30:00-03:00');
  const DURANTE = new Date('2026-08-18T12:00:00-03:00');
  const DESPUES = new Date('2026-08-20T00:30:00-03:00');

  const linea = (id, size = '6cm', extra = {}) => ({
    id,
    type: id.split(':')[0],
    basePrice: priceForSize(size),
    quantity: 1,
    ...extra
  });

  const enPromo = linea('sticker:argentina-72:6cm');
  const otraCategoria = linea('sticker:anime-3:6cm');

  it('T-1 · un calco de la categoría en promo se muestra a mitad de precio', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    expect(precioVidrieraLinea(enPromo)).toBe(800);
    expect(enPromo.basePrice).toBe(1600); // la línea NO se modificó
  });

  it('T-2 · un calco de otra categoría se muestra al precio de lista', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    expect(precioVidrieraLinea(otraCategoria)).toBe(1600);
  });

  it('T-3 · fuera de la ventana (antes y después) vale el precio de lista', () => {
    vi.useFakeTimers();
    for (const t of [ANTES, DESPUES]) {
      vi.setSystemTime(t);
      expect(precioVidrieraLinea(enPromo)).toBe(1600);
    }
  });

  /**
   * EL TEST CENTRAL. Con Mercado Pago y sin cupón no hay ningún descuento que
   * dependa del carrito, así que lo que el carrito MUESTRA tiene que ser
   * exactamente lo que el servidor COBRA. Si alguien vuelve a desincronizar
   * vidriera y checkout, este test se pone rojo.
   */
  it('T-4 · lo que muestra el carrito == lo que valida el servidor (MP, sin cupón)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    for (const l of [enPromo, otraCategoria]) {
      const visto = precioVidrieraLinea(l);
      const res = validateAndPriceOrder({
        items: [{ id: l.id, title: 'x', quantity: 1, unit_price: visto }],
        shipping: retiro,
        paymentMethod: 'mercadopago'
      });
      expect(res.ok).toBe(true);
      expect(res.items[0].unit_price).toBe(visto);
    }
  });

  it('T-5 · con transferencia y ≥10 unidades, vidriera − bulkSavings == lo que cobra el server', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    const l = { ...enPromo, quantity: 10 };
    const visto = precioVidrieraLinea(l); // 800
    // bulkSavings del CartContext: basePrice − round(basePrice × 0,9)
    const bulkSavings = l.basePrice - round(l.basePrice * (1 - BULK_DISCOUNT)); // 160
    const esperado = visto - bulkSavings; // 640

    const res = validateAndPriceOrder({
      items: [{ id: l.id, title: 'x', quantity: 10, unit_price: esperado }],
      shipping: retiro,
      paymentMethod: 'transferencia'
    });
    expect(res.ok).toBe(true);
    expect(esperado).toBe(round(l.basePrice * (1 - (ARGENTINA_DISCOUNT + BULK_DISCOUNT))));
  });

  it('T-6 · cupón + transferencia + promo acumulan 70% y quedan bajo el tope', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    const rate = ARGENTINA_DISCOUNT + BULK_DISCOUNT + COUPONS.EPICA10.discount;
    expect(rate).toBeLessThan(MAX_STICKER_DISCOUNT);

    const res = validateAndPriceOrder({
      items: [{ id: enPromo.id, title: 'x', quantity: 10, unit_price: round(1600 * (1 - rate)) }],
      shipping: retiro,
      paymentMethod: 'transferencia',
      couponCode: 'EPICA10'
    });
    expect(res.ok).toBe(true);
    expect(res.items[0].unit_price).toBe(480); // 1600 × 0,30
  });

  it('T-7 · packs, custom, negocio, fixed y digital NO reciben el 50%', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    const ajenas = [
      { id: 'pack:mayorista:6cm:1', basePrice: 800 },
      { id: 'custom:6cm:silueta:1', basePrice: 1600 },
      { id: 'negocio:1', basePrice: 39999 },
      { id: 'fixed:tatuajes-hoja', basePrice: 12000 },
      { id: 'digital:pack-stickers', basePrice: 5999 }
    ];
    for (const l of ajenas) expect(precioVidrieraLinea(l)).toBe(l.basePrice);
  });

  it('T-8 · el carrito y la grilla muestran el MISMO precio', () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURANTE);
    for (const size of ['4cm', '6cm', '9cm']) {
      const l = linea('sticker:argentina-72:' + size, size);
      expect(precioVidrieraLinea(l)).toBe(precioVidriera('argentina-72', size).price);
    }
  });

  /**
   * RNF-5 — el requisito más delicado de la spec. Si el precio de vidriera se
   * hubiera guardado en `basePrice` al agregar, un carrito armado durante la
   * promo y retomado después mandaría 800 cuando el server ya espera 1600, y el
   * `price_mismatch` le trabaría TODO el checkout (no solo esa línea).
   */
  it('T-9 · un carrito guardado durante la promo sigue siendo válido después', () => {
    vi.useFakeTimers();

    // Se agrega DURANTE la promo: la línea guarda el precio de LISTA.
    vi.setSystemTime(DURANTE);
    const guardada = { ...enPromo };
    expect(guardada.basePrice).toBe(1600);
    expect(precioVidrieraLinea(guardada)).toBe(800);

    // Vuelve DESPUÉS: el precio mostrado sube solo y el server lo acepta.
    vi.setSystemTime(DESPUES);
    const visto = precioVidrieraLinea(guardada);
    expect(visto).toBe(1600);

    const res = validateAndPriceOrder({
      items: [{ id: guardada.id, title: 'x', quantity: 1, unit_price: visto }],
      shipping: retiro,
      paymentMethod: 'mercadopago'
    });
    expect(res.ok).toBe(true);
  });
});

/**
 * ─── LAS GUARDAS DEL PAYLOAD (spec 003, P4) ───────────────────────────────────
 *
 * Los límites anti-abuso de `validateAndPriceOrder`. Hasta la spec 003 estaban
 * cubiertos `item_invalid`, `price_mismatch` y `shipping_invalid`, pero no los
 * cuatro que frenan un payload directamente malformado o abusivo.
 *
 * No son reglas comerciales: son el borde donde el servidor decide que algo ni
 * siquiera merece que se le calcule un precio.
 */
describe('las guardas del payload (spec 003)', () => {
  const item = (extra = {}) => ({
    id: 'sticker:goku:6cm',
    title: 'Goku 6cm',
    quantity: 1,
    unit_price: priceForSize('6cm'),
    ...extra
  });
  const validar = (items) => validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago' });

  it('carrito vacío → items_empty', () => {
    expect(validar([]).error).toBe('items_empty');
    expect(validar(null).error).toBe('items_empty');
    expect(validar(undefined).error).toBe('items_empty');
    expect(validar('no soy un array').error).toBe('items_empty');
  });

  it('más de 130 líneas → too_many_lines', () => {
    // El tope deja pasar los 100 archivos del configurador + calcos de catálogo.
    expect(validar(Array.from({ length: 130 }, () => item())).ok).toBe(true);
    const res = validar(Array.from({ length: 131 }, () => item()));
    expect(res.ok).toBe(false);
    expect(res.error).toBe('too_many_lines');
  });

  it('cantidades fuera de rango → quantity_invalid', () => {
    for (const quantity of [0, -1, 1001, 2.5, NaN, null, undefined, 'tres', {}]) {
      const res = validar([item({ quantity })]);
      expect(res.ok, `quantity=${String(quantity)} debería rechazarse`).toBe(false);
      expect(res.error).toBe('quantity_invalid');
    }
  });

  it('una cantidad numérica en string SE ACEPTA: el servidor la coacciona', () => {
    // `Number(raw.quantity)` convierte antes de validar, así que un cliente que
    // mande "3" en vez de 3 no queda afuera. Sigue verificándose que sea entero
    // y esté en rango, así que la coacción no abre ningún agujero.
    const res = validar([item({ quantity: '3' })]);
    expect(res.ok).toBe(true);
    expect(res.items[0].quantity).toBe(3);
  });

  it('el borde de la cantidad: 1 y 1000 se aceptan', () => {
    expect(validar([item({ quantity: 1 })]).ok).toBe(true);
    // 1000 unidades de un calco: el precio unitario no cambia por cantidad.
    expect(validar([item({ quantity: 1000 })]).ok).toBe(true);
  });

  it('precios que no son números → price_invalid', () => {
    for (const unit_price of [NaN, 'abc', undefined, Infinity, -Infinity, {}]) {
      const res = validar([item({ unit_price })]);
      expect(res.ok, `unit_price=${String(unit_price)} debería rechazarse`).toBe(false);
      expect(res.error).toBe('price_invalid');
    }
  });

  it('un precio null se coacciona a 0 y cae en price_mismatch (igual se rechaza)', () => {
    // `Number(null)` es 0, que SÍ es finito: pasa la guarda de forma y lo frena
    // el reprecio. Distinto código de error, mismo resultado — el pedido no
    // entra. Ningún ítem puede valer 0: el tope de descuento es 90 %.
    const res = validar([item({ unit_price: null })]);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('price_mismatch');
  });

  it('item sin id o sin título → item_invalid', () => {
    expect(validar([item({ id: '' })]).error).toBe('item_invalid');
    expect(validar([item({ title: '' })]).error).toBe('item_invalid');
    expect(validar([item({ title: '   ' })]).error).toBe('item_invalid');
  });

  it('un título largo se RECORTA a 150, no rechaza el pedido', () => {
    const res = validar([item({ title: 'x'.repeat(200) })]);
    expect(res.ok).toBe(true);
    expect(res.items[0].title).toHaveLength(150);
  });

  it('las guardas corren ANTES de calcular precios (un payload roto no llega al reprecio)', () => {
    // Cantidad inválida + precio adulterado: gana la guarda, no price_mismatch.
    const res = validar([item({ quantity: 0, unit_price: 1 })]);
    expect(res.error).toBe('quantity_invalid');
  });
});
