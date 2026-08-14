import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// El número que se hornea en el bundle y se muestra en el copy.
import { CATEGORY_COUNT } from '../data/catalogStats.js';
// La lista de categorías que renderiza /categorias.
import { CATEGORIES } from '../data/categories.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'public', 'data', 'catalog.json'), 'utf8')
);

/**
 * catalogStats.js lo genera scripts/build-catalog.mjs y se commitea. Si alguien
 * agrega o saca una carpeta de stickers y no vuelve a correr el pipeline, el
 * archivo queda viejo y el Hero anuncia una cantidad de categorías que no es la
 * que hay. Es el mismo tipo de desfasaje que la regla 11 cuida en los precios:
 * un valor escrito en dos lados que nadie vuelve a mirar hasta que rompe.
 */
describe('catalogStats.js está en sync con el catálogo', () => {
  it('CATEGORY_COUNT es la cantidad de categorías de catalog.json', () => {
    expect(CATEGORY_COUNT).toBe(catalog.length);
  });

  it('CATEGORY_COUNT coincide con las categorías que renderiza el front', () => {
    expect(CATEGORY_COUNT).toBe(CATEGORIES.length);
  });

  it('cada categoría de catalog.json tiene su entrada en CATEGORIES', () => {
    const enFront = new Set(CATEGORIES.map((c) => c.slug));
    const huerfanas = catalog.map((c) => c.slug).filter((s) => !enFront.has(s));
    expect(huerfanas).toEqual([]);
  });

  it('no hay categorías en el front que no existan en el catálogo', () => {
    const enCatalogo = new Set(catalog.map((c) => c.slug));
    const fantasmas = CATEGORIES.map((c) => c.slug).filter((s) => !enCatalogo.has(s));
    expect(fantasmas).toEqual([]);
  });
});
