import { describe, it, expect, vi, afterEach } from 'vitest';
// Frontend: lo que ve el cliente en el resumen del checkout.
import { calculateShipping as feShipping, shipping } from '../config/site.js';
import {
  FREE_SHIPPING_PACK_TYPES as FE_FREE_SHIPPING_PACKS,
  packIncludesShipping as fePackIncludesShipping,
  lineaConEnvioGratis
} from '../config/pricing.js';
// Backend: el que se cobra de verdad (ignora el shipping.cost del cliente).
import {
  calculateShipping as beShipping,
  FREE_SHIPPING_PACK_TYPES as BE_FREE_SHIPPING_PACKS,
  packIncludesShipping as bePackIncludesShipping,
  validateAndPriceOrder
} from '../../../netlify/functions/lib/pricing.js';

const rosario = { city: 'Rosario', province: 'Santa Fe' };
const funes = { city: 'Funes', province: 'Santa Fe' };
const interior = { city: 'Córdoba', province: 'Córdoba' };

/** Ambas puntas tienen que devolver lo mismo, siempre. */
const both = (args) => {
  const fe = feShipping(args);
  const be = beShipping(args);
  expect(fe).toBe(be);
  return fe;
};

describe('costo de envío — paridad frontend ↔ backend', () => {
  it('retiro siempre gratis', () => {
    expect(both({ method: 'retiro', subtotal: 0, ...interior })).toBe(0);
  });

  it('Rosario: $4.500 y gratis desde $50.000', () => {
    expect(both({ method: 'envio', subtotal: 49999, ...rosario })).toBe(4500);
    expect(both({ method: 'envio', subtotal: 50000, ...rosario })).toBe(0);
  });

  it('resto del país: gratis desde $75.000 (ciudades próximas e interior)', () => {
    // Debajo del umbral, cada zona paga su costo.
    expect(both({ method: 'envio', subtotal: 74999, ...funes })).toBe(6500);
    expect(both({ method: 'envio', subtotal: 74999, ...interior })).toBe(8500);
    // Desde $75.000, gratis a todo el país.
    expect(both({ method: 'envio', subtotal: 75000, ...funes })).toBe(0);
    expect(both({ method: 'envio', subtotal: 75000, ...interior })).toBe(0);
    expect(both({ method: 'envio', subtotal: 120000, ...interior })).toBe(0);
  });

  it('el umbral nacional NO le sube el piso a Rosario', () => {
    // Entre $50.000 y $75.000 Rosario ya viaja gratis.
    expect(both({ method: 'envio', subtotal: 60000, ...rosario })).toBe(0);
  });

  it('los umbrales del config son los que se aplican', () => {
    expect(shipping.freeShippingThresholdRosario).toBe(50000);
    expect(shipping.freeShippingThresholdNational).toBe(75000);
  });
});

describe('packs con el envío incluido', () => {
  it('los tipos de pack están espejados frontend ↔ backend', () => {
    expect(FE_FREE_SHIPPING_PACKS).toEqual(BE_FREE_SHIPPING_PACKS);
  });

  it('packIncludesShipping reconoce los mismos ids en ambos lados', () => {
    const ids = [
      'pack:mayorista100:6cm:1',
      'pack:mayorista:4cm:1',
      'pack:personalizados:6cm:1',
      'sticker:goku:6cm',
      'negocio:1',
      'digital:pack-stickers',
      ''
    ];
    for (const id of ids) {
      expect(fePackIncludesShipping(id)).toBe(bePackIncludesShipping(id));
    }
    expect(fePackIncludesShipping('pack:mayorista100:6cm:1')).toBe(true);
    expect(fePackIncludesShipping('pack:personalizados:6cm:1')).toBe(false);
    expect(fePackIncludesShipping('sticker:goku:6cm')).toBe(false);
  });

  it('el flag de la línea cae al id (carritos guardados antes del cambio)', () => {
    expect(lineaConEnvioGratis({ id: 'pack:mayorista100:6cm:1' })).toBe(true);
    expect(lineaConEnvioGratis({ id: 'pack:mayorista100:6cm:1', envioGratis: true })).toBe(true);
    expect(lineaConEnvioGratis({ id: 'sticker:goku:6cm' })).toBe(false);
  });

  it('con el pack en el carrito el envío es 0 en cualquier zona y a cualquier monto', () => {
    for (const dest of [rosario, funes, interior]) {
      expect(both({ method: 'envio', subtotal: 39999, freeShipping: true, ...dest })).toBe(0);
    }
  });

  afterEach(() => vi.useRealTimers());

  it('el server lo deriva del id, no del flag del cliente', () => {
    const tierraDelFuego = { name: 'A', address: 'B', city: 'Ushuaia', province: 'Tierra del Fuego', zip: '9410' };
    // El pack x100 de la promo solo existe mientras la promo esté viva: sin fijar
    // el reloj, este test se caería solo el día que venza.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T12:00:00-03:00'));

    // Pack x100 de la promo: envío 0 aunque $39.999 no llegue al umbral nacional.
    const conPack = validateAndPriceOrder({
      items: [{ id: 'pack:mayorista100:6cm:1', title: 'Pack Mayorista PROMO x100', quantity: 1, unit_price: 39999 }],
      shipping: { methodValue: 'envio', ...tierraDelFuego },
      paymentMethod: 'mercadopago'
    });
    expect(conPack.ok).toBe(true);
    expect(conPack.shippingCost).toBe(0);
    expect(conPack.itemsTotal + conPack.shippingCost).toBe(39999);

    // Mismo destino y monto parecido, pero con calcos sueltos: el envío se cobra.
    const sinPack = validateAndPriceOrder({
      items: [{ id: 'sticker:goku:6cm', title: 'Goku', quantity: 1, unit_price: 1600 }],
      shipping: { methodValue: 'envio', ...tierraDelFuego },
      paymentMethod: 'mercadopago'
    });
    expect(sinPack.ok).toBe(true);
    expect(sinPack.shippingCost).toBe(8500);
  });
});
