/**
 * Recordatorio de carrito abandonado — a quién se le escribe y a quién no.
 *
 * ─── QUÉ CAMBIÓ EN LA SPEC 003 ────────────────────────────────────────────────
 * Antes este archivo REIMPLEMENTABA la decisión adentro del propio test (una
 * función `decidir()` local) y verificaba esa copia. El comentario lo justificaba
 * diciendo que las funciones de Blobs no se podían importar desde acá.
 *
 * Eso dejó de ser cierto: la spec 002 demostró que se puede importar un módulo
 * del servidor y mockear Blobs. Y la copia ya se había separado del original —
 * no contemplaba el modo prueba (`ABANDONED_CART_TEST_EMAIL`) ni el tope de
 * mails por corrida—, que es exactamente cómo un test-copia deja de proteger:
 * no falla, simplemente deja de saber.
 *
 * Ahora se ejercita `abandoned-cart.js` DE VERDAD, con el store y el envío de
 * mails mockeados, y se afirma sobre los efectos reales: a quién se le mandó,
 * a quién se purgó y a quién se marcó como notificado.
 *
 * Es el punto donde un bug no es un bug de UI: es escribirle a alguien que ya
 * compró o que pidió no recibir más.
 *
 * El token de baja se testea en `abandonedStore.test.js`, junto al resto del
 * módulo que lo genera.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const F = '../../../netlify/functions/';

// Estado del store falso. `listarCarritos` devuelve lo que se le ponga acá.
let carritos = [];
let bajas = new Set();

vi.mock('../../../netlify/functions/lib/abandonedStore.js', () => ({
  listarCarritos: vi.fn(async () => carritos),
  marcarNotificado: vi.fn(async () => {}),
  purgar: vi.fn(async () => {}),
  estaDadoDeBaja: vi.fn(async (email) => bajas.has(email)),
  tokenBaja: vi.fn(() => 'token-de-prueba'),
  // La normalización SÍ tiene que funcionar: el modo prueba compara mails.
  normalizarEmail: (email) => String(email || '').trim().toLowerCase()
}));

vi.mock('../../../netlify/functions/lib/notify.js', () => ({
  sendAbandonedCartEmail: vi.fn(async () => ({ sent: true }))
}));

const { marcarNotificado, purgar } = await import(F + 'lib/abandonedStore.js');
const { sendAbandonedCartEmail } = await import(F + 'lib/notify.js');
const correrCron = (await import(F + 'abandoned-cart.js')).default;

const HORA = 60 * 60 * 1000;
const AHORA = Date.parse('2026-08-08T20:00:00Z');
const haceHoras = (n) => new Date(AHORA - n * HORA).toISOString();
const haceDias = (n) => new Date(AHORA - n * 24 * HORA).toISOString();

/** Un carrito de prueba con la forma que guarda `guardarCarrito`. */
const carrito = (email, updatedAt, extra = {}) => ({
  email,
  nombre: 'Ana',
  items: [{ name: 'Argentina #72', quantity: 2, price: 1600 }],
  total: 3200,
  updatedAt,
  ...extra
});

/** A quiénes se les mandó el recordatorio en la última corrida. */
const mailsEnviadosA = () => sendAbandonedCartEmail.mock.calls.map((c) => c[0].email);
/** A quiénes se purgó. */
const purgadosA = () => purgar.mock.calls.map((c) => c[0]);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(AHORA);
  carritos = [];
  bajas = new Set();
  process.env.ABANDONED_CART_ENABLED = 'true';
  process.env.ABANDONED_CART_SECRET = 'secreto-de-prueba';
  process.env.URL = 'https://epicalcos.com';
  delete process.env.ABANDONED_CART_HOURS;
  delete process.env.ABANDONED_CART_MAX_HOURS;
  delete process.env.ABANDONED_CART_MAX_PER_RUN;
  delete process.env.ABANDONED_CART_TEST_EMAIL;
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.ABANDONED_CART_ENABLED;
  delete process.env.ABANDONED_CART_SECRET;
  delete process.env.ABANDONED_CART_TEST_EMAIL;
});

