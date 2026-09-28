import { describe, it, expect } from 'vitest';
import { ganaAhora } from './juegoTermo.js';
import { premioDelJuego } from './popupReglas.js';
import { POPUP_JUEGO } from '../config/popup.js';

/**
 * El juego del hero da el 10% del popup (spec 028, ampliación C). Lo que no se
 * puede romper: que el premio se dé una sola vez, solo al completar, y nunca a
 * quien ya tiene el descuento o ya compró.
 */
describe('juego del termo', () => {
  it('gana al llegar a las piezas, no antes', () => {
    const n = POPUP_JUEGO.piezas;
    expect(ganaAhora({ pegadas: n - 1, premiado: false, hayPremio: true })).toBe(false);
    expect(ganaAhora({ pegadas: n, premiado: false, hayPremio: true })).toBe(true);
  });

  it('el premio se da una sola vez', () => {
    expect(ganaAhora({ pegadas: POPUP_JUEGO.piezas, premiado: true, hayPremio: true })).toBe(false);
  });

  it('sin premio para dar, completar no gana nada', () => {
    expect(ganaAhora({ pegadas: POPUP_JUEGO.piezas, premiado: false, hayPremio: false })).toBe(false);
  });

  it('hay que pegar las 4 calcos del hero', () => {
    expect(POPUP_JUEGO.piezas).toBe(4);
  });

  it('"jugando" dura lo suficiente para pegar las 4 con calma, y no para siempre', () => {
    expect(POPUP_JUEGO.jugandoMs).toBeGreaterThanOrEqual(10_000);
    expect(POPUP_JUEGO.jugandoMs).toBeLessThanOrEqual(60_000);
  });
});

describe('¿el juego puede prometer el descuento?', () => {
  it('sí, si el popup lo puede dar', () => {
    expect(premioDelJuego({ habilitado: true, cuponActivo: false, comprado: false })).toBe(true);
  });
  it('no, si ya tiene el cupón activo', () => {
    expect(premioDelJuego({ habilitado: true, cuponActivo: true, comprado: false })).toBe(false);
  });
  it('no, si ya compró', () => {
    expect(premioDelJuego({ habilitado: true, cuponActivo: false, comprado: true })).toBe(false);
  });
  it('no, si el popup o el cupón están apagados', () => {
    expect(premioDelJuego({ habilitado: false, cuponActivo: false, comprado: false })).toBe(false);
  });
});
