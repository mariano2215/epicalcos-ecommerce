/**
 * Espejo de normalización de PII para Meta — spec 003, P5.
 *
 * ─── EL ESPEJO QUE NADIE VERIFICABA ───────────────────────────────────────────
 * La misma normalización está escrita DOS veces:
 *   · `frontend/src/lib/advancedMatching.js` → coincidencias avanzadas del Píxel
 *   · `netlify/functions/lib/metaCapi.js`    → user_data de la API de conversiones
 *
 * Los dos tienen su propio `clean`, `cleanName`, `cleanToken`, `normalizePhone` y
 * `splitName`. Si se separan, el Píxel y la CAPI mandan hashes distintos para la
 * MISMA persona: Meta deja de reconocerla, la calidad de matching cae y la
 * deduplicación del Purchase empeora. Nada de eso tira un error — es otra falla
 * silenciosa, como las de las fases 1 y 2.
 *
 * ─── CÓMO SE COMPARA SIN TOCAR PRODUCCIÓN ─────────────────────────────────────
 * El servidor no exporta sus helpers (son privados del módulo), así que en vez
 * de importarlos se compara el RESULTADO OBSERVABLE, que es lo que de verdad
 * importa: se llama a `sendPurchaseEvent` con `fetch` mockeado y se lee el
 * `user_data` que le habría mandado a Meta.
 *
 * El frontend devuelve los valores NORMALIZADOS EN CLARO (Meta los hashea en el
 * navegador); el servidor los manda ya hasheados. Por eso la comparación es
 * `sha256(valor del frontend) === valor del servidor`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { buildAdvancedMatching } from './advancedMatching.js';
import { sendPurchaseEvent } from '../../../netlify/functions/lib/metaCapi.js';

const sha256 = (v) => createHash('sha256').update(v).digest('hex');

let capturado = null;

beforeEach(() => {
  capturado = null;
  process.env.META_CAPI_TOKEN = 'token-de-prueba';
  process.env.META_PIXEL_ID = '000000000000000';
  delete process.env.META_CAPI_TEST_CODE;
  vi.stubGlobal('fetch', async (_url, opts) => {
    capturado = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ events_received: 1 }) };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.META_CAPI_TOKEN;
  delete process.env.META_PIXEL_ID;
});

/** user_data que el servidor le manda a Meta para ese comprador. */
async function userDataDelServidor({ payer, shipping }) {
  const res = await sendPurchaseEvent({
    orderId: 'EPI-1754920000000-a3f9x',
    order: { payer, shipping, items: [], total: 5999 },
    payment: { transaction_amount: 5999, date_approved: '2026-08-11T18:00:00.000Z' }
  });
  expect(res.sent).toBe(true);
  return capturado.data[0].user_data;
}

/**
 * Compradores de prueba. Sin PII real: todo `example.com` y datos inventados,
 * elegidos para tocar cada rama de la normalización.
 */
const compradores = [
  {
    caso: 'simple',
    payer: { name: 'Ana Perez', email: 'ana@example.com', phone: '3411234567' },
    shipping: { city: 'Rosario', province: 'Santa Fe', zipCode: '2000' }
  },
  {
    caso: 'con acentos y mayúsculas',
    payer: { name: '  ANA MARÍA Pérez-López ', email: '  ANA@Example.COM ', phone: '341 123-4567' },
    shipping: { city: 'Córdoba', province: 'Entre Ríos', zipCode: ' 2000 ' }
  },
  {
    caso: 'teléfono con 0 adelante',
    payer: { name: 'Juan', email: 'juan@example.com', phone: '03414567890' },
    shipping: { city: 'Funes', province: 'Santa Fe', zipCode: '2132' }
  },
  {
    caso: 'teléfono que YA trae el 54',
    payer: { name: 'Juan', email: 'juan@example.com', phone: '+54 9 341 680-6675' },
    shipping: { city: 'Villa Gobernador Gálvez', province: 'Santa Fe', zipCode: '2124' }
  },
  {
    caso: 'apellido compuesto',
    payer: { name: 'María de los Ángeles Del Valle', email: 'm@example.com', phone: '1122334455' },
    shipping: { city: 'Ciudad Autónoma de Buenos Aires', province: 'Buenos Aires', zipCode: 'C1425' }
  },
  {
    caso: 'campos vacíos',
    payer: { name: '', email: 'x@example.com', phone: '' },
    shipping: { city: '', province: '', zipCode: '' }
  }
];

