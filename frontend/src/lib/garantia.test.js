import { describe, it, expect } from 'vitest';
import { grupoDeLinea, garantiaDelCarrito, textosGarantia } from './garantia.js';
import { devoluciones } from '../config/site.js';

/**
 * La garantía que se lee arriba del botón de pagar (spec 021).
 *
 * Lo que se protege: que el checkout NUNCA le prometa una devolución a quien la
 * política no se la da (lo hecho con su archivo, lo digital), y que el plazo sea
 * el mismo número que dicen la tira, la política, los Términos y el FAQ.
 */

// Líneas con la forma que les da el CartContext (solo lo que mira la garantía).
const calco = { id: 'sticker:goku-1:6cm', type: 'sticker' };
const personalizado = { id: 'custom:6cm:silueta:1', type: 'custom' };
const negocio = { id: 'negocio:1', type: 'negocio' };
const tatuajes = { id: 'fixed:tatuajes-hoja', type: 'fixed' };
const polaroid = { id: 'fixed:polaroid-x10-5x8:1', type: 'fixed' };
const imprimible = { id: 'digital:pack-stickers', type: 'digital' };
const packMayorista = (items, customCount) => ({
  id: 'pack:mayorista:6cm:1',
  type: 'pack',
  meta: { packType: 'mayorista', items, customCount }
});
const dosDisenos = [{ id: 'goku-1', qty: 50 }, { id: 'luffy-2', qty: 50 }];

describe('qué garantía le toca a cada carrito', () => {
  it('solo calcos de catálogo → devolución', () => {
    expect(garantiaDelCarrito([calco])).toBe('devolucion');
  });

  it('catálogo + algo hecho con archivo → mixto', () => {
    expect(garantiaDelCarrito([calco, personalizado])).toBe('mixto');
    expect(garantiaDelCarrito([calco, polaroid])).toBe('mixto');
  });

  it('solo cosas hechas con el archivo del cliente → falla', () => {
    for (const linea of [personalizado, negocio, tatuajes, polaroid]) {
      expect(garantiaDelCarrito([linea]), linea.id).toBe('falla');
    }
    expect(garantiaDelCarrito([personalizado, negocio])).toBe('falla');
  });

  it('lo digital no cuenta: solo digital → nada; digital + catálogo → devolución', () => {
    expect(garantiaDelCarrito([imprimible])).toBe(null);
    expect(garantiaDelCarrito([imprimible, calco])).toBe('devolucion');
    expect(garantiaDelCarrito([imprimible, personalizado])).toBe('falla');
  });

  it('carrito vacío → nada', () => {
    expect(garantiaDelCarrito([])).toBe(null);
    expect(garantiaDelCarrito()).toBe(null);
  });
});

describe('el pack mayorista, que puede mezclar las dos cosas', () => {
  it('solo diseños del catálogo → devolución', () => {
    expect(garantiaDelCarrito([packMayorista(dosDisenos, 0)])).toBe('devolucion');
  });

  it('diseños del catálogo + calcos con archivo → mixto', () => {
    expect(garantiaDelCarrito([packMayorista(dosDisenos, 10)])).toBe('mixto');
  });

  it('solo calcos con archivo → falla', () => {
    expect(garantiaDelCarrito([packMayorista([], 100)])).toBe('falla');
  });

  it('la promo de 100 (`mayorista100`) se clasifica igual', () => {
    const promo = { ...packMayorista(dosDisenos, 0), meta: { packType: 'mayorista100', items: dosDisenos, customCount: 0 } };
    expect(garantiaDelCarrito([promo])).toBe('devolucion');
  });

  it('el pack de personalizados es hecho con archivo', () => {
    const pack = { id: 'pack:personalizados:6cm:1', type: 'pack', meta: { packType: 'personalizados', items: [] } };
    expect(garantiaDelCarrito([pack])).toBe('falla');
  });
});

describe('ante la duda, se promete de menos', () => {
  it('un pack sin `meta` cuenta como hecho con archivo', () => {
    expect(grupoDeLinea({ id: 'pack:x', type: 'pack' })).toEqual({ catalogo: false, archivo: true });
    expect(garantiaDelCarrito([{ id: 'pack:x', type: 'pack' }])).toBe('falla');
  });

  it('un `type` desconocido o ausente cuenta como hecho con archivo', () => {
    expect(garantiaDelCarrito([{ id: 'raro:1', type: 'raro' }])).toBe('falla');
    expect(garantiaDelCarrito([{ id: 'sin-tipo' }])).toBe('falla');
  });
});

describe('lo que se lee', () => {
  const tipos = ['devolucion', 'mixto', 'falla'];

  it('los tres tienen título y condiciones', () => {
    for (const tipo of tipos) {
      const t = textosGarantia(tipo);
      expect(t.titulo, tipo).toBeTruthy();
      expect(t.condiciones.length, tipo).toBeGreaterThan(0);
    }
    expect(textosGarantia(null)).toBe(null);
  });

  it('los tres dicen los días del config', () => {
    for (const tipo of tipos) {
      const todo = [textosGarantia(tipo).titulo, ...textosGarantia(tipo).condiciones].join(' ');
      expect(todo, tipo).toContain(`${devoluciones.dias} días`);
    }
  });

  it('el título de "falla" no promete una devolución', () => {
    // Es lo único que lee quien no abre las condiciones, y a lo hecho con su
    // archivo la política solo le da reposición por falla.
    expect(textosGarantia('falla').titulo.toLowerCase()).not.toContain('devol');
    expect(textosGarantia('falla').condiciones.some((c) => c.includes('no entra'))).toBe(true);
  });

  it('el título de "mixto" acota la devolución a lo de catálogo', () => {
    expect(textosGarantia('mixto').titulo).toContain('catálogo');
    expect(textosGarantia('mixto').condiciones.some((c) => c.includes('no entra'))).toBe(true);
  });

  it('las condiciones de devolución incluyen las de la política', () => {
    // D-3 (sin pegar), D-5 (envío de vuelta), D-6 (reembolso) y D-9 (cómo se pide).
    const c = textosGarantia('devolucion').condiciones.join(' ').toLowerCase();
    for (const clave of ['sin pegar', 'envío de vuelta', 'mismo medio de pago', 'número de pedido']) {
      expect(c, clave).toContain(clave);
    }
  });
});
