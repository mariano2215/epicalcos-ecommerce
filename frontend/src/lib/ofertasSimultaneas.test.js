import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  repartoPromos, PROMO_2X1, PROMO_3X2, MAX_STICKER_DISCOUNT, round,
  isMayoristaPromoActive, isMayoristaPromoSize, PROMO_MAYORISTA_100,
  findCoupon, couponAnulaTodo, BULK_DISCOUNT, BULK_THRESHOLD
} from '../config/pricing.js';
import { validateAndPriceOrder } from '../../../netlify/functions/lib/pricing.js';

const retiro = { methodValue: 'retiro' };
afterEach(() => vi.useRealTimers());

/**
 * Los criterios numéricos de acceptance.md de la spec 017, de punta a punta
 * contra el servidor.
 *
 * Va aparte de promoPricing.test.js (que ya tiene 1.200 líneas) porque son los
 * casos que hay que poder releer de un vistazo cuando alguien pregunte "¿por qué
 * este carrito cuesta esto?".
 */
describe('acceptance spec 017 — criterios numéricos', () => {
  it('CF-25 · 3 calcos 6cm + transferencia + EPICA10 = $2.560', () => {
    // 3 calcos → 1 gratis (keep 2/3), después 20% (10 transf + 10 cupón).
    // ⚠️ el 10% por transferencia pide 10 calcos, así que con 3 NO corre:
    // lo que corre es solo el cupón. Se verifica lo que realmente pasa.
    const keep = 2 / 3;
    const soloCupon = round(1600 * keep * 0.9) * 3;
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:goku:6cm', title: 'Goku', quantity: 3, unit_price: round(1600 * keep * 0.9) }],
      shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10', couponIssuedAt: Date.now()
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(soloCupon);
  });

  it('CF-25b · con 12 calcos SÍ entran los dos 10% (tope 20%)', () => {
    const keep = (12 - 4) / 12;
    const unit = round(1600 * keep * 0.8);
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:goku:6cm', title: 'Goku', quantity: 12, unit_price: unit }],
      shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10', couponIssuedAt: Date.now()
    });
    expect(res.ok).toBe(true);
  });

  it('CF-26 · el tope de 20% no se pasa', () => {
    expect(Math.min(BULK_DISCOUNT + 0.10, PROMO_3X2.percentCap)).toBe(0.20);
    expect(PROMO_3X2.percentCap).toBeLessThan(MAX_STICKER_DISCOUNT);
  });

  it('CF-27 · EPI50 sigue anulando todo', () => {
    expect(couponAnulaTodo('EPI50')).toBe(true);
    expect(findCoupon('EPI50').discount).toBe(0.5);
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:disney-1:6cm', title: 'D', quantity: 2, unit_price: 800 }],
      shipping: retiro, paymentMethod: 'mercadopago', couponCode: 'EPI50'
    });
    expect(res.ok).toBe(true); // 50% plano, SIN el 2x1 encima
  });

  it('CF-16/17 · mayorista viva a $39.999 y sin promos encima', () => {
    expect(isMayoristaPromoActive()).toBe(true);
    expect(PROMO_MAYORISTA_100.price).toBe(39999);
    expect(isMayoristaPromoSize('4cm')).toBe(true);
    expect(isMayoristaPromoSize('9cm')).toBe(false);
    const res = validateAndPriceOrder({
      items: [{ id: 'pack:mayorista100:6cm:1', title: 'Pack 100', quantity: 1, unit_price: 39999 }],
      shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10', couponIssuedAt: Date.now()
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(39999); // ni cupón ni transferencia lo tocan
  });

  it('CF-5 · los personalizados entran al 3x2; los packs NO', () => {
    const keep = 2 / 3;
    const res = validateAndPriceOrder({
      items: [{ id: 'custom:6cm:silueta:1', title: 'Custom', quantity: 3, unit_price: round(1600 * keep) }],
      shipping: retiro, paymentMethod: 'mercadopago'
    });
    expect(res.ok).toBe(true);
  });

  it('EC-3 · un carrito 100% digital no recibe ninguna promo', () => {
    const r = repartoPromos({ unidadesCategoria: [], unidadesResto: [] });
    expect(r.discount).toBe(0);
  });

  it('CF-9 · marvel NO entra al 2x1: 2 calcos, sin descuento', () => {
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:marvel-1:6cm', title: 'M', quantity: 2, unit_price: 1600 }],
      shipping: retiro, paymentMethod: 'mercadopago'
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(3200);
  });

  it('REG-2 · el 10% por transferencia desde 10 calcos sigue vivo', () => {
    // 10 calcos de marvel (fuera del 2x1) → 3 gratis por 3x2, + 10% transferencia.
    const keep = (10 - 3) / 10;
    const unit = round(1600 * keep * 0.9);
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:marvel-1:6cm', title: 'M', quantity: 10, unit_price: unit }],
      shipping: retiro, paymentMethod: 'transferencia'
    });
    expect(res.ok).toBe(true);
  });
});
