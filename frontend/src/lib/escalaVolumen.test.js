import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ESCALA_VOLUMEN,
  ESCALA_ESCALONES,
  precioVolumen,
  pctEscalon,
  filaEscala,
  TRANSFER_DISCOUNT,
  round
} from '../config/pricing.js';
import { shipping } from '../config/site.js';
import { precioBaseVigente } from './precioVigente.js';
import {
  ESCALA_VOLUMEN as BE_ESCALA,
  ESCALA_ESCALONES as BE_ESCALONES,
  precioVolumen as bePrecioVolumen,
  validateAndPriceOrder
} from '../../../netlify/functions/lib/pricing.js';

/**
 * Escala de precios por volumen (spec 032). La tabla vive dos veces —en el
 * sitio, que muestra, y en el servidor, que cobra— y un escalón distinto en un
 * lado rechaza el checkout. Este archivo es el que lo frena antes del deploy.
 */
const TAMANOS = ['4cm', '6cm', '9cm'];
const MATERIALES = ['vinilo-blanco', 'dtf-uv', 'vinilo-holografico'];
const retiro = { methodValue: 'retiro' };
const linea = (tamano, material, cantidad, unit_price) => ({
  id: `volumen:${tamano}:${material}:${cantidad}:1700000000000`,
  title: `Escala ${cantidad}`,
  quantity: 1,
  unit_price
});

// Sin promos por fecha: el 3x2 y el 2x1 no tocan la escala, pero así el
// test no depende de los interruptores.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-29T12:00:00-03:00'));
});
afterEach(() => vi.useRealTimers());

describe('la tabla aprobada (requirements §9.1, opción B)', () => {
  it('es exactamente la que aprobó Mariano el 5/10/2026', () => {
    expect(ESCALA_ESCALONES).toEqual([100, 250, 500, 1000]);
    expect(ESCALA_VOLUMEN).toEqual({
      '4cm': { 100: 52999, 250: 118999, 500: 211999, 1000: 370999 },
      '6cm': { 100: 52999, 250: 118999, 500: 211999, 1000: 370999 },
      holografico: { 100: 72999, 250: 163999, 500: 291999, 1000: 510999 }
    });
  });

  it('el servidor tiene la misma', () => {
    expect(BE_ESCALA).toEqual(ESCALA_VOLUMEN);
    expect(BE_ESCALONES).toEqual(ESCALA_ESCALONES);
  });

  it('sin 9 cm: no se vende por mayor, con ningún material', () => {
    for (const m of MATERIALES) {
      expect(filaEscala('9cm', m)).toBeNull();
      expect(precioVolumen({ tamano: '9cm', material: m, cantidad: 100 })).toBeNull();
    }
  });

  it('DTF UV vale lo mismo que el vinilo blanco', () => {
    expect(filaEscala('6cm', 'dtf-uv')).toBe(filaEscala('6cm', 'vinilo-blanco'));
    expect(filaEscala('4cm', 'dtf-uv')).toBe(filaEscala('4cm', 'vinilo-blanco'));
  });

  it('el % de cada escalón sale del monto: 0 / 10 / 20 / 30 en las dos filas', () => {
    for (const fila of [ESCALA_VOLUMEN['6cm'], ESCALA_VOLUMEN.holografico]) {
      expect(ESCALA_ESCALONES.map((e) => pctEscalon(fila, e))).toEqual([0, 10, 20, 30]);
    }
  });

  it('el escalón de 100 queda debajo del umbral nacional de envío gratis (regla del 1/10/2026)', () => {
    expect(ESCALA_VOLUMEN['4cm'][100]).toBeLessThan(shipping.freeShippingThresholdNational);
    expect(ESCALA_VOLUMEN['6cm'][100]).toBeLessThan(shipping.freeShippingThresholdNational);
  });
});

describe('cómo cotiza (RF-2, RF-4, RF-5)', () => {
  it('el precio por calco baja en cada escalón, en todas las filas', () => {
    for (const fila of Object.values(ESCALA_VOLUMEN)) {
      const unitarios = ESCALA_ESCALONES.map((e) => fila[e] / e);
      for (let i = 1; i < unitarios.length; i++) expect(unitarios[i]).toBeLessThan(unitarios[i - 1]);
    }
  });

  it('agregar una calco nunca baja el total, de 100 a 1.000', () => {
    for (const t of ['4cm', '6cm']) {
      for (const m of MATERIALES) {
        let anterior = 0;
        for (let q = 100; q <= 1000; q++) {
          const { total } = precioVolumen({ tamano: t, material: m, cantidad: q });
          expect(total, `${t} ${m} ${q}`).toBeGreaterThanOrEqual(anterior);
          anterior = total;
        }
      }
    }
  });

  it('entre escalones: 300 en 6 cm cobra el precio por calco del de 250', () => {
    expect(precioVolumen({ tamano: '6cm', cantidad: 300 })).toMatchObject({
      total: 142799,
      cantidadLlevada: 300,
      escalon: 250,
      pct: 10
    });
  });

  it('si el escalón siguiente cuesta igual o menos, se lleva ese: 240 → 250', () => {
    expect(precioVolumen({ tamano: '6cm', cantidad: 240 })).toMatchObject({
      total: 118999,
      cantidadLlevada: 250,
      escalon: 250
    });
  });

  it('fuera de la escala no hay precio: 99, 1.001, cantidades rotas', () => {
    for (const cantidad of [99, 1001, 0, 150.5, 'abc']) {
      expect(precioVolumen({ tamano: '6cm', cantidad })).toBeNull();
    }
  });
});

