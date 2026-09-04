import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { searchCatalog } from './searchCatalog.js';
import { CATEGORIES } from '../data/categories.js';
import {
  BUSQUEDAS_SUGERIDAS,
  leerBusquedas,
  registrarBusqueda,
  limpiarBusquedas
} from './busquedasSugeridas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', '..', 'public', 'data');
const catalog = JSON.parse(readFileSync(join(DATA, 'catalog.json'), 'utf8'));
const aliases = JSON.parse(readFileSync(join(DATA, 'aliases.json'), 'utf8'));
const counts = Object.fromEntries(catalog.map((c) => [c.slug, { count: c.count, cover: c.cover }]));

const buscar = (q) => searchCatalog(q, CATEGORIES, counts, aliases);

describe('BUSQUEDAS_SUGERIDAS', () => {
  // LA razón de ser de este archivo. Un chip que cae en "sin resultados" promete
  // catálogo y entrega un callejón: es peor que no ofrecer el chip.
  it('cada término sugerido encuentra algo real en el catálogo', () => {
    for (const termino of BUSQUEDAS_SUGERIDAS) {
      const out = buscar(termino);
      expect(out.kind, `"${termino}" no encontró nada`).not.toBe('empty');
      if (out.kind === 'results') {
        expect(out.results.length, `"${termino}" devolvió 0 resultados`).toBeGreaterThan(0);
      }
    }
  });

  it('no repite términos', () => {
    const vistos = BUSQUEDAS_SUGERIDAS.map((t) => t.toLowerCase());
    expect(new Set(vistos).size).toBe(vistos.length);
  });

  it('entran en una o dos filas de chips (máximo 8)', () => {
    expect(BUSQUEDAS_SUGERIDAS.length).toBeGreaterThanOrEqual(6);
    expect(BUSQUEDAS_SUGERIDAS.length).toBeLessThanOrEqual(8);
  });
});

describe('búsquedas recientes', () => {
  beforeEach(() => {
    // El entorno de test es `node`: no hay localStorage. Se simula uno mínimo,
    // que además deja probar el caso "storage roto".
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    };
  });

  it('guarda la última primero y no duplica', () => {
    registrarBusqueda('Boca');
    registrarBusqueda('Anime');
    registrarBusqueda('boca');
    expect(leerBusquedas()).toEqual(['boca', 'Anime']);
  });

  it('no guarda más de 5', () => {
    for (const t of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) registrarBusqueda(t);
    expect(leerBusquedas()).toEqual(['g', 'f', 'e', 'd', 'c']);
  });

  it('ignora términos vacíos', () => {
    registrarBusqueda('   ');
    registrarBusqueda('');
    expect(leerBusquedas()).toEqual([]);
  });

  it('tolera un JSON inválido sin romper', () => {
    localStorage.setItem('epicalcos.busquedas.v1', '{no es json');
    expect(leerBusquedas()).toEqual([]);
  });

  it('descarta entradas que no son texto', () => {
    localStorage.setItem('epicalcos.busquedas.v1', JSON.stringify(['Boca', 42, null, 'Anime']));
    expect(leerBusquedas()).toEqual(['Boca', 'Anime']);
  });

  it('limpiar deja la lista vacía', () => {
    registrarBusqueda('Boca');
    limpiarBusquedas();
    expect(leerBusquedas()).toEqual([]);
  });

  it('sin localStorage no lanza', () => {
    delete globalThis.localStorage;
    expect(() => registrarBusqueda('Boca')).not.toThrow();
    expect(leerBusquedas()).toEqual([]);
  });
});
