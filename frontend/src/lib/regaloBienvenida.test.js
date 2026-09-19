import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { emitirRegalo, leerRegalo, olvidarRegalo, msRestantesRegalo } from './regaloBienvenida.js';
import {
  REGALO_BIENVENIDA,
  REGALO_STORAGE_KEY,
  ventanaRegaloAbierta
} from '../config/pricing.js';
import {
  REGALO_BIENVENIDA as BE_REGALO,
  REGALO_TOLERANCIA_MS as BE_TOLERANCIA,
  LINEA_REGALO,
  validateAndPriceOrder
} from '../../../netlify/functions/lib/pricing.js';

/**
 * El pack de stickers sorpresa del popup (spec 025).
 *
 * Dos cosas se miran acá y ninguna es el camino feliz:
 *
 *  1. EL ESPEJO. La ventana y el interruptor están escritos dos veces (sitio y
 *     servidor). Si se separan no se rompe ningún checkout — pasa algo peor de
 *     explicarle a un cliente: la pantalla le promete un pack que el servidor
 *     después no mete en la caja.
 *
 *  2. QUE EL REGALO NO TOQUE NINGÚN PRECIO. Es la razón por la que se decide
 *     DESPUÉS del pricing y fuera del carrito. El test compara el mismo pedido
 *     con y sin regalo: si algún día el pack entra al cálculo, esto se cae.
 */

const AHORA = new Date('2026-09-18T12:00:00-03:00');
const MIN = 60 * 1000;

beforeEach(() => {
  // El entorno de test es `node`: no hay localStorage. Se simula uno mínimo,
  // igual que en cuponVentana.test.js, y así además se puede probar el caso
  // "storage roto" pisando un método puntual.
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
  olvidarRegalo(); // limpia también la copia en memoria del módulo
  delete globalThis.localStorage;
});

describe('paridad sitio ↔ servidor', () => {
  it('el interruptor, el id y la ventana son idénticos en los dos lados', () => {
    expect(BE_REGALO.activa).toBe(REGALO_BIENVENIDA.activa);
    expect(BE_REGALO.id).toBe(REGALO_BIENVENIDA.id);
    expect(BE_REGALO.ventanaMs).toBe(REGALO_BIENVENIDA.ventanaMs);
  });

  it('la ventana son 10 minutos y el servidor tolera 60 s de reloj corrido', () => {
    expect(REGALO_BIENVENIDA.ventanaMs).toBe(10 * MIN);
    expect(BE_TOLERANCIA).toBe(MIN);
  });

  it('la línea del regalo no cuesta nada y es una sola unidad', () => {
    expect(LINEA_REGALO.unit_price).toBe(0);
    expect(LINEA_REGALO.quantity).toBe(1);
    expect(LINEA_REGALO.id).toBe(`regalo:${REGALO_BIENVENIDA.id}`);
  });
});

describe('ventanaRegaloAbierta (sitio, sin tolerancia)', () => {
  const ahora = () => Date.now();

  it('a 9:59 sigue abierta', () => {
    expect(ventanaRegaloAbierta(ahora() - (9 * MIN + 59 * 1000))).toBe(true);
  });

  it('a 10:01 está cerrada', () => {
    expect(ventanaRegaloAbierta(ahora() - (10 * MIN + 1000))).toBe(false);
  });

  it('SIN emisión no hay regalo — al revés que el cupón, que vale igual', () => {
    expect(ventanaRegaloAbierta(undefined)).toBe(false);
    expect(ventanaRegaloAbierta(null)).toBe(false);
    expect(ventanaRegaloAbierta('abc')).toBe(false);
  });

  it('una emisión en el futuro no se cree', () => {
    expect(ventanaRegaloAbierta(ahora() + 5 * MIN)).toBe(false);
  });
});

describe('emisión y lectura', () => {
  it('emitir guarda el regalo y su instante, y leer los devuelve', () => {
    const emitido = emitirRegalo();
    expect(emitido).toEqual({ regalo: REGALO_BIENVENIDA.id, emitidoEn: Date.now() });
    expect(leerRegalo()).toEqual(emitido);
    expect(JSON.parse(localStorage.getItem(REGALO_STORAGE_KEY))).toEqual(emitido);
  });

  it('sin nada guardado devuelve null', () => {
    expect(leerRegalo()).toBeNull();
  });

  it('olvidar lo borra del storage y de la memoria', () => {
    emitirRegalo();
    olvidarRegalo();
    expect(leerRegalo()).toBeNull();
  });

  it('con storage BLOQUEADO al escribir, el regalo sobrevive en memoria', () => {
    // Navegador embebido de Instagram: `setItem` tira. El cupón podía vivir sin
    // esto porque tenía un código tipeable; el regalo no tiene ninguno, así que
    // sin la copia en memoria se perdería yendo del popup al checkout.
    localStorage.setItem = () => {
      throw new Error('storage bloqueado');
    };
    const emitido = emitirRegalo();
    expect(emitido.regalo).toBe(REGALO_BIENVENIDA.id);
    expect(leerRegalo()).toEqual(emitido);
  });

  it('con storage bloqueado al LEER, también cae en la copia en memoria', () => {
    const emitido = emitirRegalo();
    localStorage.getItem = () => {
      throw new Error('storage bloqueado');
    };
    expect(leerRegalo()).toEqual(emitido);
  });

  it('basura en el storage no borra el regalo de esta sesión', () => {
    const emitido = emitirRegalo();
    localStorage.setItem(REGALO_STORAGE_KEY, 'no-es-json');
    expect(leerRegalo()).toEqual(emitido);
  });

  it('un objeto guardado sin instante válido se ignora', () => {
    localStorage.setItem(REGALO_STORAGE_KEY, JSON.stringify({ regalo: 'pack_sorpresa' }));
    expect(leerRegalo()).toBeNull();
  });
});

