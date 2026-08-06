import { describe, it, expect } from 'vitest';
import { calcularPrecio } from './precioPersonalizados.js';
import { TAMANOS, CORTES, CANTIDAD, ARCHIVO, clampCantidad } from '../config/personalizados.js';
import { SIZES } from '../config/pricing.js';
// Espejo del backend: la fuente de verdad del servidor que re-precia el checkout.
import { SIZE_PRICES, validateAndPriceOrder } from '../../../netlify/functions/lib/pricing.js';

describe('calcularPrecio — configuración incompleta', () => {
  it('sin nada seleccionado pide el tamaño primero', () => {
    const r = calcularPrecio({});
    expect(r.configuracionCompleta).toBe(false);
    expect(r.faltante).toBe('el tamaño');
    expect(r.unitario).toBe(0);
    expect(r.total).toBe(0);
  });

  it('respeta el orden tamaño → corte', () => {
    expect(calcularPrecio({ tamano: '6cm' }).faltante).toBe('el corte');
    expect(calcularPrecio({ tamano: '6cm', corte: 'silueta' }).configuracionCompleta).toBe(true);
  });

  it('un id inexistente cuenta como incompleto', () => {
    expect(calcularPrecio({ tamano: 'no-existe', corte: 'silueta' }).configuracionCompleta).toBe(false);
    expect(calcularPrecio({ tamano: '6cm', corte: 'no-existe' }).configuracionCompleta).toBe(false);
  });
});

describe('calcularPrecio — mismo precio que el catálogo, sin mínimo', () => {
  it('el unitario es el precio de lista del tamaño (4cm 1200 · 6cm 1600 · 9cm 2000)', () => {
    for (const s of SIZES) {
      const r = calcularPrecio({ tamano: s.id, corte: 'silueta', cantidad: 1 });
      expect(r.configuracionCompleta).toBe(true);
      expect(r.unitario).toBe(s.price);
      expect(r.total).toBe(s.price);
    }
  });

  it('NO hay mínimo: una sola unidad es una configuración válida', () => {
    expect(CANTIDAD.min).toBe(1);
    const r = calcularPrecio({ tamano: '9cm', corte: 'circulo', cantidad: 1 });
    expect(r.configuracionCompleta).toBe(true);
    expect(r.total).toBe(2000);
  });

  it('sin cantidad explícita asume 1', () => {
    expect(calcularPrecio({ tamano: '4cm', corte: 'silueta' }).cantidad).toBe(1);
  });

  it('el total escala lineal con la cantidad (sin descuento por volumen)', () => {
    for (const cantidad of [1, 3, 10, 57, 250]) {
      const r = calcularPrecio({ tamano: '6cm', corte: 'cuadrado', cantidad });
      expect(r.unitario).toBe(1600);
      expect(r.total).toBe(1600 * cantidad);
    }
  });

  it('el corte NO cambia el precio', () => {
    for (const c of CORTES) {
      expect(calcularPrecio({ tamano: '9cm', corte: c.id, cantidad: 5 }).unitario).toBe(2000);
    }
  });

  it('la cantidad se sanea a los límites (entero, entre min y max)', () => {
    expect(clampCantidad(0)).toBe(CANTIDAD.min);
    expect(clampCantidad(-7)).toBe(CANTIDAD.min);
    expect(clampCantidad('')).toBe(CANTIDAD.min);
    expect(clampCantidad(3.9)).toBe(3);
    expect(clampCantidad(99999)).toBe(CANTIDAD.max);
  });
});

describe('paridad frontend ↔ backend (evita price_mismatch en el checkout)', () => {
  it('los precios por tamaño son idénticos a los del servidor', () => {
    expect(Object.fromEntries(TAMANOS.map((t) => [t.id, t.precio]))).toEqual(SIZE_PRICES);
  });

  it('el servidor acepta el precio del configurador para toda combinación', () => {
    for (const t of TAMANOS) {
      for (const c of CORTES) {
        for (const cantidad of [1, 2, 10, 137]) {
          const precio = calcularPrecio({ tamano: t.id, corte: c.id, cantidad });
          const res = validateAndPriceOrder({
            items: [
              {
                id: `custom:${t.id}:${c.id}:1`,
                title: `Personalizado ${t.label} ${c.label}`,
                quantity: cantidad,
                unit_price: precio.unitario
              }
            ],
            shipping: { methodValue: 'retiro' },
            paymentMethod: 'mercadopago'
          });
          expect(res.ok).toBe(true);
          expect(res.itemsTotal).toBe(precio.total);
        }
      }
    }
  });

  it('el servidor acepta UNA línea por diseño con el tope de archivos lleno', () => {
    // El configurador manda una línea por archivo subido (hasta ARCHIVO.maxArchivos):
    // si MAX_LINES del servidor quedara por debajo, el checkout se caería con too_many_lines.
    const items = Array.from({ length: ARCHIVO.maxArchivos }, (_, i) => ({
      id: `custom:4cm:silueta:f${i}`,
      title: `Personalizado 4 cm Silueta diseño-${i}.png`,
      quantity: 1,
      unit_price: SIZE_PRICES['4cm']
    }));
    const res = validateAndPriceOrder({
      items,
      shipping: { methodValue: 'retiro' },
      paymentMethod: 'mercadopago'
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(SIZE_PRICES['4cm'] * ARCHIVO.maxArchivos);
  });

  it('el servidor rechaza un tamaño inventado o un precio adulterado', () => {
    const base = {
      shipping: { methodValue: 'retiro' },
      paymentMethod: 'mercadopago'
    };
    const tamanoTrucho = validateAndPriceOrder({
      ...base,
      items: [{ id: 'custom:99cm:silueta:1', title: 'X', quantity: 1, unit_price: 10 }]
    });
    expect(tamanoTrucho.ok).toBe(false);

    const precioTrucho = validateAndPriceOrder({
      ...base,
      items: [{ id: 'custom:6cm:silueta:1', title: 'X', quantity: 1, unit_price: 1 }]
    });
    expect(precioTrucho.ok).toBe(false);
    expect(precioTrucho.error).toBe('price_mismatch');
  });
});
