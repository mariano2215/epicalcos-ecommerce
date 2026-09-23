import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as copy from './personalizadosLanding.js';
import { ARCHIVO, formatosLegibles, formatosCortos } from './personalizados.js';
import { SIZES, NEGOCIO } from './pricing.js';
import { shipping } from './site.js';
import { formatPrice } from '../lib/formato.js';
import { FOTOS } from '../data/personalizadosFotos.js';
import { TESTIMONIALS } from '../data/testimonials.js';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');

/** Todos los strings de un valor, recorriendo objetos y arrays. */
function textos(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => textos(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => textos(x, out));
  return out;
}
const TODO = textos(Object.fromEntries(Object.entries(copy)));

describe('copy de /personalizados — lo que no se dice (requirements §12, RF-L18)', () => {
  /**
   * Mariano, 14/9/2026: no se manda boceto y no se menciona; no se dice que no
   * hay fotos; "¿Tu archivo no está perfecto?" no vuelve (tampoco la frase).
   * Este test es el que frena que un copy nuevo lo reintroduzca sin darse cuenta.
   */
  it('ningún texto habla de boceto, prueba de impresión, "próximamente" ni archivos perfectos', () => {
    for (const t of TODO) {
      expect(t, `"${t}"`).not.toMatch(/boceto|prueba de impresi|pr[oó]ximamente|perfect/i);
    }
  });

  it('respeta la RAE: pronombre pegado sin tilde (P-11)', () => {
    expect(copy.CLAIM).toBe('HACELO CALCO.');
    for (const t of TODO) {
      expect(t, `"${t}"`).not.toMatch(/hacélo|convertíla|llevála|hacéla/i);
    }
  });

  it('el claim aparece como mucho tres veces (RF-L17)', () => {
    expect(TODO.filter((t) => t.includes(copy.CLAIM)).length).toBeLessThanOrEqual(3);
  });

  it('las preguntas que esperan respuesta de Mariano (P-4) no están publicadas', () => {
    const preguntas = copy.FAQ.map((f) => f.q).join(' | ');
    expect(preguntas).not.toMatch(/fondo/i);
    expect(preguntas).not.toMatch(/mascota/i);
  });
});

describe('copy de /personalizados — ningún número a mano', () => {
  it('todo precio del copy es un precio de SIZES o de NEGOCIO', () => {
    const permitidos = new Set([...SIZES.map((s) => s.price), NEGOCIO.price].map(formatPrice));
    for (const t of TODO) {
      for (const m of t.match(/\$\s?\d{1,3}(?:\.\d{3})*/g) || []) {
        // `\s` también toma el espacio duro que pone Intl ("$\u00a01.600").
        expect([...permitidos], `precio "${m}" escrito a mano en "${t}"`).toContain(m);
      }
    }
  });

  it('los plazos salen de shipping', () => {
    expect(copy.SEO.description).toContain(shipping.production);
    expect(copy.CTA_FINAL.nota).toContain(shipping.production);
    const recibis = copy.PROCESO.pasos.find((p) => p.titulo === 'Recibís').texto;
    expect(recibis).toContain(shipping.deliveryRosario);
    expect(recibis).toContain(shipping.deliveryInterior);
  });

  it('la FAQ nombra exactamente los formatos que acepta la zona de subida', () => {
    const faq = copy.FAQ.find((f) => f.q === '¿Qué formatos aceptan?').a;
    expect(faq.startsWith(formatosLegibles(ARCHIVO.formatosEntrada))).toBe(true);
    expect(faq).toContain(`${ARCHIVO.pesoMaximoMB} MB`);
    expect(formatosCortos()).toBe('JPG · PNG · WEBP · PDF · SVG · AI');
  });

  it('la oferta de Negocio sale de NEGOCIO', () => {
    expect(copy.OFERTA_NEGOCIO).toContain(String(NEGOCIO.qty));
    expect(copy.OFERTA_NEGOCIO).toContain(formatPrice(NEGOCIO.price));
  });
});

describe('SEO de /personalizados', () => {
  it('título, descripción y H1 del brief', () => {
    expect(copy.SEO.title).toBe('Stickers y Calcos Personalizados con tu Diseño');
    expect(copy.SEO.h1).toBe('Calcos personalizadas con tu propio diseño');
    expect(copy.SEO.description.length).toBeLessThanOrEqual(160);
  });

  it('las imágenes que nombra existen', () => {
    expect(existsSync(join(PUBLIC, copy.SEO.imagen)), copy.SEO.imagen).toBe(true);
    expect(existsSync(join(PUBLIC, copy.SEO.imagenProducto)), copy.SEO.imagenProducto).toBe(true);
  });
});

describe('fotos reales (RF-L2)', () => {
  it('ninguna entrada del manifiesto apunta a un archivo que no existe', () => {
    const fotos = [
      ...FOTOS.deImagenACalco.flatMap((t) => [t.original, t.calco, t.aplicada]),
      ...Object.values(FOTOS.queConvertir),
      ...FOTOS.galeria,
      FOTOS.calidad,
      ...Object.values(FOTOS.proceso)
    ].filter(Boolean);
    for (const f of fotos) {
      expect(existsSync(join(PUBLIC, f.src)), f.src).toBe(true);
      expect(f.width > 0 && f.height > 0 && f.alt.length > 10, f.src).toBe(true);
    }
  });

  it('solo los testimonios de diseños propios cuentan como personalizados', () => {
    const propios = TESTIMONIALS.filter((t) => t.personalizado);
    expect(propios.map((t) => t.name)).toEqual(['Sofía M.']);
    for (const t of propios) expect(existsSync(join(PUBLIC, t.image))).toBe(true);
  });
});
