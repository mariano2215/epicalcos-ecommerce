import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { emitirCupon, leerCupon, olvidarCupon, msRestantes, cuponVigente } from './cuponVentana.js';
import {
  CUPON_VENTANA_MS,
  CUPON_TOLERANCIA_MS,
  ventanaCuponAbierta,
  cuponTieneVentana,
  WELCOME_COUPON_STORAGE_KEY
} from '../config/pricing.js';

/**
 * La ventana de 10 minutos del cupón de bienvenida (spec 017).
 *
 * Lo que más importa acá no es el camino feliz sino los dos bordes que rompen
 * clientes reales: el formato viejo guardado en navegadores que ya pasaron por
 * el popup, y `localStorage` bloqueado (navegador embebido de Instagram).
 */

const AHORA = new Date('2026-09-10T12:00:00-03:00');

beforeEach(() => {
  // El entorno de test es `node`: no hay localStorage. Se simula uno mínimo,
  // igual que en busquedasSugeridas.test.js, y así además se puede probar el
  // caso "storage roto" pisando un método puntual.
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
  vi.useFakeTimers();
  vi.setSystemTime(AHORA);
});
afterEach(() => {
  vi.useRealTimers();
  delete globalThis.localStorage;
});

describe('emisión y lectura', () => {
  it('emitir guarda código + instante y leer los devuelve', () => {
    const ts = emitirCupon('EPICA10');
    expect(ts).toBe(AHORA.getTime());
    expect(leerCupon()).toEqual({ code: 'EPICA10', emitidoEn: AHORA.getTime() });
  });

  it('sin nada guardado devuelve null', () => expect(leerCupon()).toBeNull());

  it('olvidar lo borra', () => {
    emitirCupon('EPICA10');
    olvidarCupon();
    expect(leerCupon()).toBeNull();
  });
});

describe('EC-2 · el formato viejo (string suelto) no rompe', () => {
  it('un código guardado como string se lee sin tirar', () => {
    // Así lo guardaba el popup antes de la spec 017.
    localStorage.setItem(WELCOME_COUPON_STORAGE_KEY, 'EPICA10');
    expect(leerCupon()).toEqual({ code: 'EPICA10', emitidoEn: null });
  });

  it('y NO arranca vencido: sin instante de emisión, no hay ventana', () => {
    localStorage.setItem(WELCOME_COUPON_STORAGE_KEY, 'EPICA10');
    const cupon = leerCupon();
    expect(cuponVigente(cupon)).toBe(true);
    expect(msRestantes(cupon)).toBe(Infinity);
  });

  it('un JSON válido que no es nuestro objeto también se tolera', () => {
    localStorage.setItem(WELCOME_COUPON_STORAGE_KEY, '"EPICA10"');
    expect(leerCupon()).toEqual({ code: 'EPICA10', emitidoEn: null });
  });

  it('un objeto sin `emitidoEn` se trata como sin ventana', () => {
    localStorage.setItem(WELCOME_COUPON_STORAGE_KEY, JSON.stringify({ code: 'EPICA10' }));
    expect(leerCupon()).toEqual({ code: 'EPICA10', emitidoEn: null });
  });
});

describe('EC-1 · localStorage bloqueado', () => {
  const romper = (metodo) => {
    globalThis.localStorage[metodo] = () => {
      throw new Error('storage bloqueado');
    };
  };

  it('emitir devuelve null y no tira', () => {
    romper('setItem');
    expect(() => emitirCupon('EPICA10')).not.toThrow();
    expect(emitirCupon('EPICA10')).toBeNull();
  });

  it('leer devuelve null y no tira', () => {
    romper('getItem');
    expect(() => leerCupon()).not.toThrow();
    expect(leerCupon()).toBeNull();
  });

  it('olvidar no tira', () => {
    romper('removeItem');
    expect(() => olvidarCupon()).not.toThrow();
  });

  it('sin localStorage en absoluto tampoco tira', () => {
    delete globalThis.localStorage;
    expect(() => leerCupon()).not.toThrow();
    expect(() => emitirCupon('EPICA10')).not.toThrow();
    expect(() => olvidarCupon()).not.toThrow();
  });
});

