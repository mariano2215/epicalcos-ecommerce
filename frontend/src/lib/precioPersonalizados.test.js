import { describe, it, expect } from 'vitest';
import { calcularPrecio, unitarioParaTier } from './precioPersonalizados.js';
import { MATERIALES, TAMANOS, CORTES, TIERS } from '../config/personalizados.js';
// Espejo del backend: la fuente de verdad del servidor que re-precia el checkout.
import {
  CUSTOM_MATERIAL_BASE,
  CUSTOM_SIZE_MOD,
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

describe('calcularPrecio — fórmula base × modificadores × volumen', () => {
  it('material en tamaño de referencia (4 cm, tier 1) = precio base', () => {
    for (const m of MATERIALES) {
      const r = calcularPrecio({ material: m.id, tamano: '4cm', corte: 'silueta', cantidad: 10 });
      expect(r.configuracionCompleta).toBe(true);
      expect(r.unitario).toBe(m.precioBase);
      expect(r.total).toBe(m.precioBase * 10);
    }
  });

  it('aplica el modificador de tamaño', () => {
    // vinilo blanco 1200, 6 cm +35% → 1620 en tier 1
    const r = calcularPrecio({ material: 'vinilo-blanco', tamano: '6cm', corte: 'silueta', cantidad: 10 });
    expect(r.unitario).toBe(round(1200 * 1.35));
  });

  it('el corte NO cambia el precio (modificador 0)', () => {
    const base = calcularPrecio({ material: 'holografico', tamano: '9cm', corte: 'silueta', cantidad: 50 }).unitario;
    for (const c of CORTES) {
      const r = calcularPrecio({ material: 'holografico', tamano: '9cm', corte: c.id, cantidad: 50 });
      expect(r.unitario).toBe(base);
    }
  });

  it('cada tier de volumen aplica su factor y expone el ahorro', () => {
    for (const t of TIERS) {
      const r = calcularPrecio({ material: 'dtf-uv', tamano: '6cm', corte: 'cuadrado', cantidad: t.cantidad });
      const esperado = round(1600 * 1.35 * t.factor);
      expect(r.unitario).toBe(esperado);
      expect(r.total).toBe(esperado * t.cantidad);
      // el ahorro nunca es negativo y crece al bajar el factor
      expect(r.ahorro).toBeGreaterThanOrEqual(0);
    }
  });

  it('el desglose refleja los componentes del precio', () => {
    const r = calcularPrecio({ material: 'transparente', tamano: '9cm', corte: 'circulo', cantidad: 100 });
    expect(r.desglose.base).toBe(1400);
    expect(r.desglose.modificadorTamano).toBe(70);
    expect(r.desglose.modificadorCorte).toBe(0);
    expect(r.desglose.factorVolumen).toBe(0.78);
    expect(r.desglose.unitario).toBe(round(1400 * 1.7 * 0.78));
  });

  it('unitarioParaTier coincide con el unitario completo', () => {
    const args = { material: 'vinilo-blanco', tamano: '9cm', corte: 'cuadrado', cantidad: 250 };
    expect(unitarioParaTier(args)).toBe(calcularPrecio(args).unitario);
  });
});

describe('paridad frontend ↔ backend (evita price_mismatch en el checkout)', () => {
  it('las constantes espejadas son idénticas', () => {
    expect(Object.fromEntries(MATERIALES.map((m) => [m.id, m.precioBase]))).toEqual(CUSTOM_MATERIAL_BASE);
    expect(Object.fromEntries(TAMANOS.map((t) => [t.id, t.modificador]))).toEqual(CUSTOM_SIZE_MOD);
    expect(TIERS).toEqual(CUSTOM_TIERS);
  });

  it('el unitario del frontend == el que recalcula el servidor, para toda combinación', () => {
    for (const m of MATERIALES) {
      for (const t of TAMANOS) {
        for (const tier of TIERS) {
          const front = calcularPrecio({ material: m.id, tamano: t.id, corte: 'silueta', cantidad: tier.cantidad }).unitario;
          // Reproduce la rama `custom` del servidor con SUS constantes.
          const server = round(
            CUSTOM_MATERIAL_BASE[m.id] * (1 + CUSTOM_SIZE_MOD[t.id] / 100) * CUSTOM_TIERS.find((x) => x.cantidad === tier.cantidad).factor
          );
          expect(front).toBe(server);
        }
      }
    }
  });
});
