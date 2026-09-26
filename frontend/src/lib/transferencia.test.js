import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SIZES,
  NEGOCIO,
  TATUAJES,
  IMPRIMIBLES,
  POLAROID_SIZES,
  POLAROID_VOLUMEN_OFF_PACK,
  PROMO_MAYORISTA_100,
  TRANSFER_DISCOUNT,
  PROMO_3X2,
  priceForSize,
  round
} from '../config/pricing.js';
import { RECARGO_HOLOGRAFICO } from '../config/personalizados.js';
import { shipping } from '../config/site.js';
import { precioBaseVigente, conPrecioVigente } from './precioVigente.js';
import { validateAndPriceOrder } from '../../../netlify/functions/lib/pricing.js';

/**
 * Spec 027 (26/9/2026): precios +20 % y 15 % OFF por transferencia en cualquier
 * compra, desde 1 unidad, sobre TODO producto. Estos son los criterios de
 * `specs/027-precios-mas-20-y-transferencia-15/acceptance.md` contra el
 * servidor real.
 */

/** Sin promos por fecha vivas (3x2/2x1/mayorista arrancan el 7/9/2026). */
const SIN_PROMOS = new Date('2026-08-29T12:00:00-03:00');
const T = TRANSFER_DISCOUNT;
const retiro = { methodValue: 'retiro' };
const conT = (precio) => round(precio * (1 - T));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(SIN_PROMOS);
});
afterEach(() => vi.useRealTimers());

describe('AC-1 · la tabla de precios de la spec 027 (requirements §9.1)', () => {
  it('calcos por tamaño', () => {
    expect(Object.fromEntries(SIZES.map((s) => [s.id, s.price]))).toEqual({ '4cm': 1450, '6cm': 1900, '9cm': 2400 });
  });

  it('packs, Negocio, holográfico, tatuajes, imprimibles', () => {
    expect(PROMO_MAYORISTA_100.price).toBe(47999);
    expect(NEGOCIO).toMatchObject({ price: 47999, listPrice: 115999 });
    expect(RECARGO_HOLOGRAFICO.precio).toBe(18000);
    expect(TATUAJES.price).toBe(14500);
    expect(IMPRIMIBLES.find((p) => p.id === 'pack-stickers')).toMatchObject({ price: 11999, listPrice: 47999 });
  });

  it('Polaroid y su descuento por volumen', () => {
    expect(POLAROID_SIZES.map((s) => [s.id, s.price, s.priceIman])).toEqual([
      ['5x8', 11000, 18000],
      ['7x10', 14500, 21500],
      ['9x13', 18000, 25000]
    ]);
    expect(POLAROID_VOLUMEN_OFF_PACK).toBe(2500);
  });

  it('los envíos NO cambian (decisión de Mariano)', () => {
    expect(shipping.freeShippingThresholdRosario).toBe(35000);
    expect(shipping.freeShippingThresholdNational).toBe(50000);
  });
});

describe('AC-2…4 · 15 % por transferencia, desde 1, sobre todo producto, sin tocar el envío', () => {
  it('AC-2 · 1 calco de 6 cm: $1.900 → $1.615', () => {
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:marvel-1:6cm', title: 'M', quantity: 1, unit_price: 1615 }],
      shipping: retiro,
      paymentMethod: 'transferencia'
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(1615);
    expect(conT(priceForSize('6cm'))).toBe(1615);
  });

  it('AC-3 · packs, Negocio, holográfico, Polaroid, tatuajes, imprimibles y personalizados: −15 %', () => {
    const p6 = priceForSize('6cm');
    const lineas = [
      { id: 'pack:mayorista:6cm:1', quantity: 100, base: round(p6 * 0.5) },
      { id: 'pack:personalizados:6cm:1', quantity: 10, base: round(p6 * 0.9) },
      { id: 'negocio:1', quantity: 1, base: NEGOCIO.price },
      { id: 'negocio:vinilo-holografico:4cm:7', quantity: 1, base: NEGOCIO.price },
      { id: 'fixed:material-holografico:7', quantity: 1, base: RECARGO_HOLOGRAFICO.precio },
      { id: 'fixed:tatuajes-hoja', quantity: 1, base: TATUAJES.price },
      { id: 'fixed:polaroid-x10-7x10-iman', quantity: 2, base: 21500 - POLAROID_VOLUMEN_OFF_PACK },
      { id: 'custom:6cm:silueta:vinilo-blanco:f1', quantity: 5, base: p6 }
    ];
    const res = validateAndPriceOrder({
      items: lineas.map((l) => ({ id: l.id, title: l.id, quantity: l.quantity, unit_price: conT(l.base) })),
      shipping: retiro,
      paymentMethod: 'transferencia'
    });
    expect(res.ok, `${res.error} ${res.detail || ''}`).toBe(true);
    expect(res.itemsTotal).toBe(lineas.reduce((a, l) => a + conT(l.base) * l.quantity, 0));

    // Un pedido de solo archivos también.
    const digital = IMPRIMIBLES[0];
    const soloDigital = validateAndPriceOrder({
      items: [{ id: `digital:${digital.id}`, title: 'x', quantity: 1, unit_price: conT(digital.price) }],
      shipping: retiro,
      paymentMethod: 'transferencia'
    });
    expect(soloDigital.ok).toBe(true);
  });

  it('con Mercado Pago, ninguno de esos tiene descuento', () => {
    const res = validateAndPriceOrder({
      items: [{ id: 'fixed:tatuajes-hoja', title: 'x', quantity: 1, unit_price: conT(TATUAJES.price) }],
      shipping: retiro,
      paymentMethod: 'mercadopago'
    });
    expect(res.error).toBe('price_mismatch');
  });

  it('AC-4 · el envío se cobra entero', () => {
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:marvel-1:6cm', title: 'M', quantity: 1, unit_price: conT(priceForSize('6cm')) }],
      shipping: { methodValue: 'envio', name: 'A', address: 'B', zip: '2000', city: 'Rosario', province: 'Santa Fe' },
      paymentMethod: 'transferencia'
    });
    expect(res.ok).toBe(true);
    expect(res.shippingCost).toBe(shipping.costRosario);
  });
});

