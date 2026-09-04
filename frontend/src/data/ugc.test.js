import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { UGC } from './ugc.js';
import { TESTIMONIALS } from './testimonials.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', '..', 'public');

/**
 * La galería "Así quedan en la vida real" (spec 014).
 *
 * Una foto rota en la única sección que muestra el producto usado es peor que
 * no tener la sección. Y un `alt` vacío la deja invisible para quien navega con
 * lector de pantalla, que es justo donde el texto tiene que hacer el trabajo de
 * la imagen.
 */
describe('UGC', () => {
  it('todas las fotos existen en public/', () => {
    for (const f of UGC) {
      expect(existsSync(join(PUBLIC, f.src)), `falta el archivo ${f.src}`).toBe(true);
    }
  });

  it('todas describen la foto (alt real, no "foto")', () => {
    for (const f of UGC) {
      expect(f.alt, `${f.src} sin alt`).toBeTruthy();
      expect(f.alt.trim().length, `${f.src} con alt demasiado corto`).toBeGreaterThan(20);
    }
  });

  it('no repite la misma foto dos veces', () => {
    const srcs = UGC.map((f) => f.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  it('las fotos de testimonios también existen', () => {
    // Comparten carpeta y ahora también sección: si alguien borra una imagen de
    // /testimonials/ se rompen las dos pantallas, no una.
    for (const t of TESTIMONIALS) {
      if (!t.image) continue;
      expect(existsSync(join(PUBLIC, t.image)), `falta el archivo ${t.image}`).toBe(true);
    }
  });
});
