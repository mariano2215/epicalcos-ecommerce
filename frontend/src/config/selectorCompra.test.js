import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HERO_SELECTOR, TIPOS } from './selectorCompra.js';
import { SIZES, NEGOCIO, WHOLESALE_QTY } from './pricing.js';
import { formatPrice } from '../lib/formato.js';
import { CATEGORY_COUNT } from '../data/catalogStats.js';
import { validarConsulta, TOPES, CONSULTA_COTIZAR } from '../lib/contacto.js';

/**
 * El selector del Home (spec 031, enmienda E-1): POR MENOR / POR MAYOR y sus
 * cuatro destinos, tal como los pidió Mariano el 5/10/2026.
 */
const AQUI = dirname(fileURLToPath(import.meta.url));

describe('selector del hero del Home', () => {
  it('el H1 dice "calcos" (piso de SEO de la spec 015)', () => {
    expect(HERO_SELECTOR.h1.join(' ').toLowerCase()).toContain('calcos');
  });

  it('dos opciones, POR MENOR y POR MAYOR, con sus dos destinos cada una', () => {
    expect(TIPOS.map((t) => t.label.toUpperCase())).toEqual(['POR MENOR', 'POR MAYOR']);
    const destinos = Object.fromEntries(TIPOS.map((t) => [t.id, t.destinos.map((d) => [d.label.toUpperCase(), d.to])]));
    expect(destinos.menor).toEqual([
      ['TIENDA', '/categorias'],
      ['PERSONALIZADOS', '/categorias#diseno-propio']
    ]);
    expect(destinos.mayor).toEqual([
      ['PARA MI NEGOCIO', '/negocio'],
      ['COMPRAR MUCHAS EN CANTIDAD', '/mayorista']
    ]);
  });

  it('PERSONALIZADOS baja a una card que /categorias monta con ese id', () => {
    const card = readFileSync(join(AQUI, '..', 'components', 'DisenoPropioCard.jsx'), 'utf8');
    const categorias = readFileSync(join(AQUI, '..', 'routes', 'Categorias.jsx'), 'utf8');
    expect(card).toContain('id="diseno-propio"');
    expect(categorias).toContain('<DisenoPropioCard />');
  });

  it('precios y cantidades salen del config, no escritos a mano', () => {
    const [menor, mayor] = TIPOS;
    expect(menor.detalle.join(' ')).toContain(formatPrice(Math.min(...SIZES.map((s) => s.price))));
    expect(mayor.detalle.join(' ')).toContain(`${NEGOCIO.qty} calcos`);
    expect(mayor.detalle.join(' ')).toContain(formatPrice(Math.round(NEGOCIO.price / NEGOCIO.qty)));
    expect(menor.destinos[0].texto).toContain(String(CATEGORY_COUNT));
    expect(mayor.destinos[1].texto).toContain(String(WHOLESALE_QTY));

    const src = readFileSync(join(AQUI, 'selectorCompra.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/\$\s?\d/);
    expect(src).not.toMatch(/['"`]\s*\d{2,}/);
  });
});

describe('"Dejar mis datos" del botón Cotizar', () => {
  it('la consulta precargada pasa la validación del formulario y pide la razón social', () => {
    const errores = validarConsulta({
      nombre: 'Ana Pérez',
      email: 'ana@ejemplo.com',
      telefono: '3415555555',
      ciudad: 'Rosario',
      provincia: 'Santa Fe',
      consulta: CONSULTA_COTIZAR
    });
    expect(errores.consulta).toBeUndefined();
    expect(CONSULTA_COTIZAR.length).toBeLessThanOrEqual(TOPES.consulta);
    expect(CONSULTA_COTIZAR).toMatch(/razón social/i);
  });
});