describe('carrito abandonado — el interruptor general', () => {
  it('SIN ABANDONED_CART_ENABLED no manda nada', async () => {
    delete process.env.ABANDONED_CART_ENABLED;
    carritos = [carrito('ana@example.com', haceHoras(5))];

    const res = await correrCron();
    expect(await res.json()).toMatchObject({ ok: true, enabled: false });
    expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
  });

  it('SIN ABANDONED_CART_SECRET tampoco manda nada', async () => {
    delete process.env.ABANDONED_CART_SECRET;
    carritos = [carrito('ana@example.com', haceHoras(5))];

    const res = await correrCron();
    expect(await res.json()).toMatchObject({ enabled: false });
    expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
  });
});

describe('carrito abandonado — a quién se le escribe', () => {
  it('escribe a las 4 horas del abandono', async () => {
    carritos = [carrito('ana@example.com', haceHoras(5))];
    await correrCron();
    expect(mailsEnviadosA()).toEqual(['ana@example.com']);
  });

  it('NO escribe si todavía puede estar comprando (menos de 4 h)', async () => {
    carritos = [carrito('ana@example.com', haceHoras(2))];
    await correrCron();
    expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
  });

  it('NUNCA escribe dos veces al mismo carrito', async () => {
    carritos = [carrito('ana@example.com', haceHoras(5), { notifiedAt: haceHoras(1) })];
    await correrCron();
    expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
  });

  it('NO escribe a quien pidió no recibir más', async () => {
    bajas.add('ana@example.com');
    carritos = [carrito('ana@example.com', haceHoras(5))];
    await correrCron();
    expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
  });

  it('marca como notificado SOLO si el mail salió', async () => {
    carritos = [carrito('ana@example.com', haceHoras(5))];
    await correrCron();
    expect(marcarNotificado).toHaveBeenCalledWith('ana@example.com');
  });

  it('si Resend falla NO lo marca: la próxima corrida reintenta', async () => {
    sendAbandonedCartEmail.mockResolvedValueOnce({ sent: false, reason: 'resend_500' });
    carritos = [carrito('ana@example.com', haceHoras(5))];

    const res = await correrCron();
    expect(marcarNotificado).not.toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ enviados: 0, salteados: 1 });
  });

  it('el mail lleva el link de baja firmado', async () => {
    carritos = [carrito('ana@example.com', haceHoras(5))];
    await correrCron();
    const arg = sendAbandonedCartEmail.mock.calls[0][0];
    expect(arg.unsubscribeUrl).toContain('/api/unsubscribe?e=');
    expect(arg.unsubscribeUrl).toContain('t=token-de-prueba');
    expect(arg.cartUrl).toContain('utm_campaign=carrito_abandonado');
  });
});

describe('carrito abandonado — qué se purga', () => {
  it('no escribe un recordatorio viejo (+72 h): lo purga', async () => {
    carritos = [carrito('ana@example.com', haceHoras(80))];
    await correrCron();
    expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
    expect(purgadosA()).toEqual(['ana@example.com']);
  });

  it('purga los registros que pasaron la retención (30 días)', async () => {
    carritos = [carrito('ana@example.com', haceDias(31))];
    await correrCron();
    expect(purgadosA()).toEqual(['ana@example.com']);
  });

  it('purga un registro con fecha corrupta en vez de escribirle', async () => {
    carritos = [carrito('ana@example.com', 'no-es-una-fecha')];
    await correrCron();
    expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
    expect(purgadosA()).toEqual(['ana@example.com']);
  });

  it('purga incluso los ya notificados si pasaron la retención', async () => {
    carritos = [carrito('ana@example.com', haceDias(31), { notifiedAt: haceDias(30) })];
    await correrCron();
    expect(purgadosA()).toEqual(['ana@example.com']);
  });
});

describe('carrito abandonado — umbrales configurables', () => {
  it('respeta un ABANDONED_CART_HOURS distinto', async () => {
    process.env.ABANDONED_CART_HOURS = '10';
    carritos = [carrito('ana@example.com', haceHoras(5))];
    await correrCron();
    expect(sendAbandonedCartEmail).not.toHaveBeenCalled();
  });

  it('respeta un ABANDONED_CART_MAX_HOURS distinto', async () => {
    process.env.ABANDONED_CART_MAX_HOURS = '6';
    carritos = [carrito('ana@example.com', haceHoras(8))];
    await correrCron();
    expect(purgadosA()).toEqual(['ana@example.com']);
  });

  it('un valor inválido cae al default (4 h)', async () => {
    process.env.ABANDONED_CART_HOURS = 'muchas';
    carritos = [carrito('ana@example.com', haceHoras(5))];
    await correrCron();
    expect(mailsEnviadosA()).toEqual(['ana@example.com']);
  });
});

