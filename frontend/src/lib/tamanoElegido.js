/**
 * Tamaño elegido para la grilla — uno solo para toda la sesión.
 *
 * Antes cada card tenía su propio selector de 4/6/9 cm. Con 254 diseños en una
 * categoría, eso son 254 decisiones repetidas para algo que en la práctica se
 * elige una vez, y tres botones de alto en CADA card (la card medía 379 px y
 * entraban tres diseños por pantalla).
 *
 * Ahora la decisión es de la PÁGINA: se elige arriba de la grilla, se recuerda
 * en localStorage y todas las cards cotizan y agregan con ese tamaño.
 *
 * Se usa `useSyncExternalStore` para que cambiar el tamaño en el selector
 * repinte las cards al instante: son componentes hermanos, sin estado común.
 */
import { useSyncExternalStore, useCallback } from 'react';
import { SIZES, DEFAULT_SIZE } from '../config/pricing.js';

const STORAGE_KEY = 'epicalcos.tamano.v1';

/**
 * Un id que no esté en SIZES daría `priceForSize` → precio del primer tamaño y
 * la línea viajaría al checkout con un precio que el servidor no espera
 * (`price_mismatch`, ver netlify/functions/lib/pricing.js). Por eso todo lo que
 * entra se valida contra el catálogo de tamaños.
 */
const esValido = (id) => SIZES.some((s) => s.id === id);

let actual = leerDeStorage();
const suscriptores = new Set();

function leerDeStorage() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    return esValido(guardado) ? guardado : DEFAULT_SIZE;
  } catch {
    // localStorage bloqueado (modo privado, navegador embebido de Instagram):
    // el tamaño vive en memoria y punto.
    return DEFAULT_SIZE;
  }
}

export function getTamano() {
  return actual;
}

export function setTamano(id) {
  if (!esValido(id) || id === actual) return;
  actual = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ver leerDeStorage */
  }
  suscriptores.forEach((fn) => fn());
}

function subscribe(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

/** @returns {[string, (id: string) => void]} */
export function useTamanoElegido() {
  const size = useSyncExternalStore(subscribe, getTamano, () => DEFAULT_SIZE);
  return [size, useCallback(setTamano, [])];
}
