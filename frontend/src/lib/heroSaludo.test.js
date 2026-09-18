import { describe, it, expect } from 'vitest';
import {
  FRASES_SALUDO,
  DURACION_FRASE_MS,
  ENTRADA_FINAL_MS,
  MAX_CARACTERES_FRASE,
  duracionSaludoMs
} from './heroSaludo.js';

/**
 * El saludo del hero (spec 024). Lo que se cuida acá no se ve en la pantalla de
 * quien edita el copy: una frase de más que lleva la rotación a 6,5 s, o una
 * frase larga que en un celular parte en dos líneas y empuja el titular.
 */

const norm = (s) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

describe('saludo del hero', () => {
  it('tiene entre 2 y 5 frases: un saludo y al menos otra', () => {
    expect(FRASES_SALUDO.length).toBeGreaterThanOrEqual(2);
    expect(FRASES_SALUDO.length).toBeLessThanOrEqual(5);
  });

  it('la primera frase es la bienvenida', () => {
    expect(norm(FRASES_SALUDO[0])).toMatch(/bienvenid|hola/);
  });

  it(`ninguna frase supera ${MAX_CARACTERES_FRASE} caracteres (una línea a 375 px)`, () => {
    for (const f of FRASES_SALUDO) {
      expect(f.length, `"${f}" tiene ${f.length}`).toBeLessThanOrEqual(MAX_CARACTERES_FRASE);
    }
  });

  it('no hay frases repetidas ni vacías (se usan como key de React)', () => {
    expect(new Set(FRASES_SALUDO).size).toBe(FRASES_SALUDO.length);
    for (const f of FRASES_SALUDO) expect(f.trim()).not.toBe('');
  });

  it('la vuelta entera termina en 5 s o menos (WCAG 2.2.2)', () => {
    expect(duracionSaludoMs()).toBeLessThanOrEqual(5000);
  });

  it('la cuenta de la duración es la que usa el CSS', () => {
    // Las N-1 frases de paso van una detrás de otra y la última entra al final.
    expect(duracionSaludoMs(['a', 'b', 'c'])).toBe(2 * DURACION_FRASE_MS + ENTRADA_FINAL_MS);
    expect(duracionSaludoMs(['a'])).toBe(ENTRADA_FINAL_MS);
  });
});