describe('AC-5…7 · cómo se combina', () => {
  it('AC-5 · con el 3x2, EPICA10 + transferencia = 25 % encima (el tope)', () => {
    vi.setSystemTime(new Date('2026-09-10T12:00:00-03:00'));
    expect(PROMO_3X2.percentCap).toBe(0.25);
    const p6 = priceForSize('6cm');
    const unit = round(p6 * (2 / 3) * 0.75);
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:marvel-1:6cm', title: 'M', quantity: 3, unit_price: unit }],
      shipping: retiro,
      paymentMethod: 'transferencia',
      couponCode: 'EPICA10',
      couponIssuedAt: Date.now()
    });
    expect(res.ok).toBe(true);
  });

  it('AC-6 · EPI50 + transferencia: ningún 15 %, en ninguna línea', () => {
    const res = validateAndPriceOrder({
      items: [
        { id: 'sticker:marvel-1:6cm', title: 'M', quantity: 1, unit_price: round(priceForSize('6cm') * 0.5) },
        { id: 'fixed:tatuajes-hoja', title: 'T', quantity: 1, unit_price: TATUAJES.price }
      ],
      shipping: retiro,
      paymentMethod: 'transferencia',
      couponCode: 'EPI50'
    });
    expect(res.ok).toBe(true);
  });

  it('AC-7 · Argentina + transferencia = 65 %', () => {
    vi.setSystemTime(new Date('2026-08-18T12:00:00-03:00')); // promo Argentina viva
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:argentina-72:6cm', title: 'A', quantity: 1, unit_price: round(priceForSize('6cm') * 0.35) }],
      shipping: retiro,
      paymentMethod: 'transferencia'
    });
    expect(res.ok).toBe(true);
  });
});

describe('AC-11 · un carrito guardado con los precios de antes se cobra al precio nuevo', () => {
  /** Líneas tal como quedaron en localStorage el 25/9, con el `basePrice` viejo. */
  const guardado = [
    { id: 'sticker:goku-1:6cm', type: 'sticker', basePrice: 1600, quantity: 2 },
    { id: 'custom:4cm:silueta:vinilo-blanco:f1', type: 'custom', basePrice: 1200, quantity: 3 },
    { id: 'pack:mayorista:9cm:1', type: 'pack', basePrice: 1000, quantity: 100 },
    { id: 'pack:personalizados:6cm:2', type: 'pack', basePrice: 1440, quantity: 10 },
    { id: 'negocio:3', type: 'negocio', basePrice: 39999, quantity: 1 },
    { id: 'negocio:vinilo-holografico:6cm:4', type: 'negocio', basePrice: 39999, quantity: 1 },
    { id: 'fixed:material-holografico:4', type: 'fixed', basePrice: 15000, quantity: 1 },
    { id: 'fixed:tatuajes-hoja', type: 'fixed', basePrice: 12000, quantity: 1 },
    { id: 'fixed:polaroid-x10-9x13-iman:1757', type: 'fixed', basePrice: 21000, quantity: 1 },
    { id: 'digital:pack-stickers', type: 'digital', basePrice: 9999, quantity: 1 }
  ];

  it('precioBaseVigente devuelve el de lista de hoy para cada tipo de línea', () => {
    expect(guardado.map(precioBaseVigente)).toEqual([
      1900,
      1450,
      1200, // 2.400 × 50 %
      1710, // 1.900 × 90 %
      47999,
      47999,
      18000,
      14500,
      25000,
      11999
    ]);
  });

  it('un id que no se reconoce conserva su precio guardado', () => {
    const rara = { id: 'algo:nuevo', basePrice: 123 };
    expect(precioBaseVigente(rara)).toBe(123);
    expect(conPrecioVigente(rara)).toBe(rara); // la misma línea, sin copiar
  });

  it('el carrito refrescado pasa el checkout del servidor (sin price_mismatch)', () => {
    const items = guardado.map(conPrecioVigente).map((l) => ({
      id: l.id,
      title: l.id,
      quantity: l.quantity,
      unit_price: l.basePrice
    }));
    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago' });
    expect(res.ok, `${res.error} ${res.detail || ''}`).toBe(true);

    // Y el mismo carrito SIN refrescar, como pasaba antes, se rechaza.
    const viejo = guardado.map((l) => ({ id: l.id, title: l.id, quantity: l.quantity, unit_price: l.basePrice }));
    expect(validateAndPriceOrder({ items: viejo, shipping: retiro, paymentMethod: 'mercadopago' }).error).toBe('price_mismatch');
  });
});
