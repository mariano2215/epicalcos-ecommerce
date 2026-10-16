import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { navMenu, navMenuPlano, menuVisible, NAV_CATEGORIAS } from './site.js';
import { getCategory } from '../data/categories.js';

/**
 * Menú principal de la spec 033: Home · Mayorista · Minorista · Otros
 * productos · Contacto. Reemplazó el nav de la spec 031 el 15/10/2026.
 */
const AQUI = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(join(AQUI, '..', 'App.jsx'), 'utf8');

const grupo = (id) => navMenu.find((e) => e.id === id);

describe('menú principal (spec 033)', () => {
  it('dice Home · Mayorista · Minorista · Otros productos · Contacto, en ese orden (RF-M1)', () => {
    expect(navMenu.map((e) => e.label)).toEqual(['Home', 'Mayorista', 'Minorista', 'Otros productos', 'Contacto']);
  });

  it('Home y Contacto son links directos; los otros tres, grupos (RF-M2)', () => {
    expect(navMenu[0]).toMatchObject({ to: '/' });
    expect(navMenu[4]).toMatchObject({ to: '/contacto' });
    expect(navMenu.slice(1, 4).every((e) => e.items?.length)).toBe(true);
  });

  it('cada grupo tiene sus opciones (RF-M3, RF-M4, RF-M5)', () => {
    expect(grupo('mayorista').items.map((l) => [l.label, l.to])).toEqual([
      ['Mayorista +100 calcos', '/mayorista'],
      ['Negocio', '/negocio']
    ]);
    expect(grupo('minorista').items.map((l) => [l.label, l.to])).toEqual([
      ['Personalizados', '/personalizados'],
      ['Ver todas las categorías', '/categorias']
    ]);
    expect(grupo('otros').items.map((l) => [l.label, l.to])).toEqual([
      ['Fotos Polaroid', '/polaroid'],
      ['Tatuajes temporales', '/tatuajes']
    ]);
  });

  it('las 8 categorías de Minorista existen en el catálogo (RF-M7)', () => {
    expect(grupo('minorista').categorias).toBe(NAV_CATEGORIAS);
    expect(NAV_CATEGORIAS).toHaveLength(8);
    for (const slug of NAV_CATEGORIAS) expect(getCategory(slug), slug).toBeTruthy();
  });

  it('cada link del menú apunta a una ruta que App.jsx tiene', () => {
    for (const { to } of navMenuPlano) expect(APP, to).toContain(`path="${to}"`);
  });

  it('ningún texto del menú dice "más vendidas" ni "populares": no hay dato que lo respalde (RF-M8)', () => {
    const textos = navMenuPlano.flatMap((l) => [l.label, l.detalle || '']).concat(navMenu.map((e) => e.label));
    for (const t of textos) expect(t).not.toMatch(/vendid|popular|top\b|ranking/i);
  });
});

describe('menuVisible — secciones ocultas (RF-M9)', () => {
  const MENU = [
    { to: '/', label: 'Home' },
    { id: 'a', label: 'A', items: [{ to: '/uno', label: 'Uno' }, { to: '/dos', label: 'Dos' }] },
    { id: 'b', label: 'B', items: [{ to: '/tres', label: 'Tres' }] },
    { to: '/cuatro', label: 'Cuatro' }
  ];

  it('saca la opción oculta y deja el resto del grupo', () => {
    const m = menuVisible(MENU, (to) => to === '/dos');
    expect(m.find((e) => e.id === 'a').items.map((l) => l.to)).toEqual(['/uno']);
  });

  it('un grupo que se queda sin opciones desaparece', () => {
    const m = menuVisible(MENU, (to) => to === '/tres');
    expect(m.map((e) => e.label)).toEqual(['Home', 'A', 'Cuatro']);
  });

  it('un link directo oculto también desaparece', () => {
    const m = menuVisible(MENU, (to) => to === '/cuatro');
    expect(m.map((e) => e.label)).toEqual(['Home', 'A', 'B']);
  });

  it('no toca el menú original', () => {
    menuVisible(MENU, () => true);
    expect(MENU[1].items).toHaveLength(2);
  });
});
