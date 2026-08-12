import { describe, it, expect, vi, afterEach } from 'vitest';
// Frontend: lo que ve el cliente en el resumen del checkout.
import { calculateShipping as feShipping, shipping } from '../config/site.js';
// Backend: el que se cobra de verdad (ignora el shipping.cost del cliente).
import {
  calculateShipping as beShipping,
  FREE_SHIPPING_THRESHOLD_ROSARIO as BE_UMBRAL_ROSARIO,
  FREE_SHIPPING_THRESHOLD_NATIONAL as BE_UMBRAL_NACIONAL,
  validateAndPriceOrder
} from '../../../netlify/functions/lib/pricing.js';

const UMBRAL_ROSARIO = shipping.freeShippingThresholdRosario;
const UMBRAL_NACIONAL = shipping.freeShippingThresholdNational;

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

  it('Rosario: se cobra bajo el umbral y es gratis desde el umbral', () => {
    expect(both({ method: 'envio', subtotal: UMBRAL_ROSARIO - 1, ...rosario })).toBe(shipping.costRosario);
    expect(both({ method: 'envio', subtotal: UMBRAL_ROSARIO, ...rosario })).toBe(0);
  });

  it('resto del país: gratis desde el umbral nacional (ciudades próximas e interior)', () => {
    // Debajo del umbral, cada zona paga su costo.
    expect(both({ method: 'envio', subtotal: UMBRAL_NACIONAL - 1, ...funes })).toBe(shipping.costNearby);
    expect(both({ method: 'envio', subtotal: UMBRAL_NACIONAL - 1, ...interior })).toBe(shipping.costInterior);
    // Desde el umbral nacional, gratis a todo el país.
    expect(both({ method: 'envio', subtotal: UMBRAL_NACIONAL, ...funes })).toBe(0);
    expect(both({ method: 'envio', subtotal: UMBRAL_NACIONAL, ...interior })).toBe(0);
    expect(both({ method: 'envio', subtotal: UMBRAL_NACIONAL * 2, ...interior })).toBe(0);
  });

  it('el umbral nacional NO le sube el piso a Rosario', () => {
    // Entre los dos umbrales, Rosario ya viaja gratis.
    const entreLosDos = Math.floor((UMBRAL_ROSARIO + UMBRAL_NACIONAL) / 2);
    expect(entreLosDos).toBeGreaterThanOrEqual(UMBRAL_ROSARIO);
    expect(entreLosDos).toBeLessThan(UMBRAL_NACIONAL);
    expect(both({ method: 'envio', subtotal: entreLosDos, ...rosario })).toBe(0);
  });

  it('los umbrales del config están espejados frontend ↔ backend', () => {
    expect(UMBRAL_ROSARIO).toBe(BE_UMBRAL_ROSARIO);
    expect(UMBRAL_NACIONAL).toBe(BE_UMBRAL_NACIONAL);
    // El de Rosario tiene que ser el más bajo: si se invierten, `calculateShipping`
    // le cobra el envío a Rosario en el tramo en que el interior ya viaja gratis.
    expect(UMBRAL_ROSARIO).toBeLessThan(UMBRAL_NACIONAL);
  });

  it('los umbrales son los que decidió el negocio', () => {
    // Este test es el candado: los umbrales son una decisión comercial, no un
    // número que se toca de paso. Si alguien los cambia, tiene que cambiarlos
    // acá también — y ahí se entera de que está moviendo la oferta.
    expect(UMBRAL_ROSARIO).toBe(50000);
    expect(UMBRAL_NACIONAL).toBe(75000);
  });
});

describe('ninguna promo regala el envío: manda el umbral', () => {
  afterEach(() => vi.useRealTimers());

  /** El pack x100 de la promo solo existe mientras la promo esté viva. */
  const conLaPromoViva = () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T12:00:00-03:00'));
  };
  const datos = (dest) => ({ name: 'A', address: 'B', zip: '1000', ...dest });

  it('REGRESIÓN: la promo de 100 calcos a $39.999 PAGA envío a Buenos Aires', () => {
    // El caso real que se cobró mal: $39.999 no llega al umbral nacional
    // ($75.000), así que el pedido paga los $8.500 de Correo Argentino. Antes
    // viajaba gratis porque la línea `pack:mayorista100` traía el envío puesto.
    conLaPromoViva();
    const pedido = validateAndPriceOrder({
      items: [{ id: 'pack:mayorista100:6cm:1', title: 'Pack Mayorista PROMO x100', quantity: 1, unit_price: 39999 }],
      shipping: { methodValue: 'envio', ...datos({ city: 'La Plata', province: 'Buenos Aires' }) },
      paymentMethod: 'mercadopago'
    });
    expect(pedido.ok).toBe(true);
    expect(pedido.shippingCost).toBe(shipping.costInterior);
    expect(pedido.itemsTotal + pedido.shippingCost).toBe(39999 + shipping.costInterior);
  });

  it('la misma promo paga el envío en TODAS las zonas (no llega a ningún umbral)', () => {
    conLaPromoViva();
    const esperado = [
      [rosario, shipping.costRosario],
      [funes, shipping.costNearby],
      [interior, shipping.costInterior]
    ];
    for (const [dest, costo] of esperado) {
      const pedido = validateAndPriceOrder({
        items: [{ id: 'pack:mayorista100:4cm:1', title: 'Pack Mayorista PROMO x100', quantity: 1, unit_price: 39999 }],
        shipping: { methodValue: 'envio', ...datos(dest) },
        paymentMethod: 'mercadopago'
      });
      expect(pedido.ok).toBe(true);
      expect(pedido.shippingCost).toBe(costo);
    }
  });

  it('el pack mayorista sí viaja gratis cuando su PRECIO cruza el umbral', () => {
    // Control de que el fix no apagó el envío gratis legítimo: 100 calcos de
    // 6 cm al 50 % off son $80.000, arriba del umbral nacional.
    const pedido = validateAndPriceOrder({
      items: [{ id: 'pack:mayorista:6cm:1', title: 'Pack Mayorista x100', quantity: 100, unit_price: 800 }],
      shipping: { methodValue: 'envio', ...datos(interior) },
      paymentMethod: 'mercadopago'
    });
    expect(pedido.ok).toBe(true);
    expect(pedido.itemsTotal).toBe(80000);
    expect(pedido.itemsTotal).toBeGreaterThanOrEqual(UMBRAL_NACIONAL);
    expect(pedido.shippingCost).toBe(0);
  });

  it('el flag `envioGratis` del payload no compra nada', () => {
    // Defensa contra un carrito viejo de localStorage (traían el flag) y contra
    // un payload editado a mano: el servidor no lo lee.
    conLaPromoViva();
    const pedido = validateAndPriceOrder({
      items: [
        { id: 'pack:mayorista100:6cm:1', title: 'Pack Mayorista PROMO x100', quantity: 1, unit_price: 39999, envioGratis: true }
      ],
      shipping: { methodValue: 'envio', cost: 0, envioGratis: true, ...datos(interior) },
      paymentMethod: 'mercadopago'
    });
    expect(pedido.ok).toBe(true);
    expect(pedido.shippingCost).toBe(shipping.costInterior);
  });

  it('calculateShipping no acepta un atajo al umbral, ni en el front ni en el server', () => {
    // Si alguien repone un parámetro tipo `freeShipping`, este test lo caza:
    // pasarlo tiene que ser irrelevante para las dos puntas.
    for (const dest of [rosario, funes, interior]) {
      expect(both({ method: 'envio', subtotal: 39999, freeShipping: true, ...dest })).not.toBe(0);
    }
  });
});
