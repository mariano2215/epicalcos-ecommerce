import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CATEGORIES } from '../data/categories.js';

/**
 * El espejo de redirects: netlify.toml ↔ frontend/public/_redirects.
 *
 * POR QUÉ HAY DOS ARCHIVOS Y POR QUÉ TIENEN QUE DECIR LO MISMO: cada uno
 * termina con su propio fallback de SPA (`/*` → index.html, 200). Netlify los
 * concatena y gana la primera regla que matchea, así que una regla que quede
 * DETRÁS del `/*` del otro archivo no se aplica nunca. Escribir un redirect en
 * uno solo es escribirlo en ninguno, y el síntoma —una URL que "no redirige"
 * sin ningún error— es de los más caros de diagnosticar.
 *
 * Ya pasó: `_redirects` estaba corto de `/api/entregar-digital` y de
 * `/armá-tu-pack`. Este test existe para que no vuelva a pasar en silencio.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');

const toml = readFileSync(join(ROOT, 'netlify.toml'), 'utf8');
const redirectsTxt = readFileSync(join(ROOT, 'frontend', 'public', '_redirects'), 'utf8');

/** Reglas de netlify.toml, en orden: [{ from, to, status }]. */
function reglasDelToml(src) {
  return [...src.matchAll(/\[\[redirects\]\]\s*\n\s*from\s*=\s*"([^"]+)"\s*\n\s*to\s*=\s*"([^"]+)"\s*\n\s*status\s*=\s*(\d+)/g)]
    .map(([, from, to, status]) => ({ from, to, status: Number(status) }));
}

/** Reglas de _redirects, en orden. Se saltean comentarios y líneas vacías. */
function reglasDelTxt(src) {
  return src
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [from, to, status] = l.split(/\s+/);
      return { from, to, status: Number(status) };
    });
}

const enToml = reglasDelToml(toml);
const enTxt = reglasDelTxt(redirectsTxt);
const clave = (r) => `${r.from} → ${r.to} (${r.status})`;

describe('espejo netlify.toml ↔ _redirects', () => {
  it('los dos archivos declaran exactamente las mismas reglas', () => {
    expect([...enTxt.map(clave)].sort()).toEqual([...enToml.map(clave)].sort());
  });

  it('el fallback del SPA es la última regla de los dos', () => {
    expect(enToml.at(-1)).toEqual({ from: '/*', to: '/index.html', status: 200 });
    expect(enTxt.at(-1)).toEqual({ from: '/*', to: '/index.html', status: 200 });
  });
});

describe('301 de las categorías dadas de baja', () => {
  const deCategoria = enToml.filter((r) => r.from.startsWith('/categoria/'));
  const vivos = new Set(CATEGORIES.map((c) => c.slug));

  it('hay una regla por cada categoría que se dio de baja', () => {
    expect(deCategoria).toHaveLength(79);
  });

  it('todas son 301 (mudanza permanente), no 302 ni 200', () => {
    for (const r of deCategoria) expect(r.status).toBe(301);
  });

  it('ningún destino es una categoría que no existe', () => {
    // Un 301 a una categoría inexistente es peor que no redirigir: encadena
    // otro salto y termina igual en /categorias, pero por JavaScript.
    const rotos = deCategoria
      .filter((r) => r.to !== '/categorias')
      .filter((r) => !vivos.has(r.to.replace('/categoria/', '')));
    expect(rotos).toEqual([]);
  });

  it('ninguna regla pisa una categoría que sigue publicada', () => {
    // `/categoria/anime` existe: si alguien le pusiera un redirect, la
    // categoría quedaría inaccesible.
    const pisadas = deCategoria.filter((r) => vivos.has(r.from.replace('/categoria/', '')));
    expect(pisadas).toEqual([]);
  });

  it('ninguna redirige a sí misma ni encadena con otra regla', () => {
    const origenes = new Set(deCategoria.map((r) => r.from));
    for (const r of deCategoria) {
      expect(r.to).not.toBe(r.from);
      expect(origenes.has(r.to)).toBe(false);
    }
  });

  it('van ANTES del fallback del SPA en los dos archivos', () => {
    // Detrás del `/*` no se aplicarían nunca.
    const ultimaCat = (reglas) =>
      reglas.reduce((max, r, i) => (r.from.startsWith('/categoria/') ? i : max), -1);
    expect(ultimaCat(enToml)).toBeLessThan(enToml.length - 1);
    expect(ultimaCat(enTxt)).toBeLessThan(enTxt.length - 1);
  });
});
