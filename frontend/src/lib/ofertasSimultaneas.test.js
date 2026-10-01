import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  repartoPromos, PROMO_2X1, PROMO_3X2, MAX_STICKER_DISCOUNT, round,
  isMayoristaPromoActive, isMayoristaPromoSize, PROMO_MAYORISTA_100,
  findCoupon, couponAnulaTodo, TRANSFER_DISCOUNT, priceForSize
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
 *
 * Spec 027 (26/9/2026) y 029 (1/10/2026): precios +20 % y +10 %, y 20 % por
 * transferencia desde 1 calco y sobre todo producto, tope 30 % con cupón +
 * promo N x M. Los montos salen de
 * las constantes: escritos a mano, este archivo se rompía con cada cambio de
 * precio sin que ninguna regla hubiera cambiado.
 */
const P6 = priceForSize('6cm');
const T = TRANSFER_DISCOUNT;

// Los casos del 3x2 se saltean mientras esté apagado (desde el 1/10/2026) y
// vuelven a correr solos al prenderlo — ver `con3x2` en promoPricing.test.js.
const con3x2 = it.runIf(PROMO_3X2.activa);
describe('acceptance spec 017 — criterios numéricos (reglas de la spec 027)', () => {
  con3x2('CF-25 · 3 calcos 6cm + transferencia + EPICA10: 3x2 y después 25 % (15 + 10)', () => {
    // Hasta la spec 027 la transferencia pedía 10 calcos y acá corría solo el
    // cupón. Ahora corren los dos desde 1, topeados en PROMO_3X2.percentCap.
    const keep = 2 / 3;
    const unit = round(P6 * keep * (1 - (T + 0.1)));
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:goku:6cm', title: 'Goku', quantity: 3, unit_price: unit }],
      shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10', couponIssuedAt: Date.now()
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(unit * 3);
  });

  con3x2('CF-25b · con 12 calcos, igual: 3x2 y 25 %', () => {
    const keep = (12 - 4) / 12;
    const unit = round(P6 * keep * (1 - PROMO_3X2.percentCap));
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:goku:6cm', title: 'Goku', quantity: 12, unit_price: unit }],
      shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10', couponIssuedAt: Date.now()
    });
    expect(res.ok).toBe(true);
  });

  it('CF-26 · el tope es 30 % y entra justo transferencia + EPICA10 (spec 029)', () => {
    expect(T).toBe(0.2);
    expect(Math.min(T + findCoupon('EPICA10').discount, PROMO_3X2.percentCap)).toBeCloseTo(0.3, 10);
    expect(PROMO_3X2.percentCap).toBeLessThan(MAX_STICKER_DISCOUNT);
  });

  it('CF-27 · EPI50 sigue anulando todo (también la transferencia)', () => {
    expect(couponAnulaTodo('EPI50')).toBe(true);
    expect(findCoupon('EPI50').discount).toBe(0.5);
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:disney-1:6cm', title: 'D', quantity: 2, unit_price: round(P6 * 0.5) }],
      shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPI50'
    });
    expect(res.ok).toBe(true); // 50% plano, SIN el 2x1 ni el 20 % encima
  });

  it('CF-16/17 · mayorista viva a precio fijo: el cupón no la toca, la transferencia sí', () => {
    expect(isMayoristaPromoActive()).toBe(true);
    expect(PROMO_MAYORISTA_100.price).toBe(52999); // spec 029 ($47.999 desde la 027, antes $39.999)
    expect(isMayoristaPromoSize('4cm')).toBe(true);
    expect(isMayoristaPromoSize('9cm')).toBe(false);
    const conTransferencia = round(PROMO_MAYORISTA_100.price * (1 - T));
    const res = validateAndPriceOrder({
      items: [{ id: 'pack:mayorista100:6cm:1', title: 'Pack 100', quantity: 1, unit_price: conTransferencia }],
      shipping: retiro, paymentMethod: 'transferencia', couponCode: 'EPICA10', couponIssuedAt: Date.now()
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(conTransferencia);
  });

  con3x2('CF-5 · los personalizados entran al 3x2; los packs NO', () => {
    const keep = 2 / 3;
    const res = validateAndPriceOrder({
      items: [{ id: 'custom:6cm:silueta:1', title: 'Custom', quantity: 3, unit_price: round(P6 * keep) }],
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
      items: [{ id: 'sticker:marvel-1:6cm', title: 'M', quantity: 2, unit_price: P6 }],
      shipping: retiro, paymentMethod: 'mercadopago'
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(2 * P6);
  });

  it('REG-2 · el % por transferencia corre desde 1 calco (spec 027)', () => {
    const una = validateAndPriceOrder({
      items: [{ id: 'sticker:marvel-1:6cm', title: 'M', quantity: 1, unit_price: round(P6 * (1 - T)) }],
      shipping: retiro, paymentMethod: 'transferencia'
    });
    expect(una.ok).toBe(true);
  });

  // Mitad de REG-2 hasta el 1/10/2026: se separó para que la de arriba siga
  // corriendo con el 3x2 apagado.
  con3x2('REG-2b · con 10 calcos, el % por transferencia corre encima del 3x2', () => {
    // 10 de marvel (fuera del 2x1) → 3 gratis por 3x2, + 15 % encima.
    const keep = (10 - 3) / 10;
    const diez = validateAndPriceOrder({
      items: [{ id: 'sticker:marvel-1:6cm', title: 'M', quantity: 10, unit_price: round(P6 * keep * (1 - T)) }],
      shipping: retiro, paymentMethod: 'transferencia'
    });
    expect(diez.ok).toBe(true);
  });
});
