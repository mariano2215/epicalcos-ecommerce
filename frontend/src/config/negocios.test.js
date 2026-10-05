import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as copy from './negocios.js';
import { NEGOCIO, priceForSize } from './pricing.js';
import { shipping, navLinks, footerLinks, COTIZAR_HREF } from './site.js';
import { formatPrice } from '../lib/formato.js';
import { MARCAS } from '../data/marcas.js';
import { FOTO_HERO } from '../data/negociosFotos.js';

/**
 * Las páginas de negocio (spec 031). Dos cosas que este test frena antes del
 * deploy: copy que Mariano decidió no decir, y números escritos a mano que
 * quedarían viejos en la próxima suba de precios.
 */
const AQUI = dirname(fileURLToPath(import.meta.url));
const COMPONENTES = join(AQUI, '..', 'components', 'negocios');
const PUBLIC = join(AQUI, '..', '..', 'public');

/** Todos los strings de un valor, recorriendo objetos y arrays. */
function textos(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => textos(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => textos(x, out));
  return out;
}
const TODO = textos(Object.fromEntries(Object.entries(copy)));
const FUENTES = readdirSync(COMPONENTES)
  .filter((f) => f.endsWith('.jsx'))
  .map((f) => ({ f, src: readFileSync(join(COMPONENTES, f), 'utf8') }));

describe('copy de negocios — lo que no se dice (RF-CO1, RF-CO2)', () => {
  /**
   * "archivo perfecto": Mariano lo sacó el 15/8 y lo ratificó el 14/9/2026.
   * "boceto": no se diseña desde cero. Códigos de cupón: son ocultos.
   * Y las frases genéricas que el pedido del 5/10/2026 prohibió por nombre.
   */
  const PROHIBIDO =
    /perfect|boceto|EPICA10|EPI50|EMOJI50|siguiente nivel|cobra vida|marcan la diferencia|potenci[aá] tu identidad|transformamos ideas/i;

  it('ni el config ni los componentes dicen nada de la lista prohibida', () => {
    for (const t of TODO) expect(t, `"${t}"`).not.toMatch(PROHIBIDO);
    for (const { f, src } of FUENTES) expect(src, f).not.toMatch(PROHIBIDO);
  });

  it('"muestra" va siempre aclarada como vista previa digital (5/10/2026)', () => {
    // La MUESTRA GRATIS es una vista previa por WhatsApp, no una calco física
    // por correo: dicha a secas, el cliente espera un sobre.
    const conMuestra = TODO.filter((t) => /muestra/i.test(t));
    expect(conMuestra.length).toBeGreaterThan(0);
    for (const t of conMuestra) {
      const aclarada = /vista previa|digital/i.test(t) || t === copy.MUESTRA_GRATIS.titulo;
      expect(aclarada, `"${t}"`).toBe(true);
    }
    // Y donde aparece el título, la aclaración viaja con él.
    expect(copy.MUESTRA_GRATIS.aclaracion).toMatch(/vista previa digital/i);
  });

  it('no promete "más cantidad, más barato" mientras el precio sea plano desde 100 (spec 032 sin implementar)', () => {
    for (const t of TODO) expect(t, `"${t}"`).not.toMatch(/cuant[ao]s? m[aá]s .*(barat|mejor el precio|menos pag)/i);
  });

  it('RAE: pronombre pegado sin tilde', () => {
    for (const t of TODO) expect(t, `"${t}"`).not.toMatch(/mandál[oa]|hacél[oa]|pegál[oa]/i);
  });
});

describe('ningún número escrito a mano (RF-CO3)', () => {
  it('el config no tiene montos ni plazos literales', () => {
    const src = readFileSync(join(AQUI, 'negocios.js'), 'utf8')
      // los comentarios pueden contar la historia con números
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/\$\s?\d/); // "$52.999" escrito a mano
    expect(src).not.toMatch(/\d+\s*a\s*\d+\s*d[ií]as/i); // "3 a 5 días"
    expect(src).not.toMatch(/['"`]\s*\d{2,}/); // "100", "35" sueltos al principio de un texto
  });

  it('el "desde" del hero es el precio de Negocio por calco, y la suelta la del tamaño de Negocio', () => {
    expect(copy.DESDE).toBe(NEGOCIO.qty);
    expect(copy.PRECIO_POR_CALCO_DESDE).toBe(Math.round(NEGOCIO.price / NEGOCIO.qty));
    expect(copy.HERO.precio.principal).toContain(formatPrice(copy.PRECIO_POR_CALCO_DESDE));
    expect(copy.HERO.precio.referencia).toContain(formatPrice(priceForSize(NEGOCIO.size)));
  });

  it('la barra de confianza lee el plazo de 100+ y la cantidad de marcas', () => {
    const valores = copy.CONFIANZA.map((d) => d.valor);
    expect(valores).toContain(shipping.produccionVolumen);
    expect(valores).toContain(`${MARCAS.length} marcas`);
    expect(copy.CONFIANZA).toHaveLength(4);
  });

  it('"cómo funciona": cuatro pasos, la vista previa en el tercero y el plazo de 100+ en el cuarto', () => {
    expect(copy.PASOS.items).toHaveLength(4);
    expect(copy.PASOS.items[2].t).toMatch(/vista previa/i);
    expect(copy.PASOS.items[3].d).toContain(shipping.produccionVolumen);
  });
});

describe('navegación y footer (RF-N1, RF-N4)', () => {
  it('el nav dice Para negocios · Precios · Con tu diseño · Tienda · Preguntas', () => {
    expect(navLinks.map((l) => l.label)).toEqual(['Para negocios', 'Precios', 'Con tu diseño', 'Tienda', 'Preguntas']);
  });

  it('"Cotizar" y "Precios" llevan a anclas que /negocio tiene', () => {
    const negocio = readFileSync(join(AQUI, '..', 'routes', 'Negocio.jsx'), 'utf8');
    expect(COTIZAR_HREF).toBe('/negocio#cotizar');
    expect(negocio).toContain('id="cotizar"');
    expect(negocio).toContain('id="precios"');
    const comoFunciona = FUENTES.find((x) => x.f === 'ComoFunciona.jsx').src;
    expect(footerLinks.ayuda.map((l) => l.to)).toContain('/negocio#como-funciona');
    expect(comoFunciona).toContain('id="como-funciona"');
  });

  it('el footer tiene los cuatro grupos y no perdió ninguna página', () => {
    expect(Object.keys(footerLinks)).toEqual(['productos', 'ayuda', 'epicalcos', 'legal']);
    const rutas = Object.values(footerLinks).flat().map((l) => l.to);
    for (const r of ['/negocio', '/mayorista', '/personalizados', '/categorias', '/tatuajes', '/polaroid', '/contacto',
      '/politicas/envios', '/politicas/cambios', '/politicas/privacidad', '/terminos-y-condiciones']) {
      expect(rutas, r).toContain(r);
    }
  });
});

describe('fotos (RF-H6)', () => {
  it('la foto del hero existe y declara su tamaño real', () => {
    expect(existsSync(join(PUBLIC, FOTO_HERO.src))).toBe(true);
    expect(FOTO_HERO.width / FOTO_HERO.height).toBeCloseTo(4 / 3, 5);
    expect(FOTO_HERO.alt.length).toBeGreaterThan(10);
  });
});
