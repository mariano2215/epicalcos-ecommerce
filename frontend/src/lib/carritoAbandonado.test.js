import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';

/**
 * Reglas de decisión del recordatorio de carrito abandonado.
 *
 * Se testea la lógica PURA (a quién se le escribe y a quién no), espejada de
 * netlify/functions/abandoned-cart.js. Es el punto donde un bug no es un bug de
 * UI: es escribirle a alguien que ya compró o que pidió no recibir más.
 *
 * Las funciones de Blobs no se pueden importar acá (los tests corren en node
 * sin el entorno de Netlify), así que se replica la decisión y este archivo
 * queda como la especificación ejecutable de esa regla.
 */

const HORA = 60 * 60 * 1000;
const RETENCION_DIAS = 30;

/**
 * ¿Qué hacer con este carrito? Espejo de la lógica de abandoned-cart.js.
 * @returns {'enviar'|'saltear'|'purgar'}
 */
function decidir(carrito, { ahora, horas = 4, maxHoras = 72, dadoDeBaja = false }) {
  const edadMs = ahora - Date.parse(carrito.updatedAt || 0);
  if (!Number.isFinite(edadMs) || edadMs > RETENCION_DIAS * 24 * HORA) return 'purgar';
  if (carrito.notifiedAt) return 'saltear';
  if (edadMs < horas * HORA) return 'saltear';
  if (edadMs > maxHoras * HORA) return 'purgar';
  if (dadoDeBaja) return 'saltear';
  return 'enviar';
}

const haceHoras = (n, ahora) => new Date(ahora - n * HORA).toISOString();

describe('carrito abandonado — a quién se le escribe', () => {
  const ahora = Date.parse('2026-08-08T20:00:00Z');

  it('escribe a las 4 horas del abandono', () => {
    expect(decidir({ updatedAt: haceHoras(5, ahora) }, { ahora })).toBe('enviar');
  });

  it('NO escribe si todavía puede estar comprando', () => {
    expect(decidir({ updatedAt: haceHoras(1, ahora) }, { ahora })).toBe('saltear');
    expect(decidir({ updatedAt: haceHoras(3.9, ahora) }, { ahora })).toBe('saltear');
  });

  it('NUNCA escribe dos veces al mismo carrito', () => {
    const carrito = { updatedAt: haceHoras(10, ahora), notifiedAt: haceHoras(5, ahora) };
    expect(decidir(carrito, { ahora })).toBe('saltear');
  });

  it('NO escribe a quien pidió no recibir más', () => {
    expect(decidir({ updatedAt: haceHoras(6, ahora) }, { ahora, dadoDeBaja: true })).toBe('saltear');
  });

  it('no escribe un recordatorio viejo: lo purga', () => {
    // A los 4 días el mail ya no recuerda nada, molesta.
    expect(decidir({ updatedAt: haceHoras(96, ahora) }, { ahora })).toBe('purgar');
  });

  it('purga los registros que pasaron la retención', () => {
    expect(decidir({ updatedAt: haceHoras(31 * 24, ahora) }, { ahora })).toBe('purgar');
  });

  it('purga un registro con fecha corrupta en vez de escribirle', () => {
    expect(decidir({ updatedAt: 'cualquier cosa' }, { ahora })).toBe('purgar');
    expect(decidir({}, { ahora })).toBe('purgar');
  });

  it('respeta un umbral configurado distinto', () => {
    expect(decidir({ updatedAt: haceHoras(5, ahora) }, { ahora, horas: 12 })).toBe('saltear');
    expect(decidir({ updatedAt: haceHoras(13, ahora) }, { ahora, horas: 12 })).toBe('enviar');
  });
});

describe('carrito abandonado — token de baja', () => {
  const SECRET = 'secreto-de-prueba';
  const token = (email) =>
    createHmac('sha256', SECRET).update(String(email).trim().toLowerCase()).digest('hex').slice(0, 32);

  it('el token depende del mail: no se puede dar de baja a otro', () => {
    expect(token('uno@test.com')).not.toBe(token('otro@test.com'));
  });

  it('normaliza mayúsculas y espacios (una persona = un token)', () => {
    expect(token('  Juan@Test.COM ')).toBe(token('juan@test.com'));
  });

  it('cambia si cambia el secreto', () => {
    const otro = createHmac('sha256', 'otro-secreto').update('juan@test.com').digest('hex').slice(0, 32);
    expect(token('juan@test.com')).not.toBe(otro);
  });
});
