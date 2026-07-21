import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { searchCatalog, norm } from './searchCatalog.js';
import { CATEGORIES } from '../data/categories.js';

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
    expect(run('mi logo')).toMatchObject({ kind: 'route', route: '/personalizados' });
    expect(run('por mayor')).toMatchObject({ kind: 'route', route: '/mayorista' });
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
