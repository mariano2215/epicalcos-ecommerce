import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { EXPERIMENTS } from './experiments.js';
import {
  TITULARES,
  CTA_PRINCIPAL,
  TITULAR_POR_DEFECTO,
  CTA_POR_DEFECTO,
  BUSCADOR_POR_DEFECTO,
  ubicacionBuscador
} from './heroVariantes.js';

/**
 * El hero es lo único que ve arriba del fold la mitad del tráfico, y ahora su
 * texto sale de un experimento. `experiments.test.js` ya cubre el bucketing
 * (que la variante sea estable, que el kill switch mande); esto cubre lo otro:
 * que el CONTENIDO de cada variante sea publicable.
 *
 * Un error acá no se ve en la pantalla del que lo escribió —él cae en una sola
 * celda— y se lo come el 50 % del tráfico durante todo el test.
 */

const norm = (s) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const claves = (obj) => Object.keys(obj).sort();

describe('experimentos del hero', () => {
  it('los tres están declarados y son A/B, no A/B/n', () => {
    for (const id of ['hero_titular', 'hero_cta', 'hero_buscador']) {
      expect(EXPERIMENTS[id], `falta el experimento ${id}`).toBeTruthy();
      expect(EXPERIMENTS[id].variants).toHaveLength(2);
    }
  });

  it('cada variante declarada tiene su copy — ninguna deja el hero vacío', () => {
    expect(claves(TITULARES)).toEqual([...EXPERIMENTS.hero_titular.variants].sort());
    expect(claves(CTA_PRINCIPAL)).toEqual([...EXPERIMENTS.hero_cta.variants].sort());
  });

  it('variants[0] es el control, y el control es el copy que ya estaba publicado', () => {
    // Si el "control" fuera copy nuevo, el test compararía dos cosas nuevas y no
    // habría contra qué medir la mejora.
    expect(EXPERIMENTS.hero_titular.variants[0]).toBe(TITULAR_POR_DEFECTO);
    expect(EXPERIMENTS.hero_cta.variants[0]).toBe(CTA_POR_DEFECTO);
    expect(TITULARES[TITULAR_POR_DEFECTO].h1.join(' ')).toBe('Calcos para todo lo que te gusta');
    expect(CTA_PRINCIPAL[CTA_POR_DEFECTO]).toBe('Ver todos los diseños');

    // El control del buscador es la sección propia, que es lo que salió con el
    // rediseño (spec 014) y es lo que hoy ve todo el mundo.
    expect(EXPERIMENTS.hero_buscador.variants[0]).toBe(BUSCADOR_POR_DEFECTO);
    expect(ubicacionBuscador(BUSCADOR_POR_DEFECTO).enSeccion).toBe(true);
  });
});

describe('ubicación del buscador', () => {
  it('en TODA variante hay exactamente un buscador: ni dos ni ninguno', () => {
    // El bug que esto evita: si el hero enciende el buscador y la sección no se
    // apaga, quedan dos buscadores con chips apilados. Y al revés, la Home se
    // queda sin buscador — que con 61 categorías es quedarse sin navegación.
    for (const v of EXPERIMENTS.hero_buscador.variants) {
      const u = ubicacionBuscador(v);
      expect(Number(u.enHero) + Number(u.enSeccion), `la variante "${v}" no ubica exactamente un buscador`).toBe(1);
    }
  });

  it('`en_hero` lo pone en el hero y apaga la sección', () => {
    expect(ubicacionBuscador('en_hero')).toEqual({ enHero: true, enSeccion: false });
  });

  it('una variante desconocida cae en el control, no deja la Home sin buscador', () => {
    // `useExperiment` devuelve null si el experimento se borra de EXPERIMENTS.
    for (const raro of [null, undefined, 'inventada', '']) {
      expect(ubicacionBuscador(raro).enSeccion, `"${raro}" dejó la Home sin buscador`).toBe(true);
    }
  });
});

describe('copy del titular', () => {
  it('TODA variante nombra el producto en el H1 o en el subtítulo', () => {
    // El piso de SEO (RF-9). El H1 de `objeto` no dice "calcos" a propósito —es
    // lo que se está probando—, así que lo dice su subtítulo. La regla vale
    // también para cualquier variante que se agregue después.
    for (const [nombre, v] of Object.entries(TITULARES)) {
      const texto = norm(`${v.h1.join(' ')} ${v.subtitulo}`);
      expect(texto, `la variante "${nombre}" no nombra el producto`).toContain('calco');
    }
  });

  it('ningún H1 ni subtítulo queda vacío', () => {
    for (const [nombre, v] of Object.entries(TITULARES)) {
      expect(v.h1, `${nombre}: el H1 va partido en dos`).toHaveLength(2);
      for (const parte of v.h1) expect(parte.trim().length, nombre).toBeGreaterThan(0);
      expect(v.subtitulo.trim().length, nombre).toBeGreaterThan(20);
    }
  });

  it('el H1 entra en dos o tres líneas a 375 px', () => {
    // El hero es lo único arriba del fold: un titular de cuatro líneas empuja
    // los dos CTA fuera de la pantalla en un celular.
    for (const [nombre, v] of Object.entries(TITULARES)) {
      expect(v.h1.join(' ').length, `el H1 de "${nombre}" es muy largo`).toBeLessThanOrEqual(40);
    }
  });

  it('el subtítulo se mantiene corto (2-3 líneas)', () => {
    for (const [nombre, v] of Object.entries(TITULARES)) {
      expect(v.subtitulo.length, `el subtítulo de "${nombre}" es muy largo`).toBeLessThanOrEqual(180);
    }
  });
});

describe('copy del CTA', () => {
  it('ningún botón queda sin texto', () => {
    for (const [nombre, texto] of Object.entries(CTA_PRINCIPAL)) {
      expect(texto.trim().length, nombre).toBeGreaterThan(0);
    }
  });

  it('entra en el botón sin partirse a 375 px', () => {
    for (const [nombre, texto] of Object.entries(CTA_PRINCIPAL)) {
      expect(texto.length, `el CTA "${nombre}" es muy largo`).toBeLessThanOrEqual(24);
    }
  });
});

describe('colisiones de copy en la Home', () => {
  it('ningún titular del hero repite el título de Antes/Después', () => {
    // "Tu termo. Pero más vos." era el H2 de AntesDespues y pasó a ser una
    // variante del H1. Con las dos vivas, media Home leía la misma frase dos
    // veces y la sección de transformación perdía su golpe.
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const fuente = readFileSync(
      join(__dirname, '..', 'components', 'AntesDespues.jsx'),
      'utf8'
    );
    // Texto del <h2>, salteando los atributos de la etiqueta de apertura.
    const bloque = fuente.split('<h2')[1].split('</h2>')[0];
    const h2 = bloque
      .slice(bloque.indexOf('>') + 1)
      .replace(/\{'\s'\}/g, ' ')   // el {' '} del JSX es un espacio real
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Guardarraíl del guardarraíl: si el parseo se rompe (alguien reformatea el
    // JSX), `h2` deja de parecerse a un título y esta comparación pasaría sola
    // sin comparar nada. Mejor que falle acá y de forma ruidosa.
    expect(h2, 'el parseo del <h2> de AntesDespues se rompió').not.toContain('className');
    expect(h2.length).toBeGreaterThan(5);
    expect(h2.length).toBeLessThan(60);

    for (const [nombre, v] of Object.entries(TITULARES)) {
      expect(norm(h2), `la variante "${nombre}" repite el título de Antes/Después`)
        .not.toBe(norm(v.h1.join(' ')));
    }
  });
});
