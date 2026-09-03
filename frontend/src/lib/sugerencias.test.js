import { describe, it, expect } from 'vitest';
import {
  sampleSize,
  categoriasFuente,
  mapearManifest,
  elegirUno,
  elegirVarios,
  CATEGORIAS_RESPALDO,
  MAX_CATEGORIAS_FUENTE
} from './sugerencias.js';

/**
 * `rnd` determinístico: siempre el primer elemento del pool. Con esto las
 * funciones dejan de ser azarosas y se puede afirmar QUÉ eligen, no sólo
 * cuántas cosas eligen.
 */
const primero = () => 0;
/** Siempre el último elemento del pool (0.999… nunca llega a ser index = length). */
const ultimo = () => 0.999999;

const diseño = (id) => ({ id, file: `/stickers/x/${id}.webp`, sku: `SKU-${id}` });

describe('sampleSize', () => {
  it('devuelve como mucho n elementos', () => {
    expect(sampleSize([1, 2, 3, 4, 5], 3, primero)).toHaveLength(3);
  });

  it('no repite: si pedís más de los que hay, devuelve todos una sola vez', () => {
    const out = sampleSize(['a', 'b', 'c'], 10, primero);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
  });

  it('no muta el array original', () => {
    const original = ['a', 'b', 'c'];
    sampleSize(original, 2, primero);
    expect(original).toEqual(['a', 'b', 'c']);
  });

  it('con n = 0 devuelve vacío', () => {
    expect(sampleSize(['a', 'b'], 0, primero)).toEqual([]);
  });
});

describe('categoriasFuente', () => {
  it('las categorías del carrito van primero', () => {
    const out = categoriasFuente(['anime', 'memes'], { rnd: primero });
    expect(out.slice(0, 2)).toEqual(['anime', 'memes']);
  });

  it('rellena hasta el máximo con las de respaldo', () => {
    const out = categoriasFuente(['anime'], { rnd: primero });
    expect(out).toHaveLength(MAX_CATEGORIAS_FUENTE);
    // La primera es la del carrito; las otras tres salen del respaldo.
    expect(out[0]).toBe('anime');
    for (const slug of out.slice(1)) expect(CATEGORIAS_RESPALDO).toContain(slug);
  });

  it('nunca repite una categoría que ya está en el carrito', () => {
    // 'anime' está en CATEGORIAS_RESPALDO: el relleno tiene que excluirla.
    const out = categoriasFuente(['anime'], { rnd: primero });
    expect(out.filter((s) => s === 'anime')).toHaveLength(1);
  });

  it('deduplica lo que viene del carrito', () => {
    const out = categoriasFuente(['anime', 'anime', 'memes'], { rnd: primero });
    expect(out.filter((s) => s === 'anime')).toHaveLength(1);
  });

  /**
   * Sin calcos de catálogo en el carrito no hay ninguna señal sobre el gusto de
   * esa persona: si el relleno saliera del respaldo, TODOS esos carritos verían
   * siempre las mismas ocho categorías.
   */
  it('sin categorías del carrito sortea entre todas, no sólo entre las de respaldo', () => {
    const todos = ['zzz-uno', 'zzz-dos', 'zzz-tres', 'zzz-cuatro', 'zzz-cinco'];
    const out = categoriasFuente([], { rnd: primero, todos });
    expect(out).toHaveLength(MAX_CATEGORIAS_FUENTE);
    for (const slug of out) expect(todos).toContain(slug);
  });

  it('respeta el máximo aunque el carrito traiga más categorías', () => {
    const out = categoriasFuente(['a', 'b', 'c', 'd', 'e', 'f'], { rnd: primero });
    expect(out).toHaveLength(MAX_CATEGORIAS_FUENTE);
  });

  it('ignora slugs vacíos o nulos', () => {
    const out = categoriasFuente(['anime', null, undefined, ''], { rnd: primero });
    expect(out).not.toContain(null);
    expect(out).not.toContain('');
  });
});

describe('mapearManifest', () => {
  it('arma el nombre a partir del número del archivo', () => {
    const [item] = mapearManifest('anime', [{ id: 'anime-12', file: '/x.webp', sku: 'S1' }]);
    expect(item.name).toBe('Anime #12');
    expect(item.num).toBe('12');
    expect(item.image).toBe('/x.webp');
    expect(item.category).toBe('anime');
    expect(item.categoryLabel).toBe('Anime');
    expect(item.sku).toBe('S1');
  });

  it('con un manifest que no es un array devuelve vacío en vez de romper', () => {
    expect(mapearManifest('anime', null)).toEqual([]);
    expect(mapearManifest('anime', { error: 404 })).toEqual([]);
  });
});

describe('elegirUno', () => {
  it('prefiere la primera lista (las categorías del carrito van primero)', () => {
    const pick = elegirUno([[diseño('a1')], [diseño('b1')]], [], primero);
    expect(pick.id).toBe('a1');
  });

  it('salta a la lista siguiente si en la primera está todo excluido', () => {
    const pick = elegirUno([[diseño('a1')], [diseño('b1')]], ['a1'], primero);
    expect(pick.id).toBe('b1');
  });

  it('acepta un Set de excluidos', () => {
    const pick = elegirUno([[diseño('a1'), diseño('a2')]], new Set(['a1']), primero);
    expect(pick.id).toBe('a2');
  });

  /** El order bump tiene que DESAPARECER, no mostrar una card vacía. */
  it('devuelve null cuando no queda nada para ofrecer', () => {
    expect(elegirUno([[diseño('a1')]], ['a1'], primero)).toBeNull();
    expect(elegirUno([], [], primero)).toBeNull();
    expect(elegirUno(null, [], primero)).toBeNull();
  });

  it('nunca devuelve algo que ya está en el carrito', () => {
    const lista = [diseño('a1'), diseño('a2'), diseño('a3')];
    for (const rnd of [primero, ultimo]) {
      const pick = elegirUno([lista], ['a1', 'a3'], rnd);
      expect(pick.id).toBe('a2');
    }
  });
});

describe('elegirVarios', () => {
  it('mezcla categorías: una vuelta por lista antes de repetir', () => {
    const out = elegirVarios(
      [[diseño('a1'), diseño('a2')], [diseño('b1'), diseño('b2')]],
      2,
      [],
      primero
    );
    expect(out.map((s) => s.id)).toEqual(['a1', 'b1']);
  });

  it('no repite el mismo diseño dentro de la tanda', () => {
    const out = elegirVarios([[diseño('a1'), diseño('a2'), diseño('a3')]], 3, [], primero);
    expect(new Set(out.map((s) => s.id)).size).toBe(3);
  });

  it('devuelve menos de los pedidos si no alcanzan', () => {
    expect(elegirVarios([[diseño('a1')]], 4, [], primero)).toHaveLength(1);
  });

  it('respeta los excluidos', () => {
    const out = elegirVarios([[diseño('a1'), diseño('a2')]], 2, ['a1'], primero);
    expect(out.map((s) => s.id)).toEqual(['a2']);
  });
});
