import { describe, it, expect } from 'vitest';
import {
  COPY_HERO,
  TERMO,
  CALCOS,
  DESTINOS_PEGADO,
  ANCHO_PEGADA,
  duracionEntradaMs,
  dentroDelCuerpo,
  ajustarAlCuerpo
} from './heroTermo.js';

/**
 * El hero del termo (spec 028). Lo que se cuida acá es lo que se rompe sin que
 * se note en la pantalla de quien edita: una calco copiada y pegada que termina
 * moviéndose igual que otra (el punto 13 del pedido: "no quiero que los cuatro
 * stickers hagan la misma animación"), un parallax que se vuelve un elemento
 * persiguiendo al cursor, o una entrada que se estira y demora el hero.
 */

const norm = (s) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

describe('copy del hero', () => {
  it('el H1 nombra el producto (piso de SEO de la spec 015)', () => {
    expect(norm(COPY_HERO.h1.join(' '))).toContain('calco');
  });

  it('el H1 va partido en dos y ninguna parte queda vacía', () => {
    expect(COPY_HERO.h1).toHaveLength(2);
    for (const parte of COPY_HERO.h1) expect(parte.trim().length).toBeGreaterThan(0);
  });

  it('el H1 entra en dos o tres líneas a 375 px', () => {
    // Mismo tope que las variantes de la spec 015: más largo empuja los botones
    // fuera de la primera pantalla del celular.
    expect(COPY_HERO.h1.join(' ').length).toBeLessThanOrEqual(40);
  });

  it('la bajada es una sola idea corta', () => {
    expect(COPY_HERO.bajada.trim().length).toBeGreaterThan(20);
    expect(COPY_HERO.bajada.length).toBeLessThanOrEqual(90);
  });

  it('los botones tienen texto y no se parten a 375 px', () => {
    for (const texto of [COPY_HERO.ctaPrincipal, COPY_HERO.ctaSecundario]) {
      expect(texto.trim().length).toBeGreaterThan(0);
      expect(texto.length).toBeLessThanOrEqual(24);
    }
  });
});

describe('assets', () => {
  it('todo sale de /images/hero/ y declara sus medidas (sin salto de layout)', () => {
    for (const img of [TERMO, ...CALCOS]) {
      expect(img.src).toMatch(/^\/images\/hero\/[\w-]+\.webp$/);
      expect(img.ancho).toBeGreaterThan(0);
      expect(img.alto).toBeGreaterThan(0);
    }
  });

  it('el termo tiene texto alternativo; las calcos son decorativas', () => {
    expect(TERMO.alt.trim().length).toBeGreaterThan(10);
    for (const c of CALCOS) expect(c.alt).toBeUndefined();
  });
});

describe('las cuatro calcos', () => {
  it('son exactamente cuatro, una por slot', () => {
    expect(CALCOS.map((c) => c.slot)).toEqual([1, 2, 3, 4]);
  });

  it('no hay dos que se muevan igual', () => {
    // La "firma" de una calco es todo lo que hace: cómo entra, si flota y cuánto
    // sigue al cursor. Dos firmas iguales = dos calcos haciendo lo mismo.
    const firma = (c) =>
      JSON.stringify([c.entrada.desde, c.entrada.hasta, c.loop, c.parallaxPx]);
    expect(new Set(CALCOS.map(firma)).size).toBe(CALCOS.length);
  });

  it('también difieren en intensidad de parallax: la profundidad sale de ahí', () => {
    expect(new Set(CALCOS.map((c) => c.parallaxPx)).size).toBe(CALCOS.length);
  });

  it('la 4 es la del parallax fuerte, y ninguna pasa de 25 px', () => {
    const [c4] = CALCOS.filter((c) => c.slot === 4);
    for (const c of CALCOS) {
      expect(c.parallaxPx).toBeLessThanOrEqual(25);
      if (c !== c4) expect(c.parallaxPx).toBeLessThan(c4.parallaxPx / 2);
    }
  });

  it('flotan la 1 y la 2, y la 1 más que la 2; la 3 y la 4 quedan quietas', () => {
    const [c1, c2, c3, c4] = CALCOS;
    expect(c1.loop && c2.loop).toBeTruthy();
    expect(c1.loop.amplitudPx).toBeGreaterThan(c2.loop.amplitudPx);
    expect(c3.loop).toBeNull();
    expect(c4.loop).toBeNull();
  });

  it('las flotaciones son lentas (ciclo ≥ 3 s) y cortas (≤ 20 px): no rebotan', () => {
    for (const c of CALCOS.filter((c) => c.loop)) {
      expect(c.loop.duracionMs).toBeGreaterThanOrEqual(3000);
      expect(c.loop.amplitudPx).toBeLessThanOrEqual(20);
    }
  });

  it('la 2 queda inclinada y la 3 entra desde la derecha', () => {
    const [, c2, c3] = CALCOS;
    expect(c2.entrada.hasta.rotate).toBe(8);
    expect(c3.entrada.desde.x).toBeGreaterThan(0);
    expect(c3.entrada.hasta.x).toBe(0);
  });

  it('ninguna gira más de una vuelta chica (nada de 360°)', () => {
    for (const c of CALCOS) {
      for (const estado of [c.entrada.desde, c.entrada.hasta]) {
        expect(Math.abs(estado.rotate ?? 0)).toBeLessThanOrEqual(25);
      }
    }
  });

  it('entran de a una: no hay dos con el mismo retraso', () => {
    expect(new Set(CALCOS.map((c) => c.entrada.retrasoMs)).size).toBe(CALCOS.length);
  });

  it('toda la entrada termina antes de 1,5 s (RF-18)', () => {
    expect(duracionEntradaMs()).toBeLessThanOrEqual(1500);
  });

  it('una capa pasa por detrás del termo y el resto por delante (profundidad)', () => {
    const capas = CALCOS.map((c) => c.capa);
    expect(capas).toContain('detras');
    expect(capas).toContain('delante');
    for (const capa of capas) expect(['delante', 'detras']).toContain(capa);
  });
});