/**
 * ─── LAS DOS RAMAS QUE LA COPIA HABÍA PERDIDO ─────────────────────────────────
 * Ninguna de estas dos existía en la versión replicada del test. Son la razón
 * concreta por la que un test-copia deja de proteger.
 */
describe('carrito abandonado — modo prueba (la copia no lo cubría)', () => {
  it('con ABANDONED_CART_TEST_EMAIL solo se le escribe a esa dirección', async () => {
    process.env.ABANDONED_CART_TEST_EMAIL = 'mariano@example.com';
    carritos = [
      carrito('ana@example.com', haceHoras(5)),
      carrito('mariano@example.com', haceHoras(5)),
      carrito('juan@example.com', haceHoras(5))
    ];

    await correrCron();
    expect(mailsEnviadosA()).toEqual(['mariano@example.com']);
  });

  it('a los demás NO se los marca notificado: al salir del modo prueba reciben el suyo', async () => {
    process.env.ABANDONED_CART_TEST_EMAIL = 'mariano@example.com';
    carritos = [carrito('ana@example.com', haceHoras(5)), carrito('mariano@example.com', haceHoras(5))];

    await correrCron();
    expect(marcarNotificado).toHaveBeenCalledTimes(1);
    expect(marcarNotificado).toHaveBeenCalledWith('mariano@example.com');
  });

  it('el mail de prueba se normaliza (mayúsculas y espacios)', async () => {
    process.env.ABANDONED_CART_TEST_EMAIL = '  Mariano@Example.COM ';
    carritos = [carrito('mariano@example.com', haceHoras(5))];
    await correrCron();
    expect(mailsEnviadosA()).toEqual(['mariano@example.com']);
  });

  it('el resumen deja constancia de que corrió en modo prueba', async () => {
    process.env.ABANDONED_CART_TEST_EMAIL = 'mariano@example.com';
    carritos = [carrito('mariano@example.com', haceHoras(5))];
    const res = await correrCron();
    expect(await res.json()).toMatchObject({ modoPrueba: 'mariano@example.com' });
  });
});

describe('carrito abandonado — tope por corrida (la copia no lo cubría)', () => {
  it('no manda más de ABANDONED_CART_MAX_PER_RUN mails', async () => {
    process.env.ABANDONED_CART_MAX_PER_RUN = '2';
    carritos = ['a', 'b', 'c', 'd'].map((n) => carrito(`${n}@example.com`, haceHoras(5)));

    const res = await correrCron();
    expect(sendAbandonedCartEmail).toHaveBeenCalledTimes(2);
    expect(await res.json()).toMatchObject({ enviados: 2 });
  });

  it('los que quedaron afuera NO se marcan: los toma la corrida siguiente', async () => {
    process.env.ABANDONED_CART_MAX_PER_RUN = '2';
    carritos = ['a', 'b', 'c', 'd'].map((n) => carrito(`${n}@example.com`, haceHoras(5)));

    await correrCron();
    expect(marcarNotificado).toHaveBeenCalledTimes(2);
  });

  it('por defecto el tope es 25', async () => {
    carritos = Array.from({ length: 30 }, (_, i) => carrito(`c${i}@example.com`, haceHoras(5)));
    await correrCron();
    expect(sendAbandonedCartEmail).toHaveBeenCalledTimes(25);
  });
});

describe('carrito abandonado — varios carritos a la vez', () => {
  it('cada uno recibe el trato que le corresponde', async () => {
    bajas.add('baja@example.com');
    carritos = [
      carrito('reciente@example.com', haceHoras(1)), // muy nuevo → saltear
      carrito('listo@example.com', haceHoras(5)), // → enviar
      carrito('viejo@example.com', haceHoras(80)), // → purgar
      carrito('ya@example.com', haceHoras(5), { notifiedAt: haceHoras(1) }), // → saltear
      carrito('baja@example.com', haceHoras(5)) // → saltear
    ];

    const res = await correrCron();
    expect(mailsEnviadosA()).toEqual(['listo@example.com']);
    expect(purgadosA()).toEqual(['viejo@example.com']);
    expect(await res.json()).toMatchObject({ total: 5, enviados: 1, purgados: 1, salteados: 3 });
  });
});
