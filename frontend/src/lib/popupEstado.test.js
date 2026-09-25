import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  POPUP_ESTADO_KEY,
  POPUP_SESION_KEY,
  POPUP_VIEJO_KEY,
  storageOk,
  leerEstado,
  leerSesion,
  iniciarSesion,
  registrarSenal,
  marcarAutoAbierto,
  registrarVisto,
  registrarCerrado,
  registrarConvertido,
  registrarCompra,
  reiniciarMemoria
} from './popupEstado.js';
import { emitirCupon, leerCupon, msRestantes, cuponVigente } from './cuponVentana.js';
import { WELCOME_COUPON_STORAGE_KEY } from '../config/pricing.js';
import { beneficioActivo } from './popupReglas.js';

/**
 * La memoria del popup de bienvenida (spec 026). Los bordes que importan son
 * los de siempre en este repo: storage bloqueado (navegador de Instagram) y
 * los navegadores que ya pasaron por el popup anterior.
 */

const AHORA = new Date('2026-09-25T12:00:00-03:00');

function storageFalso() {
  const store = new Map();
  return {
    store,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
}

const roto = () => ({
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('SecurityError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  }
});

beforeEach(() => {
  globalThis.localStorage = storageFalso();
  globalThis.sessionStorage = storageFalso();
  reiniciarMemoria();
  vi.useFakeTimers();
  vi.setSystemTime(AHORA);
});
afterEach(() => {
  vi.useRealTimers();
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
});

describe('sesión', () => {
  it('la primera sesión es de un visitante nuevo y marca la primera visita', () => {
    const s = iniciarSesion('/');
    expect(s.visitante).toBe('new');
    expect(s.inicioEn).toBe(AHORA.getTime());
    expect(s.entrada).toBe('/');
    expect(leerEstado().primeraVisitaEn).toBe(AHORA.getTime());
  });

  it('una recarga no abre otra sesión (la apertura automática sigue contada)', () => {
    iniciarSesion('/');
    marcarAutoAbierto();
    vi.advanceTimersByTime(60_000);
    const s = iniciarSesion('/categorias');
    expect(s.autoAbierto).toBe(true);
    expect(s.inicioEn).toBe(AHORA.getTime());
  });

  it('una pestaña nueva otro día es un visitante recurrente', () => {
    iniciarSesion('/');
    globalThis.sessionStorage = storageFalso(); // pestaña nueva
    reiniciarMemoria();
    expect(iniciarSesion('/').visitante).toBe('returning');
  });
});

describe('señales de interés', () => {
  it('cuenta fichas distintas, no visitas', () => {
    iniciarSesion('/');
    registrarSenal('producto', '/producto/boca/1');
    registrarSenal('producto', '/producto/boca/1');
    expect(leerSesion().productos).toHaveLength(1);
    registrarSenal('producto', '/producto/river/2');
    expect(leerSesion().productos).toHaveLength(2);
  });

  it('la categoría por la que entró no cuenta; otra sí', () => {
    iniciarSesion('/categoria/boca');
    registrarSenal('categoria', '/categoria/boca');
    expect(leerSesion().categoria).toBe(false);
    registrarSenal('categoria', '/categoria/river');
    expect(leerSesion().categoria).toBe(true);
  });

  it('búsqueda', () => {
    iniciarSesion('/');
    registrarSenal('busqueda');
    expect(leerSesion().busqueda).toBe(true);
  });
});

describe('frecuencia', () => {
  it('visto, cerrado, convertido y compra quedan guardados', () => {
    registrarVisto();
    registrarCerrado();
    registrarConvertido();
    registrarCompra();
    const e = JSON.parse(localStorage.getItem(POPUP_ESTADO_KEY));
    expect(e).toMatchObject({
      vistoEn: AHORA.getTime(),
      cerradoEn: AHORA.getTime(),
      convertidoEn: AHORA.getTime(),
      compradoEn: AHORA.getTime()
    });
  });

  it('P-3: comprar NO borra el cupón guardado', () => {
    emitirCupon('EPICA10', { conVentana: false });
    registrarCompra();
    expect(leerCupon()).toEqual({ code: 'EPICA10', emitidoEn: null });
  });
});

describe('migración del popup anterior', () => {
  it('seen + cupón → dejó el mail; la clave vieja no se toca', () => {
    localStorage.setItem(POPUP_VIEJO_KEY, '1');
    localStorage.setItem(WELCOME_COUPON_STORAGE_KEY, 'EPICA10');
    expect(leerEstado().convertidoEn).toBe(AHORA.getTime());
    expect(localStorage.getItem(POPUP_VIEJO_KEY)).toBe('1');
  });

  it('seen sin cupón → lo cerró, y se migra una sola vez', () => {
    localStorage.setItem(POPUP_VIEJO_KEY, '1');
    expect(leerEstado().cerradoEn).toBe(AHORA.getTime());
    vi.advanceTimersByTime(60_000);
    expect(leerEstado().cerradoEn).toBe(AHORA.getTime());
  });

  it('un visitante migrado cuenta como recurrente', () => {
    localStorage.setItem(POPUP_VIEJO_KEY, '1');
    expect(iniciarSesion('/').visitante).toBe('returning');
  });
});

describe('storage bloqueado (navegador de Instagram)', () => {
  beforeEach(() => {
    globalThis.localStorage = roto();
    globalThis.sessionStorage = roto();
  });

  it('storageOk da false y nada tira', () => {
    expect(storageOk()).toBe(false);
    expect(() => {
      iniciarSesion('/');
      registrarSenal('busqueda');
      registrarCerrado();
      marcarAutoAbierto();
    }).not.toThrow();
  });

  it('lo de esta carga queda en memoria', () => {
    iniciarSesion('/');
    registrarCerrado();
    marcarAutoAbierto();
    expect(leerEstado().cerradoEn).toBe(AHORA.getTime());
    expect(leerSesion().autoAbierto).toBe(true);
  });
});

describe('P-2: el cupón del popup sin ventana', () => {
  it('se guarda sin instante de emisión y no vence nunca', () => {
    emitirCupon('EPICA10', { conVentana: false });
    const cupon = leerCupon();
    expect(cupon).toEqual({ code: 'EPICA10', emitidoEn: null });
    expect(msRestantes(cupon)).toBe(Infinity);
    vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000);
    expect(cuponVigente(cupon)).toBe(true);
    expect(beneficioActivo(cupon)).toBe(true);
  });

  it('NO guarda `emitidoEn: null`: Number(null) es 0 y lo daría por vencido', () => {
    emitirCupon('EPICA10', { conVentana: false });
    expect(JSON.parse(localStorage.getItem(WELCOME_COUPON_STORAGE_KEY))).toEqual({ code: 'EPICA10' });
  });

  it('el default sigue siendo con ventana (spec 017)', () => {
    emitirCupon('EPICA10');
    expect(leerCupon().emitidoEn).toBe(AHORA.getTime());
  });
});

it('la sesión vive en sessionStorage', () => {
  iniciarSesion('/');
  expect(JSON.parse(sessionStorage.getItem(POPUP_SESION_KEY)).entrada).toBe('/');
});
