/**
 * Persistencia y opt-out del carrito abandonado — spec 003, P2.
 *
 * ─── POR QUÉ ESTE ARCHIVO EXISTE ──────────────────────────────────────────────
 * Este módulo también rompió producción en silencio. `consultarBaja()` devolvía
 * `true` desde el `catch`, así que un fallo de Blobs se presentaba como una baja
 * voluntaria: `track-cart` respondía `opted_out` a TODO el mundo, no se guardaba
 * ningún carrito y no salía ningún recordatorio — "sin un solo error a la
 * vista", dice el comentario del módulo.
 *
 * El test "un fallo de lectura NO es una baja" es el que impide volver a eso.
 *
 * ─── SOBRE EL MOCK DE @netlify/blobs ──────────────────────────────────────────
 * Se mockea la librería con lo MÍNIMO que usa el módulo: `setJSON`, `get`,
 * `delete` y `list`. Un mock más completo imitaría una API de terceros que no
 * controlamos y mentiría cuando Netlify la cambie.
 *
 * `storeFalso.romper` permite simular que Blobs no responde, que es justamente
 * el camino donde vivía el bug.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/** Estado del store falso, compartido por todos los "stores" que se abran. */
const almacenes = new Map();
let romper = null; // null | 'todo' | 'get' | 'set'

const storeFalso = (name) => {
  if (!almacenes.has(name)) almacenes.set(name, new Map());
  const datos = almacenes.get(name);
  const chequear = (op) => {
    if (romper === 'todo' || romper === op) throw new Error('Blobs no disponible');
  };
  return {
    async setJSON(key, value) {
      chequear('set');
      datos.set(key, value);
    },
    async get(key) {
      chequear('get');
      return datos.has(key) ? datos.get(key) : null;
    },
    async delete(key) {
      chequear('set');
      datos.delete(key);
    },
    async list() {
      chequear('get');
      return { blobs: [...datos.keys()].map((key) => ({ key })) };
    }
  };
};

vi.mock('@netlify/blobs', () => ({
  getStore: (arg) => storeFalso(typeof arg === 'string' ? arg : arg.name)
}));

const {
  normalizarEmail,
  guardarCarrito,
  borrarCarrito,
  listarCarritos,
  marcarNotificado,
  tokenBaja,
  tokenValido,
  darDeBaja,
  consultarBaja,
  estaDadoDeBaja,
  purgar
} = await import('../../../netlify/functions/lib/abandonedStore.js');

const MAIL = 'ana@example.com';
const SECRETO = 'secreto-de-prueba-no-usar-en-produccion';
const carrito = { items: [{ name: 'Argentina #72', quantity: 2, price: 1600 }], total: 3200, units: 2 };

beforeEach(() => {
  almacenes.clear();
  romper = null;
});

describe('opt-out: un fallo de lectura NO es una baja (spec 003)', () => {
  /**
   * ⚠️ EL TEST DE ESTA FASE.
   *
   * Antes el `catch` devolvía `true` y un Blobs caído se disfrazaba de "el
   * cliente pidió no recibir más". Resultado: la recuperación de carritos dejó
   * de capturar y de enviar, sin un solo error visible.
   */
  it('si el store falla al leer, devuelve error:true y baja:false', async () => {
    romper = 'get';
    const res = await consultarBaja(MAIL);
    expect(res).toEqual({ baja: false, error: true });
  });

  it('quien se dio de baja de verdad devuelve baja:true, error:false', async () => {
    await darDeBaja(MAIL);
    expect(await consultarBaja(MAIL)).toEqual({ baja: true, error: false });
  });

  it('quien nunca se dio de baja devuelve baja:false, error:false', async () => {
    expect(await consultarBaja(MAIL)).toEqual({ baja: false, error: false });
  });

  /**
   * El otro lado de la misma moneda: para DECIDIR SI ESCRIBIR, un error tiene
   * que impedir el envío. Es preferible perder un recordatorio a escribirle a
   * alguien que pidió que no lo hagan.
   */
  it('estaDadoDeBaja falla CERRADO: con el store roto, no se escribe', async () => {
    romper = 'get';
    expect(await estaDadoDeBaja(MAIL)).toBe(true);
  });

  it('estaDadoDeBaja es false para alguien sin baja y con el store sano', async () => {
    expect(await estaDadoDeBaja(MAIL)).toBe(false);
  });

  it('darDeBaja además borra el carrito pendiente', async () => {
    await guardarCarrito(MAIL, carrito);
    expect(await listarCarritos()).toHaveLength(1);
    await darDeBaja(MAIL);
    expect(await listarCarritos()).toHaveLength(0);
  });
});

