import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { portadaDe, rotacionesSinRepetir } from './portadas.js';
import { searchCatalog } from './searchCatalog.js';
import { CATEGORIES } from '../data/categories.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', '..', 'public', 'data');
const catalog = JSON.parse(readFileSync(join(DATA, 'catalog.json'), 'utf8'));
const duplicados = JSON.parse(readFileSync(join(DATA, 'duplicados.json'), 'utf8'));
const portadas = JSON.parse(readFileSync(join(DATA, 'portadas.json'), 'utf8'));
const counts = Object.fromEntries(
  catalog.map((c) => [c.slug, { count: c.count, cover: c.cover, portadas: portadas[c.slug] }])
);
const aliases = { categorias: {}, rutas: {} };

const listado = (orden) => searchCatalog('', CATEGORIES, counts, aliases, orden).results;

/** Portadas resueltas tal como las renderiza la grilla. */
function portadasDeLaGrilla(semilla, orden = 'az') {
  const cats = listado(orden);
  const rot = rotacionesSinRepetir(cats, counts, semilla, duplicados);
  return cats.map((c) =>
    portadaDe(
      c.slug,
      counts[c.slug].count,
      rot[c.slug],
      counts[c.slug].cover,
      counts[c.slug].portadas
    )
  );
}

/** Dos archivos con el mismo contenido cuentan como el mismo diseño. */
const canonica = (url) => duplicados[url] || url;

describe('portadaDe', () => {
  it('misma categoría y misma rotación → siempre la misma imagen', () => {
    expect(portadaDe('anime', 100, 7)).toBe(portadaDe('anime', 100, 7));
  });

  it('la rotación mueve el diseño dentro de la carpeta de la categoría', () => {
    const a = portadaDe('anime', 100, 0);
    const b = portadaDe('anime', 100, 1);
    expect(a).not.toBe(b);
    expect(b.startsWith('/stickers/anime/')).toBe(true);
  });

  it('el índice nunca se sale del rango de la categoría', () => {
    for (let r = 0; r < 50; r++) {
      const n = Number(portadaDe('cats', 12, r).split('/').pop().replace('.webp', ''));
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(12);
    }
  });

  it('sin catálogo se queda con la portada de catalog.json', () => {
    expect(portadaDe('x', 0, 3, '/stickers/x/1.webp')).toBe('/stickers/x/1.webp');
    expect(portadaDe('x', 1, 3, '/stickers/x/1.webp')).toBe('/stickers/x/1.webp');
  });

  it('con lista de portadas nunca elige un diseño de afuera de la lista', () => {
    // El punto de la spec 011: los que no están en la lista tienen fondo
    // transparente y sobre la card se ven flotando.
    const lista = [3, 7, 12, 40];
    const permitidas = lista.map((n) => `/stickers/anime/${n}.webp`);
    for (let r = 0; r < 60; r++) {
      expect(permitidas).toContain(portadaDe('anime', 100, r, undefined, lista));
    }
  });

  it('con una sola portada elegible es siempre esa, rote lo que rote', () => {
    for (const r of [0, 1, 5, 99]) {
      expect(portadaDe('anime', 100, r, undefined, [8])).toBe('/stickers/anime/8.webp');
    }
  });

  it('la lista vacía no cuenta: elige como si no hubiera lista', () => {
    expect(portadaDe('anime', 100, 4, undefined, [])).toBe(portadaDe('anime', 100, 4));
  });
});

describe('rotacionesSinRepetir', () => {
  it('ninguna categoría muestra el diseño de otra', () => {
    // Varias semillas: la garantía tiene que valer en cualquier visita, no en
    // la que salió bien.
    for (const semilla of [0, 1, 7, 42, 1234, 9999]) {
      const vistas = portadasDeLaGrilla(semilla).map(canonica);
      expect(new Set(vistas).size).toBe(vistas.length);
    }
  });

  it('tampoco se repiten los diseños que están en dos carpetas distintas', () => {
    // Sin colapsar duplicados el test de arriba pasaría igual (las rutas ya son
    // únicas por carpeta). Este verifica lo que importa: el DIBUJO.
    const [dup, original] = Object.entries(duplicados)[0];
    expect(canonica(dup)).toBe(canonica(original));
  });

  it('devuelve una rotación para cada categoría del listado', () => {
    const cats = listado('az');
    const rot = rotacionesSinRepetir(cats, counts, 3, duplicados);
    for (const c of cats) expect(typeof rot[c.slug]).toBe('number');
  });

  it('la grilla cambia de portadas entre una visita y otra', () => {
    expect(portadasDeLaGrilla(1)).not.toEqual(portadasDeLaGrilla(2));
  });

  it('con la misma semilla la grilla es idéntica (nada de saltos en un re-render)', () => {
    expect(portadasDeLaGrilla(77)).toEqual(portadasDeLaGrilla(77));
  });

  it('toda categoría con portadas elegibles muestra una de ellas', () => {
    for (const semilla of [0, 1, 7, 42, 1234, 9999]) {
      const cats = listado('az');
      const rot = rotacionesSinRepetir(cats, counts, semilla, duplicados);
      for (const c of cats) {
        const lista = counts[c.slug].portadas;
        if (!lista?.length) continue;
        const url = portadaDe(c.slug, counts[c.slug].count, rot[c.slug], counts[c.slug].cover, lista);
        const n = Number(url.split('/').pop().replace('.webp', ''));
        expect(lista).toContain(n);
      }
    }
  });

  it('no se cuelga con una categoría de un solo diseño', () => {
    const cats = [{ slug: 'a' }, { slug: 'b' }];
    const c = { a: { count: 1, cover: '/stickers/a/1.webp' }, b: { count: 1, cover: '/stickers/b/1.webp' } };
    expect(rotacionesSinRepetir(cats, c, 5, {})).toEqual({ a: 5, b: 5 });
  });
});

// La red que avisa si se reemplazó el catálogo y no se volvió a correr
// scripts/build-portadas.mjs: los índices quedarían apuntando a otros dibujos.
describe('portadas.json', () => {
  it('solo lista categorías que existen en catalog.json', () => {
    const slugs = new Set(catalog.map((c) => c.slug));
    for (const slug of Object.keys(portadas)) expect(slugs.has(slug)).toBe(true);
  });

  it('todo índice cae dentro de la cantidad de diseños de su categoría', () => {
    for (const c of catalog) {
      for (const n of portadas[c.slug] || []) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(c.count);
      }
    }
  });

  it('los índices vienen ordenados y sin repetir (el diff de git tiene que ser estable)', () => {
    for (const lista of Object.values(portadas)) {
      expect(lista).toEqual([...new Set(lista)].sort((a, b) => a - b));
    }
  });
});