describe('espejo de normalización de Meta: Píxel ↔ CAPI (spec 003)', () => {
  for (const { caso, payer, shipping } of compradores) {
    it(`hashea lo mismo de los dos lados — ${caso}`, async () => {
      const cliente = buildAdvancedMatching({ payer, shipping });
      const servidor = await userDataDelServidor({ payer, shipping });

      // Cada valor que el Píxel manda en claro tiene que ser, hasheado, el mismo
      // que manda la CAPI.
      for (const [clave, valorEnClaro] of Object.entries(cliente)) {
        expect(servidor[clave], `falta "${clave}" en el user_data del servidor`).toBeDefined();
        expect(servidor[clave][0], `"${clave}" no coincide entre Píxel y CAPI`).toBe(sha256(valorEnClaro));
      }
    });
  }

  it('los dos lados mandan exactamente las MISMAS claves', async () => {
    const { payer, shipping } = compradores[0];
    const cliente = Object.keys(buildAdvancedMatching({ payer, shipping })).sort();
    const servidor = await userDataDelServidor({ payer, shipping });
    // El servidor suma señales de navegador (fbp/fbc/ip/ua) que el Píxel ya tiene
    // por su cuenta: se comparan solo las de PII.
    const soloPii = Object.keys(servidor).filter((k) => Array.isArray(servidor[k])).sort();
    expect(soloPii).toEqual(cliente);
  });

  it('un campo vacío no se manda de ningún lado (ni hash de string vacío)', async () => {
    const payer = { name: '', email: 'x@example.com', phone: '' };
    const shipping = { city: '', province: '', zipCode: '' };
    const cliente = buildAdvancedMatching({ payer, shipping });
    const servidor = await userDataDelServidor({ payer, shipping });

    for (const clave of ['ph', 'fn', 'ln', 'ct', 'st', 'zp']) {
      expect(cliente[clave]).toBeUndefined();
      expect(servidor[clave]).toBeUndefined();
    }
    expect(servidor.em[0]).toBe(sha256('x@example.com'));
  });

  it('los dos ponen country = ar', async () => {
    const { payer, shipping } = compradores[0];
    expect(buildAdvancedMatching({ payer, shipping }).country).toBe('ar');
    const servidor = await userDataDelServidor({ payer, shipping });
    expect(servidor.country[0]).toBe(sha256('ar'));
  });
});

describe('CAPI: dedup y no-op (spec 003)', () => {
  it('el event_id es purchase-{orderId}: el mismo que dispara el Píxel', async () => {
    await userDataDelServidor(compradores[0]);
    expect(capturado.data[0].event_id).toBe('purchase-EPI-1754920000000-a3f9x');
    expect(capturado.data[0].event_name).toBe('Purchase');
  });

  it('el event_time es la hora del PAGO, no la del envío', async () => {
    await userDataDelServidor(compradores[0]);
    const esperado = Math.floor(Date.parse('2026-08-11T18:00:00.000Z') / 1000);
    expect(capturado.data[0].event_time).toBe(esperado);
  });

  it('sin token es no-op: no se llama a Meta', async () => {
    delete process.env.META_CAPI_TOKEN;
    const res = await sendPurchaseEvent({ orderId: 'EPI-1', order: {}, payment: {} });
    expect(res).toEqual({ sent: false, reason: 'not_configured' });
    expect(capturado).toBeNull();
  });

  it('sin orderId no manda nada (sin clave de dedup no sirve)', async () => {
    const res = await sendPurchaseEvent({ orderId: '', order: {}, payment: {} });
    expect(res).toEqual({ sent: false, reason: 'no_order_id' });
    expect(capturado).toBeNull();
  });

  it('si Meta rechaza, devuelve el motivo y NUNCA lanza', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'bad token' } })
    }));
    const res = await sendPurchaseEvent({ orderId: 'EPI-1', order: {}, payment: {} });
    expect(res).toEqual({ sent: false, reason: 'http_400' });
  });

  it('si la red falla, devuelve exception y NUNCA lanza', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('sin red');
    });
    await expect(
      sendPurchaseEvent({ orderId: 'EPI-1', order: {}, payment: {} })
    ).resolves.toEqual({ sent: false, reason: 'exception' });
  });
});