describe('carritos: guardar, pisar y borrar (spec 003)', () => {
  it('al crear un pedido se BORRA el carrito (no se le escribe a quien compró)', async () => {
    await guardarCarrito(MAIL, carrito);
    await borrarCarrito(MAIL);
    expect(await listarCarritos()).toHaveLength(0);
  });

  it('guardar dos veces PISA el registro: una persona = un carrito', async () => {
    await guardarCarrito(MAIL, carrito);
    await guardarCarrito(MAIL, { ...carrito, total: 9999 });
    const todos = await listarCarritos();
    expect(todos).toHaveLength(1);
    expect(todos[0].total).toBe(9999);
  });

  it('guardar NO arrastra notifiedAt: un carrito nuevo es un abandono nuevo', async () => {
    await guardarCarrito(MAIL, carrito);
    await marcarNotificado(MAIL);
    expect((await listarCarritos())[0].notifiedAt).toBeTruthy();

    await guardarCarrito(MAIL, carrito); // vuelve y arma otro
    expect((await listarCarritos())[0].notifiedAt).toBeUndefined();
  });

  it('marcarNotificado conserva el resto del registro', async () => {
    await guardarCarrito(MAIL, carrito);
    await marcarNotificado(MAIL);
    const [guardado] = await listarCarritos();
    expect(guardado.total).toBe(3200);
    expect(guardado.email).toBe(MAIL);
  });

  it('purgar saca el registro', async () => {
    await guardarCarrito(MAIL, carrito);
    await purgar(MAIL);
    expect(await listarCarritos()).toHaveLength(0);
  });

  it('nunca lanza: con Blobs roto devuelve false en vez de romper el checkout', async () => {
    romper = 'todo';
    await expect(guardarCarrito(MAIL, carrito)).resolves.toBe(false);
    await expect(borrarCarrito(MAIL)).resolves.toBeUndefined();
    await expect(listarCarritos()).resolves.toEqual([]);
    await expect(marcarNotificado(MAIL)).resolves.toBeUndefined();
    await expect(purgar(MAIL)).resolves.toBeUndefined();
    await expect(darDeBaja(MAIL)).resolves.toBeUndefined();
  });

  it('un mail vacío no se guarda', async () => {
    expect(await guardarCarrito('', carrito)).toBe(false);
    expect(await listarCarritos()).toHaveLength(0);
  });
});

describe('normalización del mail: una persona = una clave (spec 003)', () => {
  it('mayúsculas y espacios dan la misma clave', () => {
    expect(normalizarEmail('  ANA@Example.COM ')).toBe(MAIL);
  });

  it('guardar con mayúsculas y borrar con minúsculas afecta al MISMO registro', async () => {
    await guardarCarrito('  ANA@Example.COM ', carrito);
    expect(await listarCarritos()).toHaveLength(1);
    await borrarCarrito(MAIL);
    expect(await listarCarritos()).toHaveLength(0);
  });

  it('la baja con mayúsculas también aplica en minúsculas', async () => {
    await darDeBaja('ANA@EXAMPLE.COM');
    expect((await consultarBaja(MAIL)).baja).toBe(true);
  });
});

describe('token de baja: no se puede dar de baja a otro (spec 003)', () => {
  it('el token válido para su propio mail', () => {
    expect(tokenValido(MAIL, tokenBaja(MAIL, SECRETO), SECRETO)).toBe(true);
  });

  it('el token de OTRO mail no sirve', () => {
    const ajeno = tokenBaja('otro@example.com', SECRETO);
    expect(tokenValido(MAIL, ajeno, SECRETO)).toBe(false);
  });

  it('con otro secreto no valida', () => {
    expect(tokenValido(MAIL, tokenBaja(MAIL, 'otro-secreto'), SECRETO)).toBe(false);
  });

  it('el token no depende de mayúsculas ni espacios', () => {
    expect(tokenBaja('  ANA@Example.COM ', SECRETO)).toBe(tokenBaja(MAIL, SECRETO));
  });

  it('tokens malformados no validan y no explotan', () => {
    const bueno = tokenBaja(MAIL, SECRETO);
    for (const malo of ['', null, undefined, 'x', bueno.slice(0, 31), bueno + 'a']) {
      expect(tokenValido(MAIL, malo, SECRETO)).toBe(false);
    }
  });
});
