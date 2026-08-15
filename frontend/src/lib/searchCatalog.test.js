import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { searchCatalog, norm } from './searchCatalog.js';
import { CATEGORIES } from '../data/categories.js';
import { isSectionHidden } from '../config/site.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', '..', 'public', 'data');
const catalog = JSON.parse(readFileSync(join(DATA, 'catalog.json'), 'utf8'));
const aliases = JSON.parse(readFileSync(join(DATA, 'aliases.json'), 'utf8'));
const counts = Object.fromEntries(
  catalog.map((c) => [c.slug, { count: c.count, cover: c.cover }])
);

const run = (q) => searchCatalog(q, CATEGORIES, counts, aliases);
const slugs = (r) => r.results.map((c) => c.slug);

describe('norm', () => {
  it('normaliza acentos, mayúsculas y espacios', () => {
    expect(norm('  FÚTBOL   Argentino ')).toBe('futbol argentino');
    expect(norm('Pokémon')).toBe('pokemon');
  });
});

describe('searchCatalog', () => {
  it('sin query devuelve todo el catálogo (kind "all")', () => {
    const out = run('');
    expect(out.kind).toBe('all');
    expect(out.results.length).toBeGreaterThan(0);
  });

  it('"futbol" y "fútbol" devuelven exactamente lo mismo', () => {
    expect(slugs(run('futbol'))).toEqual(slugs(run('fútbol')));
    expect(run('futbol').kind).toBe('results');
  });

  it('rutea la intención comercial a la página de mayor margen', () => {
    expect(run('por mayor')).toMatchObject({ kind: 'route', route: '/mayorista' });
  });

  it('la intención de una sección despublicada cae en Contacto, no en su ruta', () => {
    // "mi logo" apunta a /personalizados. Mientras esté en HIDDEN_SECTIONS la ruta
    // redirige, así que el buscador tiene que mandar a WhatsApp en vez de ahí.
    const esperado = isSectionHidden('personalizados') ? '/contacto' : '/personalizados';
    expect(run('mi logo')).toMatchObject({ kind: 'route', route: esperado });
  });

  it('resuelve alias a la categoría real', () => {
    expect(run('goku').kind).toBe('results');
    expect(slugs(run('goku'))).toContain('dragon-ball');
    expect(slugs(run('gato'))).toContain('cats');
  });

  it('término sin catálogo → estado vacío con sugerencias', () => {
    const out = run('xyzzy-no-existe-123');
    expect(out.kind).toBe('empty');
    expect(out.suggestions.length).toBeGreaterThan(0);
  });
});

describe('orden del listado', () => {
  const nombres = (orden) =>
    searchCatalog('', CATEGORIES, counts, aliases, orden).results.map((c) => c.name);

  it('por defecto el catálogo sale alfabético', () => {
    const ns = nombres(undefined);
    const ordenados = [...ns].sort((a, b) => norm(a).localeCompare(norm(b), 'es'));
    expect(ns).toEqual(ordenados);
  });

  it('"disenos" ordena de la categoría más grande a la más chica', () => {
    const out = searchCatalog('', CATEGORIES, counts, aliases, 'disenos');
    const cs = out.results.map((c) => counts[c.slug].count);
    expect(cs).toEqual([...cs].sort((a, b) => b - a));
  });

  it('un orden inválido cae en el alfabético en vez de romper', () => {
    expect(nombres('lo-que-sea')).toEqual(nombres('az'));
  });

  it('el orden no cambia QUÉ categorías se muestran, sólo en qué secuencia', () => {
    expect([...nombres('az')].sort()).toEqual([...nombres('disenos')].sort());
  });

  it('con búsqueda manda la relevancia: el orden elegido no la pisa', () => {
    const az = searchCatalog('futbol', CATEGORIES, counts, aliases, 'az');
    const dis = searchCatalog('futbol', CATEGORIES, counts, aliases, 'disenos');
    expect(az.results.map((c) => c.slug)).toEqual(dis.results.map((c) => c.slug));
  });
});
