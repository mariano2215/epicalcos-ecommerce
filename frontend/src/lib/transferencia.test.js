import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SIZES,
  NEGOCIO,
  TATUAJES,
  IMPRIMIBLES,
  POLAROID_SIZES,
  POLAROID_VOLUMEN_OFF_PACK,
  POLAROID_IMAN_POR_FOTO,
  POLAROID_FOTOS_POR_PACK,
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

// Los casos del 3x2 se saltean mientras esté apagado (desde el 1/10/2026) y
// vuelven a correr solos al prenderlo — ver `con3x2` en promoPricing.test.js.
const con3x2 = it.runIf(PROMO_3X2.activa);

/**
 * Spec 029 (1/10/2026): precios +10 % y 20 % OFF por transferencia en cualquier
 * compra, desde 1 unidad, sobre TODO producto. Estos son los criterios de
 * `specs/029-precios-mas-10-y-transferencia-20/acceptance.md` contra el
 * servidor real.
 *
 * Hasta el 1/10/2026 este archivo verificaba la tabla de la spec 027 (+20 % y
 * 15 %); la 029 la reemplazó entera, y los casos siguen siendo los mismos.
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

describe('AC-1 · la tabla de precios de la spec 029 (requirements §9.1)', () => {
  it('calcos por tamaño', () => {
    expect(Object.fromEntries(SIZES.map((s) => [s.id, s.price]))).toEqual({ '4cm': 1600, '6cm': 2100, '9cm': 2650 });
  });

  it('packs, Negocio, holográfico, tatuajes, imprimibles', () => {
    expect(PROMO_MAYORISTA_100.price).toBe(52999);
    expect(NEGOCIO).toMatchObject({ price: 52999, listPrice: 127999 });
    expect(RECARGO_HOLOGRAFICO.precio).toBe(20000);
    expect(NEGOCIO.price + RECARGO_HOLOGRAFICO.precio).toBe(72999); // pack holográfico completo
    expect(TATUAJES.price).toBe(16000);
    expect(IMPRIMIBLES.find((p) => p.id === 'pack-stickers')).toMatchObject({ price: 12999, listPrice: 52999 });
  });

  it('Polaroid y su descuento por volumen', () => {
    expect(POLAROID_SIZES.map((s) => [s.id, s.price, s.priceIman])).toEqual([
      ['5x8', 12000, 19500],
      ['7x10', 16000, 23500],
      ['9x13', 20000, 27500]
    ]);
    expect(POLAROID_VOLUMEN_OFF_PACK).toBe(3000);
  });

  it('el recargo por imantar es el mismo en los tres tamaños ($750 por foto)', () => {
    // Por esto la 5×8 imantada es $19.500 y no los $20.000 del redondeo: la
    // página dice UN recargo por foto, y tiene que ser cierto en los tres.
    for (const s of POLAROID_SIZES) {
      expect(s.priceIman - s.price, s.id).toBe(POLAROID_IMAN_POR_FOTO * POLAROID_FOTOS_POR_PACK);
    }
    expect(POLAROID_IMAN_POR_FOTO).toBe(750);
  });

  it('los envíos NO cambian (decisión de Mariano)', () => {
    expect(shipping.freeShippingThresholdRosario).toBe(35000);
    expect(shipping.freeShippingThresholdNational).toBe(50000);
  });
});

describe('AC-2…4 · 20 % por transferencia, desde 1, sobre todo producto, sin tocar el envío', () => {
  it('AC-2 · 1 calco de 6 cm: $2.100 → $1.680', () => {
    expect(TRANSFER_DISCOUNT).toBe(0.2);
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:marvel-1:6cm', title: 'M', quantity: 1, unit_price: 1680 }],
      shipping: retiro,
      paymentMethod: 'transferencia'
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(1680);
    expect(conT(priceForSize('6cm'))).toBe(1680);
  });

  it('AC-3 · packs, Negocio, holográfico, Polaroid, tatuajes, imprimibles y personalizados: −20 %', () => {
    const p6 = priceForSize('6cm');
    const iman7x10 = POLAROID_SIZES.find((s) => s.id === '7x10').priceIman;
    const lineas = [
      { id: 'pack:mayorista:6cm:1', quantity: 100, base: round(p6 * 0.5) },
      { id: 'pack:personalizados:6cm:1', quantity: 10, base: round(p6 * 0.9) },
      { id: 'negocio:1', quantity: 1, base: NEGOCIO.price },
      { id: 'negocio:vinilo-holografico:4cm:7', quantity: 1, base: NEGOCIO.price },
      { id: 'fixed:material-holografico:7', quantity: 1, base: RECARGO_HOLOGRAFICO.precio },
      { id: 'fixed:tatuajes-hoja', quantity: 1, base: TATUAJES.price },
      { id: 'fixed:polaroid-x10-7x10-iman', quantity: 2, base: iman7x10 - POLAROID_VOLUMEN_OFF_PACK },
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
  it('AC-5 · EPICA10 + transferencia = 30 %', () => {
    const p6 = priceForSize('6cm');
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:marvel-1:6cm', title: 'M', quantity: 1, unit_price: round(p6 * 0.7) }],
      shipping: retiro,
      paymentMethod: 'transferencia',
      couponCode: 'EPICA10',
      couponIssuedAt: Date.now()
    });
    expect(res.ok, `${res.error} ${res.detail || ''}`).toBe(true);
  });

  con3x2('AC-5b · con el 3x2, EPICA10 + transferencia = 30 % encima (el tope)', () => {
    vi.setSystemTime(new Date('2026-09-10T12:00:00-03:00'));
    expect(PROMO_3X2.percentCap).toBe(0.3);
    const p6 = priceForSize('6cm');
    const unit = round(p6 * (2 / 3) * 0.7);
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:marvel-1:6cm', title: 'M', quantity: 3, unit_price: unit }],
      shipping: retiro,
      paymentMethod: 'transferencia',
      couponCode: 'EPICA10',
      couponIssuedAt: Date.now()
    });
    expect(res.ok).toBe(true);
  });

  it('AC-6 · EPI50 + transferencia: ningún 20 %, en ninguna línea', () => {
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

  // Argentina venció el 19/8/2026; el caso queda por si se reactiva (sumaría
  // 50 % + 20 % = 70 %, que es justo por qué no se reactivó en septiembre).
  it('Argentina + transferencia = 70 %', () => {
    vi.setSystemTime(new Date('2026-08-18T12:00:00-03:00')); // promo Argentina viva
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:argentina-72:6cm', title: 'A', quantity: 1, unit_price: round(priceForSize('6cm') * 0.3) }],
      shipping: retiro,
      paymentMethod: 'transferencia'
    });
    expect(res.ok).toBe(true);
  });
});

describe('AC-9 · un carrito guardado con los precios de antes se cobra al precio nuevo', () => {
  /**
   * Líneas tal como quedaron en localStorage el 30/9, con el `basePrice` de la
   * spec 027 (hasta el 1/10/2026 este bloque usaba los de antes de la 027).
   */
  const guardado = [
    { id: 'sticker:goku-1:6cm', type: 'sticker', basePrice: 1900, quantity: 2 },
    { id: 'custom:4cm:silueta:vinilo-blanco:f1', type: 'custom', basePrice: 1450, quantity: 3 },
    { id: 'pack:mayorista:9cm:1', type: 'pack', basePrice: 1200, quantity: 100 },
    { id: 'pack:personalizados:6cm:2', type: 'pack', basePrice: 1710, quantity: 10 },
    { id: 'negocio:3', type: 'negocio', basePrice: 47999, quantity: 1 },
    { id: 'negocio:vinilo-holografico:6cm:4', type: 'negocio', basePrice: 47999, quantity: 1 },
    { id: 'fixed:material-holografico:4', type: 'fixed', basePrice: 18000, quantity: 1 },
    { id: 'fixed:tatuajes-hoja', type: 'fixed', basePrice: 14500, quantity: 1 },
    { id: 'fixed:polaroid-x10-9x13-iman:1757', type: 'fixed', basePrice: 25000, quantity: 1 },
    { id: 'digital:pack-stickers', type: 'digital', basePrice: 11999, quantity: 1 }
  ];

  it('precioBaseVigente devuelve el de lista de hoy para cada tipo de línea', () => {
    expect(guardado.map(precioBaseVigente)).toEqual([
      2100,
      1600,
      1325, // 2.650 × 50 %
      1890, // 2.100 × 90 %
      52999,
      52999,
      20000,
      16000,
      27500,
      12999
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
