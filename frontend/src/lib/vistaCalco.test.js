import { describe, it, expect } from 'vitest';
import { hayTransparencia, margenPx, anchoEnTermo, encajar, TERMO_CM } from './vistaCalco.js';
import { nombreConvertido } from './prepararImagen.js';

/** RGBA de `n` píxeles, con `transparentes` de ellos en alfa 0. */
function pixeles(n, transparentes) {
  const d = new Uint8ClampedArray(n * 4).fill(255);
  for (let i = 0; i < transparentes; i++) d[i * 4 + 3] = 0;
  return d;
}

describe('hayTransparencia — decide si la silueta sigue la forma', () => {
  it('un PNG con fondo transparente, sí', () => {
    expect(hayTransparencia(pixeles(1000, 400))).toBe(true);
  });

  it('un PNG con canal alfa pero opaco entero, no', () => {
    expect(hayTransparencia(pixeles(1000, 0))).toBe(false);
  });

  it('un par de píxeles del borde suavizado no cuentan como fondo', () => {
    expect(hayTransparencia(pixeles(1000, 5))).toBe(false);
  });

  it('vacío, no', () => {
    expect(hayTransparencia(new Uint8ClampedArray(0))).toBe(false);
  });
});

describe('geometría de la vista', () => {
  it('el borde blanco es proporcional y nunca desaparece', () => {
    expect(margenPx(400)).toBe(18);
    expect(margenPx(10)).toBe(2);
  });

  it('en el termo, 9 cm ocupa el ancho entero y 4 cm ~0,44 (RF-P6)', () => {
    expect(TERMO_CM).toBe(9);
    expect(anchoEnTermo(9, 100)).toBe(100);
    expect(anchoEnTermo(4, 100)).toBeCloseTo(44.4, 1);
    expect(anchoEnTermo(6, 160)).toBeCloseTo(106.7, 1);
    // Nada más ancho que el termo mismo.
    expect(anchoEnTermo(20, 100)).toBe(100);
  });

  it('encajar respeta la proporción', () => {
    expect(encajar(2000, 1000, 400)).toEqual({ w: 400, h: 200 });
    expect(encajar(1000, 4000, 400)).toEqual({ w: 100, h: 400 });
    expect(encajar(0, 0, 400)).toEqual({ w: 400, h: 400 });
  });
});

describe('WEBP → PNG (D-11)', () => {
  it('conserva el nombre base', () => {
    expect(nombreConvertido('sticker gato.webp')).toBe('sticker gato.png');
    expect(nombreConvertido('a.b.WEBP')).toBe('a.b.png');
    expect(nombreConvertido('.webp')).toBe('diseño.png');
  });
});
