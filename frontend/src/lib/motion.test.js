import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MOTION, FLASH_MS, staggerDelay, varStagger } from './motion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(__dirname, '..', 'styles', 'index.css'), 'utf8');

/**
 * Lee el valor de una custom property declarada en el `:root` del CSS.
 * Devuelve el número, sin unidad: `--motion-fast: 140ms` → 140.
 */
function token(nombre) {
  const m = CSS.match(new RegExp(`--motion-${nombre}:\\s*(\\d+)(ms|px)\\s*;`));
  return m ? Number(m[1]) : null;
}

/**
 * ⚠️ ESTE ARCHIVO ES EL ESPEJO DE LOS TOKENS DE MOTION.
 *
 * Mismo problema que el espejo de precios (CLAUDE.md regla 11), en chiquito: los
 * mismos números están escritos dos veces —en `styles/index.css` como custom
 * properties y en `lib/motion.js` como objeto— porque el navegador necesita unos
 * y el JS necesita los otros (ver el docblock de `MOTION`).
 *
 * Dos copias de un número sin nada que las ate se separan. Acá no se rechaza un
 * checkout, pero el síntoma es igual de molesto de diagnosticar: el drawer que
 * se desmonta antes de terminar de cerrarse, o que se queda 200 ms congelado en
 * pantalla, porque alguien tocó una duración de un solo lado.
 *
 * El test lee el CSS DE VERDAD, con `readFileSync`. Comparar dos constantes de
 * JavaScript no probaría nada: el token que usa el navegador es el del CSS.
 */
describe('tokens de motion — paridad CSS ↔ JS', () => {
  it('cada duración de MOTION está declarada igual en index.css', () => {
    expect(token('fast')).toBe(MOTION.fast);
    expect(token('quick')).toBe(MOTION.quick);
    expect(token('normal')).toBe(MOTION.normal);
    expect(token('slow')).toBe(MOTION.slow);
    expect(token('lento')).toBe(MOTION.lento);
    expect(token('stagger')).toBe(MOTION.stagger);
    expect(token('reveal')).toBe(MOTION.reveal);
    expect(token('distance')).toBe(MOTION.distance);
  });

  it('el tope del stagger del CSS es el mismo que el de JS', () => {
    // `.motion-stagger` topea el delay con un `min(..., 480ms)`. Ese 480 tiene
    // que ser `MOTION.staggerMax`, o una grilla de 61 categorías escalona
    // distinto según quién calcule el delay (el CSS o el `staggerDelay()` que
    // usan los consumidores de <Reveal>).
    const m = CSS.match(/\.motion-stagger > \*[\s\S]*?animation-delay:[^;]*?,\s*(\d+)ms\)/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBe(MOTION.staggerMax);
  });

  it('el stagger al scrollear usa el mismo tope que el de montaje', () => {
    // `.reveal-hijo` escalona con `transition-delay` y `.motion-stagger` con
    // `animation-delay`. Son dos mecanismos distintos para el mismo ritmo: si
    // los topes se separan, dos grillas de la misma página entran distinto.
    const m = CSS.match(/\.reveal-hijo[\s\S]*?transition-delay:[^;]*?,\s*(\d+)ms\)/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBe(MOTION.staggerMax);
  });

  it('las curvas y los keyframes que usan los componentes existen en el CSS', () => {
    // Si alguien renombra una clase en el CSS, el componente que la usa deja de
    // animar EN SILENCIO: no hay error, simplemente no se mueve nada. Esta lista
    // es la que atan los componentes de la spec 024.
    for (const clase of [
      'motion-fade-up', 'motion-fade', 'motion-scale-in', 'motion-stagger',
      'motion-press', 'motion-pop', 'motion-check-in', 'motion-zoom',
      'motion-overlay-in', 'motion-overlay-out', 'motion-panel-in', 'motion-panel-out',
      'motion-page', 'motion-menu', 'motion-dropzone',
      'hero-entra', 'header-sombra', 'reveal-hijo'
    ]) {
      expect(CSS, `falta la clase .${clase}`).toContain(`.${clase}`);
    }
    for (const curva of ['--motion-ease', '--motion-ease-out', '--motion-spring']) {
      expect(CSS, `falta la curva ${curva}`).toContain(`${curva}:`);
    }
  });

  it('toda clase de motion nueva está apagada bajo prefers-reduced-motion', () => {
    // El bloque de reduced-motion es lo único que separa a esta feature de ser
    // un problema de accesibilidad. Que una clase exista y NO esté listada ahí
    // es exactamente el error que este test viene a hacer imposible.
    const bloques = CSS.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');
    for (const clase of [
      'motion-fade-up', 'motion-fade', 'motion-scale-in', 'motion-stagger',
      'motion-press', 'motion-pop', 'motion-check-in', 'motion-zoom',
      'motion-overlay-in', 'motion-panel-in', 'motion-page', 'motion-menu',
      'motion-dropzone', 'hero-entra', 'reveal-hijo'
    ]) {
      expect(bloques, `.${clase} no está apagada con reduced-motion`).toContain(`.${clase}`);
    }
  });

  it('la escala va de menor a mayor y ninguna pasa el techo', () => {
    expect(MOTION.fast).toBeLessThan(MOTION.quick);
    expect(MOTION.quick).toBeLessThan(MOTION.normal);
    expect(MOTION.normal).toBeLessThan(MOTION.slow);
    expect(MOTION.slow).toBeLessThan(MOTION.lento);
    // El brief pide no pasar de ~1 s salvo excepción justificada. `lento` es el
    // techo declarado del sistema: si algún día alguien lo sube, que sea una
    // decisión y no un descuido.
    expect(MOTION.lento).toBeLessThanOrEqual(1000);
    // Microinteracción: 150-250 ms. Entradas: 300-600 ms.
    expect(MOTION.quick).toBeGreaterThanOrEqual(150);
    expect(MOTION.quick).toBeLessThanOrEqual(250);
    expect(MOTION.slow).toBeGreaterThanOrEqual(300);
    expect(MOTION.slow).toBeLessThanOrEqual(600);
  });
});

