import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  repartoPromos,
  esPromo2x1,
  CATEGORIAS_2X1,
  PROMO_2X1,
  PROMO_3X2,
  is2x1PromoActive,
  isPromoActive,
  isMayoristaPromoActive
} from '../config/pricing.js';

/**
 * El reparto entre el 2x1 por categoría y el 3x2 general (spec 017).
 *
 * Los dos tests largos de acá abajo —CF-12 y CF-13 de acceptance.md— son los que
 * justifican la regla que se eligió. Tardan ~1s entre los dos y valen cada
 * milisegundo: la regla que se había aprobado primero pasaba todos los casos
 * puntuales y solo caía en el barrido.
 */

const P = [1200, 1600, 2000];
const R = (cat, resto) => repartoPromos({ unidadesCategoria: cat, unidadesResto: resto });
const combos = (n, pool) =>
  n === 0 ? [[]] : pool.flatMap((v, i) => combos(n - 1, pool.slice(i)).map((r) => [v, ...r]));
const suma = (a) => a.reduce((x, y) => x + y, 0);

afterEach(() => vi.useRealTimers());

describe('las tres promos de la spec 017 están vivas', () => {
  it('3x2, 2x1 y mayorista corren a la vez', () => {
    expect(isPromoActive()).toBe(true);
    expect(is2x1PromoActive()).toBe(true);
    expect(isMayoristaPromoActive()).toBe(true);
  });

  it('las cuatro categorías del 2x1 son las de "Los más elegidos"', () => {
    expect(CATEGORIAS_2X1).toEqual(['anime', 'argentina', 'disney', 'frases']);
  });

  it('antes del 7/9/2026 no corre ninguna: el "antes" sigue existiendo', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T23:59:59-03:00'));
    expect(isPromoActive()).toBe(false);
    expect(is2x1PromoActive()).toBe(false);
    expect(isMayoristaPromoActive()).toBe(false);
  });
});

describe('esPromo2x1 decide por el id de la línea', () => {
  it('una categoría del 2x1 entra; otra no', () => {
    expect(esPromo2x1('sticker:disney-141:6cm')).toBe(true);
    expect(esPromo2x1('sticker:anime-4:4cm')).toBe(true);
    expect(esPromo2x1('sticker:marvel-3:6cm')).toBe(false);
  });

  it('un personalizado NUNCA entra: no tiene categoría de catálogo', () => {
    expect(esPromo2x1('custom:4cm:silueta:1')).toBe(false);
  });

  it('una categoría con guiones propios no se parte mal', () => {
    // `rosario-central-77` → `rosario-central`, no `rosario`.
    expect(esPromo2x1('sticker:rosario-central-77:9cm')).toBe(false);
  });
});

describe('el reparto, caso por caso', () => {
  it('CF-10 · el caso aprobado: 3 Disney + 2 otras (6 cm) = 2 gratis, $4.800', () => {
    const r = R([1600, 1600, 1600], [1600, 1600]);
    expect(r.freeUnits).toBe(2);
    expect(8000 - r.discount).toBe(4800);
    expect(r.keepFraction).toBe(0.6);
  });

  it('CF-6 · 2 calcos de una categoría del 2x1 = 1 gratis', () =>
    expect(R([1600, 1600], []).freeUnits).toBe(1));

  it('CF-7 · 1 solo calco de categoría no alcanza para nada', () =>
    expect(R([1600], []).freeUnits).toBe(0));

  it('CF-8 · 2 de Disney + 2 de anime van a la misma bolsa: 2 gratis', () =>
    expect(R([1600, 1600, 1600, 1600], []).freeUnits).toBe(2));

  it('CF-1 · 3 calcos sin categoría = 1 gratis por el 3x2', () =>
    expect(R([], [1600, 1600, 1600]).freeUnits).toBe(1));

  it('el sobrante de un par SÍ puede completar un trío del 3x2', () => {
    // 1 Disney + 2 de otra categoría: por separado no alcanzarían para nada.
    expect(R([1600], [1600, 1600]).freeUnits).toBe(1);
  });

  it('CF-4 · con tamaños mezclados se regala la MÁS BARATA', () => {
    // Dos de categoría: se regala la de $1.200, no la de $2.000.
    expect(R([1200, 2000], []).discount).toBe(1200);
  });

  it('bolsas vacías no rompen ni descuentan', () => {
    const r = R([], []);
    expect(r).toEqual({ freeUnits: 0, discount: 0, keepFraction: 1 });
  });

  it('con el 2x1 apagado degrada exactamente al 3x2 de siempre', () => {
    const r = repartoPromos({ unidadesCategoria: [1600, 1600], unidadesResto: [1600], g2x1: null });
    expect(r.freeUnits).toBe(1); // 3 unidades en una sola bolsa
  });

  it('con el 3x2 apagado, los sobrantes del 2x1 no reciben nada', () => {
    const r = repartoPromos({ unidadesCategoria: [1600], unidadesResto: [1600, 1600], g3x2: null });
    expect(r.freeUnits).toBe(0);
    expect(r.discount).toBe(0);
  });

  it('con las dos apagadas no hay descuento', () => {
    const r = repartoPromos({ unidadesCategoria: [1600, 1600], unidadesResto: [1600, 1600, 1600], g2x1: null, g3x2: null });
    expect(r.discount).toBe(0);
    expect(r.keepFraction).toBe(1);
  });

  it('CF-14 · el keepFraction deja precios por unidad POSITIVOS', () => {
    // Mercado Pago rechaza una línea con precio ≤ 0.
    for (let n = 1; n <= 30; n++) {
      const r = R(Array(n).fill(1200), Array(n).fill(2000));
      expect(r.keepFraction).toBeGreaterThan(0);
      expect(Math.round(1200 * r.keepFraction)).toBeGreaterThan(0);
    }
  });
});

