/**
 * Paridad del fallback de Netlify Blobs entre los dos stores.
 *
 * Netlify dejó de inyectarle las credenciales de Blobs a las funciones y
 * `getStore(nombre)` empezó a tirar `MissingBlobsEnvironmentError`. Los catch
 * de cada store lo tapan, así que desde afuera todo parece andar: no se guardan
 * pedidos ni carritos y nadie se entera.
 *
 * El fallback manual (NETLIFY_BLOBS_SITE_ID + NETLIFY_BLOBS_TOKEN) estaba SOLO
 * en `abandonedStore.js`. Cargar las variables arreglaba los carritos y dejaba
 * los pedidos igual de rotos — el arreglo a medias es peor que ninguno, porque
 * se da por cerrado.
 *
 * Se lee el fuente a propósito: los archivos de `netlify/functions` viven fuera
 * del root de Vitest y `vi.mock` no los alcanza, así que no se puede observar
 * qué `getStore` se llama. Lo que importa acá es que los dos no se separen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const fuente = (archivo) =>
  readFileSync(fileURLToPath(new URL(`../../../netlify/functions/lib/${archivo}`, import.meta.url)), 'utf8');

const STORES = ['orderStore.js', 'abandonedStore.js'];

describe('los dos stores de Blobs comparten el mismo fallback', () => {
  it.each(STORES)('%s usa NETLIFY_BLOBS_SITE_ID + NETLIFY_BLOBS_TOKEN', (archivo) => {
    const src = fuente(archivo);

    expect(src).toContain('NETLIFY_BLOBS_SITE_ID');
    expect(src).toContain('NETLIFY_BLOBS_TOKEN');
    // Sin credenciales explícitas tiene que seguir cayendo al getStore de
    // siempre: el día que Netlify vuelva a inyectarlas, esto sigue andando.
    expect(src).toMatch(/siteID && token \? getStore\(/);
  });

  it.each(STORES)('%s nunca deja escapar un fallo de Blobs', (archivo) => {
    const src = fuente(archivo);
    const exportadas = src.match(/export async function \w+/g) || [];

    expect(exportadas.length).toBeGreaterThan(0);
    // Un throw de Blobs que suba hasta el handler tira el checkout entero.
    expect(src.match(/catch/g)?.length || 0).toBeGreaterThanOrEqual(exportadas.length);
  });
});