describe('la cuenta de los 10 minutos', () => {
  it('recién emitido quedan los 10 minutos completos', () => {
    emitirCupon('EPICA10');
    expect(msRestantes(leerCupon())).toBe(CUPON_VENTANA_MS);
  });

  it('a los 9:59 sigue vigente; a los 10:01 no', () => {
    const emitidoEn = AHORA.getTime();
    emitirCupon('EPICA10');
    const cupon = leerCupon();

    vi.setSystemTime(emitidoEn + 9 * 60_000 + 59_000);
    expect(cuponVigente(cupon)).toBe(true);
    expect(msRestantes(cupon)).toBeGreaterThan(0);

    vi.setSystemTime(emitidoEn + 10 * 60_000 + 1_000);
    expect(cuponVigente(cupon)).toBe(false);
    expect(msRestantes(cupon)).toBe(0);
  });

  it('el borde exacto de los 10:00 todavía vale', () => {
    const emitidoEn = AHORA.getTime();
    emitirCupon('EPICA10');
    vi.setSystemTime(emitidoEn + CUPON_VENTANA_MS);
    expect(cuponVigente(leerCupon())).toBe(true);
  });

  it('un cupón SIN ventana (EPI50) no cuenta nada', () => {
    expect(cuponTieneVentana('EPI50')).toBe(false);
    expect(msRestantes({ code: 'EPI50', emitidoEn: 0 })).toBe(Infinity);
    expect(cuponVigente({ code: 'EPI50', emitidoEn: 0 })).toBe(true);
  });

  it('sin cupón no hay nada vigente', () => {
    expect(cuponVigente(null)).toBe(false);
    expect(cuponVigente({ code: '' })).toBe(false);
  });
});

describe('EC-5 y EC-6 · relojes corridos', () => {
  it('el frontend es estricto: sin tolerancia', () => {
    const ahora = AHORA.getTime();
    // Vencido por 1 segundo: el frontend ya no lo muestra.
    expect(ventanaCuponAbierta(ahora - CUPON_VENTANA_MS - 1000, ahora, 0)).toBe(false);
  });

  it('EC-5 · el servidor tolera 60 s para no rechazar un reloj corrido', () => {
    const ahora = AHORA.getTime();
    // Mismo instante que el caso de arriba, pero con la tolerancia del server.
    expect(ventanaCuponAbierta(ahora - CUPON_VENTANA_MS - 1000, ahora, CUPON_TOLERANCIA_MS)).toBe(true);
    // Pasada la tolerancia, tampoco.
    expect(
      ventanaCuponAbierta(ahora - CUPON_VENTANA_MS - CUPON_TOLERANCIA_MS - 1000, ahora, CUPON_TOLERANCIA_MS)
    ).toBe(false);
  });

  it('EC-6 · una emisión en el FUTURO no se cree', () => {
    const ahora = AHORA.getTime();
    expect(ventanaCuponAbierta(ahora + 10 * 60_000, ahora, CUPON_TOLERANCIA_MS)).toBe(false);
  });

  it('sin instante de emisión, la ventana está abierta', () => {
    expect(ventanaCuponAbierta(undefined)).toBe(true);
    expect(ventanaCuponAbierta(null)).toBe(true);
    expect(ventanaCuponAbierta(NaN)).toBe(true);
  });
});

describe('CF-24 · la ventana es POR USUARIO', () => {
  it('dos emisiones con 5 minutos de diferencia vencen en momentos distintos', () => {
    const t0 = AHORA.getTime();
    const primero = { code: 'EPICA10', emitidoEn: t0 };
    const segundo = { code: 'EPICA10', emitidoEn: t0 + 5 * 60_000 };

    // A los 11 minutos del primero: el primero venció, el segundo no.
    vi.setSystemTime(t0 + 11 * 60_000);
    expect(cuponVigente(primero)).toBe(false);
    expect(cuponVigente(segundo)).toBe(true);
  });
});