describe('pegar calcos en el termo (ampliación A)', () => {
  const { cuerpo } = TERMO;
  // Distancias en "anchos de termo": el alto se convierte con la proporción del
  // archivo, si no un paso vertical parece tres veces más chico de lo que es.
  const altoEnAnchos = TERMO.alto / TERMO.ancho;
  const distancia = (a, b) => Math.hypot(a.fx - b.fx, (a.fy - b.fy) * altoEnAnchos);

  it('el cuerpo deja afuera la tapa, la base y la manija', () => {
    expect(dentroDelCuerpo(0.4, 0.1)).toBe(false); // tapa
    expect(dentroDelCuerpo(0.4, 0.97)).toBe(false); // base de acero
    expect(dentroDelCuerpo(0.92, 0.5)).toBe(false); // manija
    expect(dentroDelCuerpo(0.4, 0.5)).toBe(true);
    expect(cuerpo.x0).toBeLessThan(cuerpo.x1);
    expect(cuerpo.y0).toBeLessThan(cuerpo.y1);
  });

  it('hay un destino por calco y todos caen en el cuerpo', () => {
    expect(Object.keys(DESTINOS_PEGADO).map(Number).sort()).toEqual(CALCOS.map((c) => c.slot));
    for (const d of Object.values(DESTINOS_PEGADO)) {
      expect(dentroDelCuerpo(d.fx, d.fy)).toBe(true);
      expect(ajustarAlCuerpo(d.fx, d.fy)).toEqual({ fx: d.fx, fy: d.fy });
    }
  });

  it('con clic, las cuatro quedan repartidas: ninguna encima de otra', () => {
    const ds = Object.values(DESTINOS_PEGADO);
    for (let i = 0; i < ds.length; i++) {
      for (let j = i + 1; j < ds.length; j++) {
        expect(distancia(ds[i], ds[j])).toBeGreaterThanOrEqual(ANCHO_PEGADA / 2);
      }
    }
  });

  it('pegadas quedan inclinadas apenas, como puestas a mano (nada de 360°)', () => {
    for (const d of Object.values(DESTINOS_PEGADO)) expect(Math.abs(d.rot)).toBeLessThanOrEqual(15);
  });

  it('ajustarAlCuerpo mete para adentro un punto del borde y no toca uno del centro', () => {
    const borde = ajustarAlCuerpo(cuerpo.x0 + 0.001, cuerpo.y1 - 0.001);
    expect(borde.fx).toBeGreaterThan(cuerpo.x0 + 0.001);
    expect(borde.fy).toBeLessThan(cuerpo.y1 - 0.001);
    expect(dentroDelCuerpo(borde.fx, borde.fy)).toBe(true);
    expect(ajustarAlCuerpo(0.42, 0.6)).toEqual({ fx: 0.42, fy: 0.6 });
  });

  it('una calco pegada es de tamaño real: más chica que el termo, pero se ve', () => {
    expect(ANCHO_PEGADA).toBeGreaterThan(0.25);
    expect(ANCHO_PEGADA).toBeLessThan(0.6);
  });
});