describe('staggerDelay', () => {
  it('el primer elemento no espera nada', () => {
    expect(staggerDelay(0)).toBe(0);
  });

  it('escala con el índice', () => {
    expect(staggerDelay(1)).toBe(MOTION.stagger);
    expect(staggerDelay(3)).toBe(MOTION.stagger * 3);
  });

  it('topea para que una grilla larga no entre en cámara lenta', () => {
    // El caso real: /categorias renderiza 61 cards. Sin tope, la última entraría
    // 3,6 segundos después de la primera.
    expect(staggerDelay(60)).toBe(MOTION.staggerMax);
    expect(staggerDelay(200)).toBe(MOTION.staggerMax);
  });

  it('un índice inválido no rompe el render', () => {
    // Un `delay` NaN terminaría escrito como `animation-delay: NaNms`, que el
    // navegador descarta: la card entraría sin escalonar en vez de no entrar.
    // Igual se devuelve 0 — un componente no tiene por qué validar esto.
    expect(staggerDelay(undefined)).toBe(0);
    expect(staggerDelay(NaN)).toBe(0);
    expect(staggerDelay(-3)).toBe(0);
  });

  it('acepta un paso y un tope propios', () => {
    expect(staggerDelay(2, 30, 180)).toBe(60);
    expect(staggerDelay(20, 30, 180)).toBe(180);
  });
});

describe('varStagger', () => {
  it('devuelve la custom property que lee .motion-stagger', () => {
    expect(varStagger(4)).toEqual({ '--i': 4 });
  });
});

describe('FLASH_MS', () => {
  it('la confirmación del botón se apaga antes que el toast del carrito', () => {
    // El toast de `CartContext` dura 2.200 ms. El "✓" del botón es el aviso
    // chico y tiene que apagarse antes que el grande: si sobrevive al toast,
    // queda un botón en "✓" sin nada alrededor que lo explique.
    expect(FLASH_MS).toBeLessThan(2200);
    // Y tiene que durar lo suficiente para leerse.
    expect(FLASH_MS).toBeGreaterThan(MOTION.slow);
  });
});