describe('msRestantesRegalo', () => {
  it('recién emitido quedan los 10 minutos', () => {
    expect(msRestantesRegalo(emitirRegalo())).toBe(10 * MIN);
  });

  it('nunca es negativo', () => {
    expect(msRestantesRegalo({ emitidoEn: Date.now() - 30 * MIN })).toBe(0);
  });

  it('sin regalo devuelve 0 (no Infinity como el cupón)', () => {
    expect(msRestantesRegalo(null)).toBe(0);
    expect(msRestantesRegalo({})).toBe(0);
  });
});

/**
 * El servidor decide. Un carrito de 2 calcos de `marvel`, que es el que usa
 * pedidoTransferencia.test.js justamente porque no le corre ninguna promo: así
 * lo que se ve acá es el regalo y no un reparto N x M.
 */
const items = [{ id: 'sticker:marvel-3:6cm', title: 'Marvel #3 · 6 cm', quantity: 2, unit_price: 1600 }];
const retiro = { methodValue: 'retiro' };
const pedido = (extra) => validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago', ...extra });

describe('regaloVigente en validateAndPriceOrder', () => {
  it('con la ventana abierta, el pedido se lleva el pack', () => {
    expect(pedido({ regaloEmitidoEn: Date.now() }).regalo).toBe('pack_sorpresa');
  });

  it('a 10:30 lo sigue llevando: son los 60 s de tolerancia por reloj corrido', () => {
    expect(pedido({ regaloEmitidoEn: Date.now() - (10 * MIN + 30 * 1000) }).regalo).toBe('pack_sorpresa');
  });

  it('a 11:30 ya no, y el pedido NO se rechaza', () => {
    const res = pedido({ regaloEmitidoEn: Date.now() - (11 * MIN + 30 * 1000) });
    expect(res.ok).toBe(true);
    expect(res.regalo).toBeNull();
  });

  it('una emisión en el futuro, basura o ausente nunca voltea el pedido', () => {
    for (const valor of [Date.now() + 60 * MIN, 'abc', {}, [], null, undefined, NaN]) {
      const res = pedido({ regaloEmitidoEn: valor });
      expect(res.ok).toBe(true);
      expect(res.regalo).toBeNull();
    }
  });

  it('un pedido de solo archivos imprimibles no lo lleva: no hay caja', () => {
    const res = validateAndPriceOrder({
      items: [{ id: 'digital:pack-stickers', title: 'Pack de stickers imprimibles', quantity: 1, unit_price: 9999 }],
      shipping: { methodValue: 'digital' },
      paymentMethod: 'mercadopago',
      regaloEmitidoEn: Date.now()
    });
    expect(res.ok).toBe(true);
    expect(res.regalo).toBeNull();
  });

  it('con el interruptor apagado no lo entrega aunque la emisión sea de recién', () => {
    const antes = BE_REGALO.activa;
    try {
      BE_REGALO.activa = false;
      expect(pedido({ regaloEmitidoEn: Date.now() }).regalo).toBeNull();
    } finally {
      BE_REGALO.activa = antes;
    }
  });
});

describe('⚠️ el regalo NO mueve ningún precio', () => {
  it('el mismo pedido con y sin regalo cobra exactamente lo mismo', () => {
    const sin = pedido({});
    const con = pedido({ regaloEmitidoEn: Date.now() });

    expect(con.regalo).toBe('pack_sorpresa');
    expect(sin.regalo).toBeNull();
    // Lo que de verdad importa: todo lo que se cobra es idéntico.
    expect(con.items).toEqual(sin.items);
    expect(con.itemsTotal).toBe(sin.itemsTotal);
    expect(con.shippingCost).toBe(sin.shippingCost);
    expect(con.methodValue).toBe(sin.methodValue);
    expect(con.couponApplied).toBe(sin.couponApplied);
  });

  it('tampoco mueve el umbral de envío gratis ni el costo del correo', () => {
    // Un pedido con envío a Rosario, que sí tiene costo y umbral.
    const envio = { methodValue: 'envio', city: 'Rosario', province: 'Santa Fe' };
    const sin = validateAndPriceOrder({ items, shipping: envio, paymentMethod: 'mercadopago' });
    const con = validateAndPriceOrder({
      items,
      shipping: envio,
      paymentMethod: 'mercadopago',
      regaloEmitidoEn: Date.now()
    });
    expect(con.shippingCost).toBe(sin.shippingCost);
    expect(con.itemsTotal).toBe(sin.itemsTotal);
  });

  it('la línea del regalo no entra a los items que devuelve el pricing', () => {
    const con = pedido({ regaloEmitidoEn: Date.now() });
    expect(con.items.some((i) => i.id === LINEA_REGALO.id)).toBe(false);
  });
});
