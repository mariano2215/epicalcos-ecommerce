import { describe, it, expect } from 'vitest';
import { parametrosDeAtribucion, capturarAtribucion, leerAtribucion, fbcGuardado } from './atribucion.js';
import { mensajeWhatsapp, hrefWhatsapp } from './whatsapp.js';
import { WHATSAPP } from '../config/negocios.js';

/** Un sessionStorage en memoria, para no depender del navegador. */
function memoria() {
  const m = new Map();
  return { setItem: (k, v) => m.set(k, String(v)), getItem: (k) => (m.has(k) ? m.get(k) : null) };
}
const roto = {
  setItem: () => {
    throw new Error('SecurityError');
  },
  getItem: () => {
    throw new Error('SecurityError');
  }
};

describe('atribución del anuncio (spec 034, RF-14/15)', () => {
  it('lee fbclid, gclid y UTM de la URL de llegada, e ignora el resto', () => {
    expect(parametrosDeAtribucion('?fbclid=abc&utm_source=ig&utm_campaign=negocio&q=boca')).toEqual({
      fbclid: 'abc',
      utm_source: 'ig',
      utm_campaign: 'negocio'
    });
    expect(parametrosDeAtribucion('')).toEqual({});
  });

  it('el fbc sale del fbclid guardado con el instante de LLEGADA, no el del checkout', () => {
    const s = memoria();
    capturarAtribucion('?fbclid=IwAR123', 1700000000000, s);
    expect(fbcGuardado(s)).toBe('fb.1.1700000000000.IwAR123');
  });

  it('navegar sin parámetros no borra de dónde se vino', () => {
    const s = memoria();
    capturarAtribucion('?fbclid=uno&utm_source=ig', 1, s);
    capturarAtribucion('', 2, s);
    capturarAtribucion('?q=boca', 3, s);
    expect(leerAtribucion(s)).toMatchObject({ fbclid: 'uno', utm_source: 'ig' });
  });

  it('una llegada nueva con parámetros reemplaza a la anterior', () => {
    const s = memoria();
    capturarAtribucion('?fbclid=uno', 1, s);
    capturarAtribucion('?utm_source=google&gclid=g1', 2, s);
    expect(leerAtribucion(s)).toEqual({ utm_source: 'google', gclid: 'g1' });
    expect(fbcGuardado(s)).toBe('');
  });

  it('un valor gigante se recorta', () => {
    const s = memoria();
    capturarAtribucion(`?fbclid=${'x'.repeat(5000)}`, 1, s);
    expect(leerAtribucion(s).fbclid).toHaveLength(500);
  });

  it('sin storage (navegador embebido, modo privado) no rompe nada', () => {
    expect(() => capturarAtribucion('?fbclid=abc', 1, roto)).not.toThrow();
    expect(leerAtribucion(roto)).toEqual({});
    expect(fbcGuardado(roto)).toBe('');
    expect(fbcGuardado(undefined)).toBe('');
  });
});

describe('WhatsApp por página (031 RF-W2, spec 034)', () => {
  it('/negocio y /mayorista salen con su mensaje; el resto, como siempre', () => {
    expect(mensajeWhatsapp('/negocio')).toBe(WHATSAPP.negocio);
    expect(mensajeWhatsapp('/negocio/')).toBe(WHATSAPP.negocio);
    expect(mensajeWhatsapp('/mayorista')).toBe(WHATSAPP.mayorista);
    expect(mensajeWhatsapp('/')).toBeNull();
    expect(mensajeWhatsapp('/categoria/anime')).toBeNull();
    expect(mensajeWhatsapp('/personalizados')).toBeNull();
  });

  it('el link lleva el mensaje codificado, o el chat vacío sin mensaje', () => {
    expect(hrefWhatsapp('Hola EPICALCOS.')).toMatch(/\?text=Hola%20EPICALCOS\.$/);
    expect(hrefWhatsapp(null)).not.toMatch(/\?text=/);
  });
});
