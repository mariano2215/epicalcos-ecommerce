import { describe, it, expect } from 'vitest';
import {
  etiquetaFecha,
  zonaNavidad,
  fechaLimiteNavidad,
  fechasNavidadVigentes,
  fraseNavidad
} from './navidad.js';
import { NAVIDAD_2026, anunciosVigentes } from '../config/site.js';

/**
 * Fecha límite de Navidad (spec 042). Los instantes son FIJOS y con `-03:00`:
 * el corte es a las 23:59 de Argentina aunque la suite corra en UTC.
 */
const ar = (dia, hora = '12:00:00') => Date.parse(`2026-12-${dia}T${hora}-03:00`);
const NOV_25 = Date.parse('2026-11-25T12:00:00-03:00');
const config = NAVIDAD_2026;

describe('las fechas confirmadas por Mariano (20/11/2026)', () => {
  it('son las de la spec', () => {
    expect(etiquetaFecha(config.limites.interior)).toBe('10/12');
    expect(etiquetaFecha(config.limites.rosario)).toBe('17/12');
    expect(etiquetaFecha(config.limites.retiro)).toBe('18/12');
    expect(etiquetaFecha(config.limitesVolumen.interior)).toBe('4/12');
    expect(etiquetaFecha(config.limitesVolumen.rosario)).toBe('14/12');
  });

  it('ningún corte cae en fin de semana ni en el 7 u 8/12', () => {
    for (const iso of [...Object.values(config.limites), ...Object.values(config.limitesVolumen)]) {
      // Mediodía del mismo día en Argentina: el día de la semana no depende del huso de la suite.
      const dia = new Date(Date.parse(iso.slice(0, 10) + 'T12:00:00-03:00')).getUTCDay();
      expect([0, 6]).not.toContain(dia);
      expect(['7/12', '8/12']).not.toContain(etiquetaFecha(iso));
    }
  });

  it('lo más grande nunca tiene más plazo que lo común en la misma zona', () => {
    for (const zona of ['interior', 'rosario', 'retiro']) {
      expect(Date.parse(config.limitesVolumen[zona])).toBeLessThanOrEqual(Date.parse(config.limites[zona]));
    }
  });
});

describe('zonaNavidad', () => {
  it('retiro manda sobre la ciudad; las próximas a Rosario van con Rosario', () => {
    expect(zonaNavidad('interior', 'retiro')).toBe('retiro');
    expect(zonaNavidad('rosario', 'envio')).toBe('rosario');
    expect(zonaNavidad('nearby', 'envio')).toBe('rosario');
    expect(zonaNavidad('interior', 'envio')).toBe('interior');
  });
});

describe('fechaLimiteNavidad', () => {
  it('corta a las 23:59 de Argentina, no a medianoche UTC', () => {
    expect(fechaLimiteNavidad({ zona: 'interior', ahora: ar('10', '23:30:00'), config })).toBe('10/12');
    expect(fechaLimiteNavidad({ zona: 'interior', ahora: ar('11', '00:00:01'), config })).toBeNull();
  });

  it('con 100 calcos o más usa la tabla de volumen', () => {
    expect(fechaLimiteNavidad({ zona: 'interior', volumen: true, ahora: ar('03'), config })).toBe('4/12');
    expect(fechaLimiteNavidad({ zona: 'interior', volumen: true, ahora: ar('05'), config })).toBeNull();
    // El mismo 5/12, con menos de 100, todavía llega.
    expect(fechaLimiteNavidad({ zona: 'interior', ahora: ar('05'), config })).toBe('10/12');
  });

  it('apagado o con una zona que no existe, no promete nada', () => {
    expect(fechaLimiteNavidad({ zona: 'interior', ahora: NOV_25, config: { ...config, activa: false } })).toBeNull();
    expect(fechaLimiteNavidad({ zona: 'marte', ahora: NOV_25, config })).toBeNull();
  });
});

describe('fechasNavidadVigentes', () => {
  it('lista las que quedan, en orden', () => {
    expect(fechasNavidadVigentes({ ahora: NOV_25, config }).map((f) => f.etiqueta)).toEqual(['10/12', '17/12', '18/12']);
    expect(fechasNavidadVigentes({ ahora: ar('15'), config }).map((f) => f.zona)).toEqual(['rosario', 'retiro']);
    expect(fechasNavidadVigentes({ ahora: ar('19'), config })).toEqual([]);
  });

  it('con volumen no repite el mismo día para envío y retiro', () => {
    expect(fechasNavidadVigentes({ volumen: true, ahora: NOV_25, config })).toEqual([
      { zona: 'interior', etiqueta: '4/12' },
      { zona: 'rosario', etiqueta: '14/12' }
    ]);
  });
});

describe('la frase de la tira', () => {
  it('cambia a medida que vence cada fecha y se va sola', () => {
    expect(fraseNavidad(NOV_25, config)).toBe('🎄 Para Navidad: pedí hasta el 10/12 al interior y el 17/12 en Rosario');
    expect(fraseNavidad(ar('12'), config)).toBe('🎄 Para Navidad en Rosario: pedí hasta el 17/12');
    expect(fraseNavidad(ar('18'), config)).toBe('🎄 Para Navidad: retirá en Rosario pidiendo hasta el 18/12');
    expect(fraseNavidad(ar('19'), config)).toBeNull();
  });

  it('está en la tira mientras rige y no después', () => {
    expect(anunciosVigentes(NOV_25).some((t) => t.startsWith('🎄'))).toBe(true);
    expect(anunciosVigentes(ar('19')).some((t) => t.startsWith('🎄'))).toBe(false);
  });
});
