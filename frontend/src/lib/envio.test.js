import { describe, it, expect } from 'vitest';
// Frontend: lo que ve el cliente en el resumen del checkout.
import { calculateShipping as feShipping, shipping } from '../config/site.js';
// Backend: el que se cobra de verdad (ignora el shipping.cost del cliente).
import { calculateShipping as beShipping } from '../../../netlify/functions/lib/pricing.js';

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