describe('las garantías del reparto (lo que hizo descartar la primera regla)', () => {
  it('CF-11 y CF-12 · agregar un calco nunca da menos gratis NI baja el total', () => {
    let menosGratis = 0;
    let bajaTotal = 0;
    let transiciones = 0;

    for (let nc = 0; nc <= 7; nc++)
      for (let nr = 0; nr <= 6; nr++)
        for (const cat of combos(nc, P))
          for (const resto of combos(nr, P)) {
            const antes = R(cat, resto);
            const totalAntes = suma([...cat, ...resto]) - antes.discount;
            for (const p of P)
              for (const sig of [
                { cat: [...cat, p], resto },
                { cat, resto: [...resto, p] }
              ]) {
                transiciones++;
                const d = R(sig.cat, sig.resto);
                if (d.freeUnits < antes.freeUnits) menosGratis++;
                if (suma([...sig.cat, ...sig.resto]) - d.discount < totalAntes) bajaTotal++;
              }
          }

    expect(transiciones).toBeGreaterThan(50_000); // CF-12 exige el barrido grande
    expect(menosGratis).toBe(0);
    expect(bajaTotal).toBe(0);
  });

  it('CF-13 · el reparto elegido es el óptimo real (vs. enumeración completa)', () => {
    const nxm = (u, buy, pay) => {
      const n = u.length;
      const base = suma(u);
      const free = Math.floor(n / buy) * (buy - pay);
      if (base <= 0 || free <= 0) return 0;
      const s = [...u].sort((a, b) => a - b);
      let d = 0;
      for (let k = 0; k < free; k++) d += s[k];
      return d;
    };

    let discrepancias = 0;
    for (let nc = 0; nc <= 7; nc++)
      for (let nr = 0; nr <= 4; nr++)
        for (const cat of combos(nc, P))
          for (const resto of combos(nr, P)) {
            // Fuerza bruta: TODOS los subconjuntos de `cat` que podrían ir al 2x1.
            let mejor = 0;
            for (let m = 0; m < 1 << cat.length; m++) {
              const a = [];
              const b = [];
              cat.forEach((v, i) => ((m >> i) & 1 ? a : b).push(v));
              mejor = Math.max(mejor, nxm(a, 2, 1) + nxm([...resto, ...b], 3, 2));
            }
            if (R(cat, resto).discount !== mejor) discrepancias++;
          }

    expect(discrepancias).toBe(0);
  });

  it('CF-15 · el desempate es estable: la misma entrada da siempre lo mismo', () => {
    const cat = [1200, 1200, 2000, 2000];
    const resto = [1600, 1600];
    const primero = R(cat, resto);
    for (let i = 0; i < 20; i++) expect(R(cat, resto)).toEqual(primero);
    // Y no depende del orden en que vengan las unidades.
    expect(R([2000, 1200, 2000, 1200], resto)).toEqual(primero);
  });

  it('el orden de las bolsas no cambia el resultado', () => {
    expect(R([1200, 1600], [2000])).toEqual(R([1600, 1200], [2000]));
  });

  it('EC-7 · un carrito grande no se degrada', () => {
    const t0 = Date.now();
    const r = R(Array(60).fill(1600), Array(60).fill(1200));
    expect(Date.now() - t0).toBeLessThan(200);
    expect(r.freeUnits).toBeGreaterThan(0);
  });

  it('las constantes del 2x1 son las que usa el reparto', () => {
    expect(PROMO_2X1.buy).toBe(2);
    expect(PROMO_2X1.pay).toBe(1);
    expect(PROMO_3X2.buy).toBe(3);
    expect(PROMO_3X2.pay).toBe(2);
  });
});
