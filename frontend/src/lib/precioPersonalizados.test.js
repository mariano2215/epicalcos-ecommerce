import { describe, it, expect } from 'vitest';
import { calcularPrecio, unitarioParaTier } from './precioPersonalizados.js';
import { MATERIALES, TAMANOS, CORTES, TIERS } from '../config/personalizados.js';
import { SIZES } from '../config/pricing.js';
// Espejo del backend: la fuente de verdad del servidor que re-precia el checkout.
import {
  SIZE_PRICES,
  CUSTOM_MATERIAL_MULT,
  CUSTOM_TIERS
} from '../../../netlify/functions/lib/pricing.js';

const round = Math.round;

describe('calcularPrecio — configuración incompleta', () => {
  it('sin nada seleccionado pide el material primero', () => {
    const r = calcularPrecio({});
    expect(r.configuracionCompleta).toBe(false);
    expect(r.faltante).toBe('el material');
    expect(r.unitario).toBe(0);
    expect(r.total).toBe(0);
    expect(r.desglose).toBeNull();
  });

  it('respeta el orden material → tamaño → corte → cantidad', () => {
    expect(calcularPrecio({ material: 'vinilo-blanco' }).faltante).toBe('el tamaño');
    expect(calcularPrecio({ material: 'vinilo-blanco', tamano: '6cm' }).faltante).toBe('el corte');
    expect(
      calcularPrecio({ material: 'vinilo-blanco', tamano: '6cm', corte: 'silueta' }).faltante
    ).toBe('la cantidad');
  });

  it('un id inexistente cuenta como incompleto', () => {
    expect(calcularPrecio({ material: 'no-existe', tamano: '6cm', corte: 'silueta', cantidad: 50 }).configuracionCompleta).toBe(false);
    expect(calcularPrecio({ material: 'vinilo-blanco', tamano: '6cm', corte: 'silueta', cantidad: 999 }).configuracionCompleta).toBe(false);
  });
});

describe('calcularPrecio — precio de lista × material × volumen', () => {
  it('vinilo blanco y transparente cotizan al PRECIO DE LISTA en el tier base', () => {
    for (const material of ['vinilo-blanco', 'transparente']) {
      for (const s of SIZES) {
        const r = calcularPrecio({ material, tamano: s.id, corte: 'silueta', cantidad: 10 });
        expect(r.configuracionCompleta).toBe(true);
        expect(r.unitario).toBe(s.price); // 4cm 1200 · 6cm 1600 · 9cm 2000
      }
    }
  });

  it('los materiales con recargo lo aplican sobre el precio de lista', () => {
    const recargos = { holografico: 1.3, 'dtf-uv': 1.2 };
    for (const [material, mult] of Object.entries(recargos)) {
      for (const s of SIZES) {
        const lista = calcularPrecio({ material: 'vinilo-blanco', tamano: s.id, corte: 'silueta', cantidad: 10 }).unitario;
        const conRecargo = calcularPrecio({ material, tamano: s.id, corte: 'silueta', cantidad: 10 }).unitario;
        expect(conRecargo).toBe(round(lista * mult));
      }
    }
  });

  it('el corte NO cambia el precio', () => {
    const base = calcularPrecio({ material: 'holografico', tamano: '9cm', corte: 'silueta', cantidad: 50 }).unitario;
    for (const c of CORTES) {
      expect(calcularPrecio({ material: 'holografico', tamano: '9cm', corte: c.id, cantidad: 50 }).unitario).toBe(base);
    }
  });

  it('la cantidad mínima es 10 unidades para todos los materiales', () => {
    expect(TIERS[0].cantidad).toBe(10);
    expect(Math.min(...TIERS.map((t) => t.cantidad))).toBe(10);
    for (const m of MATERIALES) {
      expect(calcularPrecio({ material: m.id, tamano: '6cm', corte: 'silueta', cantidad: 5 }).configuracionCompleta).toBe(false);
    }
  });

  it('cada tier de volumen aplica su factor y expone el ahorro', () => {
    for (const t of TIERS) {
      const r = calcularPrecio({ material: 'holografico', tamano: '6cm', corte: 'cuadrado', cantidad: t.cantidad });
      const esperado = round(1600 * 1.3 * t.factor);
      expect(r.unitario).toBe(esperado);
      expect(r.total).toBe(esperado * t.cantidad);
      expect(r.ahorro).toBeGreaterThanOrEqual(0);
    }
  });

  it('el desglose refleja los componentes del precio', () => {
    const r = calcularPrecio({ material: 'holografico', tamano: '9cm', corte: 'circulo', cantidad: 100 });
    expect(r.desglose.precioTamano).toBe(2000);
    expect(r.desglose.multiplicadorMaterial).toBe(1.3);
    expect(r.desglose.modificadorCorte).toBe(0);
    expect(r.desglose.factorVolumen).toBe(0.78);
    expect(r.desglose.unitario).toBe(round(2000 * 1.3 * 0.78));
  });

  it('unitarioParaTier coincide con el unitario completo', () => {
    const args = { material: 'holografico', tamano: '9cm', corte: 'cuadrado', cantidad: 250 };
    expect(unitarioParaTier(args)).toBe(calcularPrecio(args).unitario);
  });
});

describe('paridad frontend ↔ backend (evita price_mismatch en el checkout)', () => {
  it('las constantes espejadas son idénticas', () => {
    expect(Object.fromEntries(MATERIALES.map((m) => [m.id, m.multiplicador]))).toEqual(CUSTOM_MATERIAL_MULT);
    expect(Object.fromEntries(TAMANOS.map((t) => [t.id, t.precio]))).toEqual(SIZE_PRICES);
    expect(TIERS).toEqual(CUSTOM_TIERS);
  });

  it('el unitario del frontend == el que recalcula el servidor, para toda combinación', () => {
    for (const m of MATERIALES) {
      for (const t of TAMANOS) {
        for (const tier of TIERS) {
          const front = calcularPrecio({ material: m.id, tamano: t.id, corte: 'silueta', cantidad: tier.cantidad }).unitario;
          // Reproduce la rama `custom` del servidor con SUS constantes.
          const server = round(
            SIZE_PRICES[t.id] * CUSTOM_MATERIAL_MULT[m.id] * CUSTOM_TIERS.find((x) => x.cantidad === tier.cantidad).factor
          );
          expect(front).toBe(server);
        }
      }
    }
  });
});
