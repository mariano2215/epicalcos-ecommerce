import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { searchCatalog } from './searchCatalog.js';
import { CATEGORIES } from '../data/categories.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', '..', 'public');
const DATA = join(PUBLIC, 'data');

const catalog = JSON.parse(readFileSync(join(DATA, 'catalog.json'), 'utf8'));
const aliases = JSON.parse(readFileSync(join(DATA, 'aliases.json'), 'utf8'));
const counts = Object.fromEntries(catalog.map((c) => [c.slug, { count: c.count, cover: c.cover }]));
const buscar = (q) => searchCatalog(q, CATEGORIES, counts, aliases);

/** Las 11 categorías que entraron con el segundo lote (spec 016). */
const NUEVAS = [
  'arte', 'aura', 'bad-bunny', 'lord-of-the-rings', 'moda',
  'pixar', 'rey-leon', 'shrek', 'tarot', 'verano', 'weed'
];

/** Categorías que se venden en la web pero NO van al catálogo de Meta. */
const SIN_FEED = ['weed'];

describe('segundo lote — las categorías nuevas están publicadas', () => {
  it('todas están en CATEGORIES con nombre y emoji', () => {
    for (const slug of NUEVAS) {
      const cat = CATEGORIES.find((c) => c.slug === slug);
      expect(cat, `falta ${slug} en CATEGORIES`).toBeTruthy();
      expect(cat.name.trim().length, slug).toBeGreaterThan(0);
      expect(cat.emoji.trim().length, slug).toBeGreaterThan(0);
    }
  });

  it('todas tienen diseños en catalog.json y archivos en disco', () => {
    for (const slug of NUEVAS) {
      const entrada = catalog.find((c) => c.slug === slug);
      expect(entrada, `falta ${slug} en catalog.json`).toBeTruthy();
      expect(entrada.count, slug).toBeGreaterThan(0);

      const dir = join(PUBLIC, 'stickers', slug);
      expect(existsSync(dir), `falta ${dir}`).toBe(true);
      const webps = readdirSync(dir).filter((f) => /\.webp$/i.test(f));
      expect(webps.length, `${slug}: catalog.json dice ${entrada.count}`).toBe(entrada.count);
    }
  });

  it('los slugs son URLs válidas y únicas', () => {
    // El slug es la URL pública y la clave de los SKUs: una vez elegido no se cambia.
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of NUEVAS) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('la numeración de cada categoría nueva arranca en 1 y no tiene huecos', () => {
    for (const slug of NUEVAS) {
      const nums = readdirSync(join(PUBLIC, 'stickers', slug))
        .filter((f) => /\.webp$/i.test(f))
        .map((f) => parseInt(f, 10))
        .sort((a, b) => a - b);
      expect(nums[0], slug).toBe(1);
      expect(nums[nums.length - 1], `${slug} tiene huecos`).toBe(nums.length);
    }
  });
});

describe('segundo lote — se encuentran en el buscador', () => {
  it('cada categoría nueva tiene alias', () => {
    for (const slug of NUEVAS) {
      expect(aliases.categorias[slug], `${slug} sin alias: sólo se encontraría escribiendo el nombre exacto`)
        .toBeTruthy();
      expect(aliases.categorias[slug].length, slug).toBeGreaterThanOrEqual(5);
    }
  });

  it('cada alias devuelve SU categoría primera, no otra', () => {
    // El caso que esto evita es real: "toy story" y "pixar" eran alias de
    // `disney`, que tiene el triple de diseños. Con el empate de score gana el
    // más grande, así que buscar "pixar" nunca habría mostrado Pixar.
    for (const slug of NUEVAS) {
      for (const alias of aliases.categorias[slug]) {
        const out = buscar(alias);
        if (out.kind === 'route') continue; // una intención comercial mandó primero
        expect(out.kind, `"${alias}" (${slug}) no encontró nada`).toBe('results');
        expect(out.results[0].slug, `"${alias}" devolvió ${out.results[0].slug} antes que ${slug}`)
          .toBe(slug);
      }
    }
  });
});

describe('segundo lote — feed de Meta', () => {
  const csv = readFileSync(join(DATA, 'meta-catalog.csv'), 'utf8');
  const registro = JSON.parse(readFileSync(join(DATA, 'skus.json'), 'utf8'));

  it('las categorías sin feed no aparecen en meta-catalog.csv', () => {
    for (const slug of SIN_FEED) {
      expect(csv.includes(`/producto/${slug}/`), `${slug} se coló en el feed de Meta`).toBe(false);
    }
  });

  it('las categorías sin feed no consumen SKU del registro', () => {
    for (const slug of SIN_FEED) {
      const claves = Object.keys(registro.byKey).filter((k) => k.startsWith(`${slug}/`));
      expect(claves.length, `${slug} quemó ${claves.length} SKUs`).toBe(0);
    }
  });

  it('sus diseños quedan sin sku, y el front lo tolera', () => {
    // `contentId()` de lib/analytics.js cae al id interno si no hay catalogSku.
    for (const slug of SIN_FEED) {
      const items = JSON.parse(readFileSync(join(DATA, `${slug}.json`), 'utf8'));
      expect(items.length).toBeGreaterThan(0);
      for (const it of items) expect(it.sku, `${it.id} tiene sku`).toBeUndefined();
    }
  });

  it('ningún SKU está repetido: el registro sigue siendo append-only', () => {
    const valores = Object.values(registro.byKey);
    expect(new Set(valores).size, 'hay SKUs duplicados en el registro').toBe(valores.length);
  });

  it('el resto de las categorías nuevas sí tiene SKU', () => {
    for (const slug of NUEVAS.filter((s) => !SIN_FEED.includes(s))) {
      const items = JSON.parse(readFileSync(join(DATA, `${slug}.json`), 'utf8'));
      for (const it of items) expect(it.sku, `${it.id} sin sku`).toMatch(/^\d{6}$/);
    }
  });
});