describe('paridad sitio ↔ servidor', () => {
  it('misma cotización para cada cantidad de 100 a 1.000 × tamaño × material', () => {
    for (const t of TAMANOS) {
      for (const m of MATERIALES) {
        for (let q = 99; q <= 1001; q++) {
          const fe = precioVolumen({ tamano: t, material: m, cantidad: q });
          const be = bePrecioVolumen({ tamano: t, material: m, cantidad: q });
          if (!fe) {
            expect(be, `${t} ${m} ${q}`).toBeNull();
            continue;
          }
          expect(be, `${t} ${m} ${q}`).toEqual({ total: fe.total, cantidadLlevada: fe.cantidadLlevada, escalon: fe.escalon });
        }
      }
    }
  });

  it('el servidor acepta cada escalón con Mercado Pago y con transferencia', () => {
    for (const t of ['4cm', '6cm']) {
      for (const m of MATERIALES) {
        for (const q of [100, 137, 250, 300, 500, 999, 1000]) {
          const { total, cantidadLlevada } = precioVolumen({ tamano: t, material: m, cantidad: q });
          const mp = validateAndPriceOrder({ items: [linea(t, m, cantidadLlevada, total)], shipping: retiro, paymentMethod: 'mercadopago' });
          expect(mp.ok, `${t} ${m} ${q}: ${mp.error} ${mp.detail || ''}`).toBe(true);
          expect(mp.itemsTotal).toBe(total);
          const conT = round(total * (1 - TRANSFER_DISCOUNT));
          const tr = validateAndPriceOrder({ items: [linea(t, m, cantidadLlevada, conT)], shipping: retiro, paymentMethod: 'transferencia' });
          expect(tr.ok, `${t} ${m} ${q} transferencia`).toBe(true);
        }
      }
    }
  });

  it('rechaza lo que el sitio nunca emitiría', () => {
    const rechaza = (item) => validateAndPriceOrder({ items: [item], shipping: retiro, paymentMethod: 'mercadopago' });
    expect(rechaza(linea('6cm', 'vinilo-blanco', 99, 52999)).ok).toBe(false);
    expect(rechaza(linea('6cm', 'vinilo-blanco', 1001, 370999)).ok).toBe(false);
    expect(rechaza(linea('6cm', 'vinilo-blanco', 240, 118999)).ok).toBe(false); // el sitio manda 250
    expect(rechaza(linea('9cm', 'vinilo-blanco', 100, 132500)).ok).toBe(false);
    expect(rechaza(linea('9cm', 'vinilo-holografico', 100, 72999)).ok).toBe(false);
    expect(rechaza(linea('6cm', 'oro', 100, 52999)).ok).toBe(false);
    expect(rechaza({ ...linea('6cm', 'vinilo-blanco', 100, 52999), quantity: 2 }).ok).toBe(false);
    // Un precio que no es el de la tabla: price_mismatch, como siempre.
    expect(rechaza(linea('6cm', 'vinilo-blanco', 500, 200000)).error).toBe('price_mismatch');
  });

  it('el cupón no la toca; la transferencia sí', () => {
    const total = ESCALA_VOLUMEN['6cm'][500];
    const conCupon = validateAndPriceOrder({
      items: [linea('6cm', 'vinilo-blanco', 500, total)],
      shipping: retiro,
      paymentMethod: 'mercadopago',
      couponCode: 'EPICA10'
    });
    expect(conCupon.ok).toBe(true);
    expect(conCupon.itemsTotal).toBe(total);
    const conTransferencia = validateAndPriceOrder({
      items: [linea('6cm', 'vinilo-blanco', 500, round(total * (1 - TRANSFER_DISCOUNT)))],
      shipping: retiro,
      paymentMethod: 'transferencia',
      couponCode: 'EPICA10'
    });
    expect(conTransferencia.ok).toBe(true);
  });

  it('los carritos guardados con un pack de 9 cm de antes se siguen pudiendo pagar', () => {
    const res = validateAndPriceOrder({
      items: [{ id: 'pack:mayorista:9cm:1', title: 'Pack 9 cm', quantity: 100, unit_price: round(2650 * 0.5) }],
      shipping: retiro,
      paymentMethod: 'mercadopago'
    });
    expect(res.ok).toBe(true);
  });
});

describe('carritos guardados (RF-14)', () => {
  it('una línea de escala se re-precia desde la tabla', () => {
    const guardada = { id: 'volumen:6cm:vinilo-blanco:500:1', basePrice: 199999, quantity: 1 };
    expect(precioBaseVigente(guardada)).toBe(ESCALA_VOLUMEN['6cm'][500]);
  });

  it('si la cantidad dejó de ser válida, conserva la guardada (el servidor pide recargar)', () => {
    const rara = { id: 'volumen:6cm:vinilo-blanco:240:1', basePrice: 123, quantity: 1 };
    expect(precioBaseVigente(rara)).toBe(123);
  });
});
