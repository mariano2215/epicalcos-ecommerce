import { describe, it, expect, vi, afterEach } from 'vitest';
// Frontend (fuente de verdad del cliente)
import {
  PROMO_END_MS as FE_END,
  PROMO_3X2,
  promo3x2 as fePromo3x2,
  isPromoActive as feActive,
  priceForSize,
  findCoupon,
  round,
  BULK_THRESHOLD,
  BULK_DISCOUNT,
  MAX_STICKER_DISCOUNT
} from '../config/pricing.js';
// Backend: el que re-precia el checkout (rechaza si no coincide).
import {
  PROMO_END_MS as BE_END,
  PROMO_PERCENT_CAP,
  promo3x2 as bePromo3x2,
  isPromoActive as beActive,
  validateAndPriceOrder
} from '../../../netlify/functions/lib/pricing.js';

const PROMO_ELIGIBLE = new Set(['sticker', 'custom']);
const DURING_PROMO = new Date('2026-07-24T12:00:00-03:00'); // vie 24/7, promo vigente
const AFTER_PROMO = new Date('2026-07-27T12:00:00-03:00'); // lun 27/7, promo vencida

afterEach(() => vi.useRealTimers());

/** Espejo de CartContext.pricedItems: arma el payload que MANDA el cliente. */
function clientItems(cart, { paymentMethod = 'mercadopago', coupon = '' } = {}) {
  const promoActive = feActive();
  const stickerUnits = cart.filter((l) => l.type === 'sticker').reduce((a, l) => a + l.quantity, 0);
  const bulkRate = stickerUnits >= BULK_THRESHOLD && paymentMethod === 'transferencia' ? BULK_DISCOUNT : 0;
  const couponRate = findCoupon(coupon)?.discount || 0;
  const cap = promoActive ? PROMO_3X2.percentCap : MAX_STICKER_DISCOUNT;
  const percentRate = Math.min(bulkRate + couponRate, cap);

  let keep = 1;
  if (promoActive) {
    const prices = [];
    for (const l of cart) if (PROMO_ELIGIBLE.has(l.type)) for (let k = 0; k < l.quantity; k++) prices.push(l.basePrice);
    keep = fePromo3x2({ unitBasePrices: prices }).keepFraction;
  }

  return cart.map((l) => {
    let price;
    if (promoActive && PROMO_ELIGIBLE.has(l.type)) price = round(l.basePrice * keep * (1 - percentRate));
    else if (!promoActive && l.type === 'sticker') price = round(l.basePrice * (1 - percentRate));
    else price = l.basePrice;
    return { id: l.id, title: l.title, quantity: l.quantity, unit_price: price };
  });
}

// Carrito de prueba: catálogo (2×6cm + 1×9cm) + personalizados (10× vinilo 4cm) + un pack (excluido).
const cart = [
  { id: 'sticker:goku:6cm', title: 'Goku 6cm', type: 'sticker', basePrice: priceForSize('6cm'), quantity: 2 },
  { id: 'sticker:naruto:9cm', title: 'Naruto 9cm', type: 'sticker', basePrice: priceForSize('9cm'), quantity: 1 },
  { id: 'custom:vinilo-blanco:4cm:silueta:1', title: 'Custom 4cm x10', type: 'custom', basePrice: 1200, quantity: 10 },
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
    expect(price(items, 'custom:vinilo-blanco:4cm:silueta:1')).toBe(round(1200 * keep));
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
    expect(price(items, 'custom:vinilo-blanco:4cm:silueta:1')).toBe(round(1200 * keep * 0.9));
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
    expect(price(items, 'custom:vinilo-blanco:4cm:silueta:1')).toBe(1200);
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
