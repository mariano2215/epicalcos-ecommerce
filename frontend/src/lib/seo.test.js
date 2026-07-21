import { describe, it, expect } from 'vitest';
import { buildCanonicalPath, abs } from './seo.js';

describe('buildCanonicalPath', () => {
  it('elimina query y hash', () => {
    expect(buildCanonicalPath('/categoria/argentina?utm_source=ig#productos')).toBe(
      '/categoria/argentina'
    );
  });

  it('colapsa barras repetidas y quita la trailing slash', () => {
    expect(buildCanonicalPath('/categoria//anime/')).toBe('/categoria/anime');
  });

  it('la raíz queda como /', () => {
    expect(buildCanonicalPath('/')).toBe('/');
    expect(buildCanonicalPath('')).toBe('/');
  });
});

describe('abs', () => {
  it('convierte una ruta relativa en absoluta contra site.url', () => {
    expect(abs('/stickers/anime/1.webp')).toBe('https://epicalcos.com/stickers/anime/1.webp');
  });

  it('respeta URLs que ya son absolutas', () => {
    expect(abs('https://cdn.example/y.webp')).toBe('https://cdn.example/y.webp');
  });
});
