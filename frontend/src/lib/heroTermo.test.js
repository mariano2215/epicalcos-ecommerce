import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  COPY_HERO,
  TERMO,
  CALCOS,
  DESTINOS_PEGADO,
  ANCHO_PEGADA,
  GIRO_MAX_GRADOS,
  PERSPECTIVA_PX,
  anguloEnTermo,
  perspectivaPegada,
  duracionEntradaMs,
  dentroDelCuerpo,
  ajustarAlCuerpo,
  DISENOS_INICIALES,
  MAX_PEGADAS,
  srcDiseno,
  siguienteDiseno
} from './heroTermo.js';
import { DISENOS_HERO } from './disenosHero.js';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');

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
  it('el termo sale de /images/hero/ y declara sus medidas (sin salto de layout)', () => {
    expect(TERMO.src).toMatch(/^\/images\/hero\/[\w-]+\.webp$/);
    expect(TERMO.ancho).toBeGreaterThan(0);
    expect(TERMO.alto).toBeGreaterThan(0);
  });

  it('el termo tiene texto alternativo; las calcos son decorativas', () => {
    expect(TERMO.alt.trim().length).toBeGreaterThan(10);
    for (const c of CALCOS) expect(c.alt).toBeUndefined();
  });
});

describe('diseños de Argentina (ampliación D)', () => {
  const catalogo = JSON.parse(readFileSync(join(PUBLIC, 'data', 'argentina.json'), 'utf8'));
  const enCatalogo = new Set(catalogo.map((p) => p.file));

  it('hay muchos, y cada uno tiene su archivo del hero, con fondo transparente', () => {
    expect(DISENOS_HERO.length).toBeGreaterThanOrEqual(20);
    for (const d of DISENOS_HERO) {
      const archivo = join(PUBLIC, srcDiseno(d.n));
      expect(existsSync(archivo), `falta ${srcDiseno(d.n)}`).toBe(true);
      const b = readFileSync(archivo);
      // WebP con alfa: contenedor extendido (VP8X) con el bloque ALPH, o sin pérdida (VP8L).
      const conAlfa = b.includes(Buffer.from('ALPH')) || b.subarray(12, 16).toString() === 'VP8L';
      expect(conAlfa, `${d.n} no tiene transparencia`).toBe(true);
      expect(b.length, `${d.n} pesa más de 30 kB`).toBeLessThanOrEqual(30 * 1024);
    }
  });

  it('cada diseño sigue en el catálogo: uno que se saca no puede quedar en el juego', () => {
    for (const d of DISENOS_HERO) {
      expect(enCatalogo.has(`/stickers/argentina/${d.n}.webp`), `argentina-${d.n} ya no está en el catálogo`).toBe(true);
    }
  });

  it('los cuatro iniciales están entre los diseños y son distintos', () => {
    const iniciales = Object.values(DISENOS_INICIALES);
    expect(new Set(iniciales).size).toBe(4);
    const nums = new Set(DISENOS_HERO.map((d) => d.n));
    for (const n of iniciales) expect(nums.has(n)).toBe(true);
    expect(Object.keys(DISENOS_INICIALES).map(Number).sort()).toEqual(CALCOS.map((c) => c.slot));
  });

  it('el tope del termo es 12', () => {
    expect(MAX_PEGADAS).toBe(12);
  });
});

describe('siguienteDiseno', () => {
  const disenos = [1, 2, 3, 4, 5, 6].map((n) => ({ n, ancho: 10, alto: 10 }));

  it('nunca devuelve uno que esté a la vista', () => {
    const visibles = new Set([1, 2, 3, 4, 5]);
    for (let i = 0; i < 20; i++) {
      expect(siguienteDiseno({ visibles, usados: new Set(), disenos }).n).toBe(6);
    }
  });

  it('recorre todos antes de repetir', () => {
    let usados = new Set();
    const vistos = [];
    for (let i = 0; i < disenos.length; i++) {
      const r = siguienteDiseno({ visibles: new Set(), usados, azar: () => 0.99, disenos });
      usados = r.usados;
      vistos.push(r.n);
    }
    expect(new Set(vistos).size).toBe(disenos.length);
  });

  it('agotada la bolsa, empieza otra vuelta sin repetir los visibles', () => {
    const r = siguienteDiseno({ visibles: new Set([2]), usados: new Set([1, 2, 3, 4, 5, 6]), azar: () => 0, disenos });
    expect(r.n).not.toBe(2);
    expect([...r.usados]).toEqual([r.n]);
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

  it('el cuerpo deja afuera la tapa, la base y lo que está fuera del termo', () => {
    expect(dentroDelCuerpo(0.4, 0.1)).toBe(false); // tapa
    expect(dentroDelCuerpo(0.4, 0.97)).toBe(false); // base de acero
    expect(dentroDelCuerpo(0.99, 0.5)).toBe(false); // al costado del termo
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

  it('el ángulo del giro: el centro es el frente, los costados van hacia el borde, sin pasar de 75°', () => {
    const caja = { left: 100, width: 120 };
    expect(anguloEnTermo(160, caja)).toBeCloseTo(0, 5);
    expect(anguloEnTermo(190, caja)).toBeGreaterThan(20);
    expect(anguloEnTermo(130, caja)).toBeLessThan(-20);
    expect(anguloEnTermo(220, caja)).toBe(GIRO_MAX_GRADOS);
    // Ida y vuelta: el ángulo encontrado, proyectado, cae donde se soltó.
    const a = (anguloEnTermo(200, caja) * Math.PI) / 180;
    const x = 160 + (60 * Math.sin(a) * 700) / (700 - 60 * Math.cos(a));
    expect(x).toBeCloseTo(200, 3);
    expect(anguloEnTermo(0, caja)).toBe(-GIRO_MAX_GRADOS);
  });

  it('la perspectiva: al frente se ve más grande, y la altura se compensa para verse donde se soltó', () => {
    const ancho = 100;
    const frente = perspectivaPegada(0.8, 0, ancho);
    expect(frente.escala).toBeCloseTo(PERSPECTIVA_PX / (PERSPECTIVA_PX - 50), 6);
    // Proyectada desde el centro de la caja, la altura CSS cae en 0,8.
    expect(0.5 + (frente.alturaCss - 0.5) * frente.escala).toBeCloseTo(0.8, 10);
    // En el costado está más lejos: se agranda menos.
    expect(perspectivaPegada(0.8, 75, ancho).escala).toBeLessThan(frente.escala);
    // El centro no se mueve.
    expect(perspectivaPegada(0.5, 0, ancho).alturaCss).toBeCloseTo(0.5, 10);
  });

  it('una calco pegada es de tamaño real: más chica que el termo, pero se ve', () => {
    expect(ANCHO_PEGADA).toBeGreaterThan(0.25);
    expect(ANCHO_PEGADA).toBeLessThan(0.6);
  });
});

