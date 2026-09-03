import { describe, it, expect } from 'vitest';
import { SIZES } from '../config/pricing.js';
import { USOS_POR_TAMANO, usoDe, usoCorto } from './usosPorTamano.js';

describe('usos por tamaño', () => {
  /**
   * ESTE es el test que importa. La tabla de usos y el catálogo de tamaños son
   * dos archivos distintos: si mañana se agrega un 12 cm a SIZES y nadie escribe
   * su uso, el SizePicker lo muestra sin la línea de "para qué sirve" y nadie se
   * entera hasta que un cliente pregunta. Acá se entera el build.
   */
  it('todos los tamaños de SIZES tienen un uso declarado', () => {
    for (const s of SIZES) {
      expect(usoDe(s.id), `falta el uso del tamaño ${s.id} en usosPorTamano.js`).not.toBeNull();
    }
  });

  it('no hay usos declarados para tamaños que ya no existen', () => {
    const idsVigentes = SIZES.map((s) => s.id);
    for (const id of Object.keys(USOS_POR_TAMANO)) {
      expect(idsVigentes, `sobra el uso del tamaño ${id}`).toContain(id);
    }
  });

  it('cada uso trae tag, corto y la lista larga', () => {
    for (const [id, uso] of Object.entries(USOS_POR_TAMANO)) {
      expect(uso.tag, id).toBeTruthy();
      expect(uso.corto, id).toBeTruthy();
      expect(uso.para.length, id).toBeGreaterThan(0);
    }
  });

  /**
   * El `corto` entra en un botón de ~110 px a 375 px. Con más de dos usos el
   * botón se parte en tres líneas y descuadra la fila de tamaños.
   */
  it('el texto corto es corto de verdad (entra en el botón a 375 px)', () => {
    for (const [id, uso] of Object.entries(USOS_POR_TAMANO)) {
      expect(uso.corto.length, `${id}: "${uso.corto}" es muy largo`).toBeLessThanOrEqual(20);
    }
  });

  it('usoCorto devuelve cadena vacía para un tamaño desconocido, no rompe', () => {
    expect(usoCorto('99cm')).toBe('');
    expect(usoDe('99cm')).toBeNull();
  });
});
