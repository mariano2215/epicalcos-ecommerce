/**
 * La preferencia de Mercado Pago con el pack sorpresa (spec 025).
 *
 * ⚠️ ESTE ES EL TEST QUE CUIDA LA DECISIÓN MÁS CARA DE LA SPEC. El regalo es
 * una línea a $0 dentro del pedido, y que Mercado Pago acepte un ítem a $0 NO
 * está documentado. Si lo rechazara, no se caería el regalo: se caería la
 * preferencia entera, o sea la venta. Por eso el pack va al pedido guardado y a
 * los canales internos pero NUNCA a los ítems que viajan a MP — y por eso esto
 * se verifica sobre lo que de verdad sale por la red.
 *
 * No se mockean módulos: los archivos de `netlify/functions` viven fuera del
 * root de Vitest y `vi.mock` no los alcanza. Se intercepta `fetch` y se rutea
 * por dominio, igual que en webhookMercadoPago.test.js y pedidoTransferencia.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from '../../../netlify/functions/create-preference.js';

const respuesta = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
  text: async () => JSON.stringify(body)
});

const pedido = (extra = {}) => ({
  httpMethod: 'POST',
  headers: { origin: 'https://epicalcos.com' },
  body: JSON.stringify({
    // `marvel` y 2 unidades: un carrito al que no le corre ninguna promo, para
    // que lo que se mida acá sea el regalo y no un reparto N x M.
    items: [{ id: 'sticker:marvel-3:6cm', title: 'Marvel #3 · 6 cm', quantity: 2, unit_price: 1600 }],
    payer: {
      name: 'Manuel Vallejos',
      email: 'manuelvjos20@gmail.com',
      phone: '3416806675',
      address: 'Córdoba 1234'
    },
    shipping: { methodValue: 'retiro' },
    ...extra
  })
});

/** El body que se le mandó a Mercado Pago al crear la preferencia. */
const preferenciaCreada = () =>
  JSON.parse(
    fetch.mock.calls.find(([url]) => String(url).includes('/checkout/preferences'))[1].body
  );

beforeEach(() => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token-de-prueba';
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (String(url).includes('api.mercadopago.com')) {
        return respuesta({ id: 'pref-1', init_point: 'https://mp/pagar', sandbox_init_point: 'https://mp/test' });
      }
      return respuesta({ ok: true });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
});

describe('el regalo nunca viaja a Mercado Pago', () => {
  it('con el pack ganado, la preferencia NO lleva ninguna línea `regalo:`', async () => {
    const res = await handler(pedido({ regaloEmitidoEn: Date.now() }));
    expect(res.statusCode).toBe(200);

    const pref = preferenciaCreada();
    expect(pref.items.some((i) => String(i.id).startsWith('regalo:'))).toBe(false);
    expect(pref.items.map((i) => i.id)).toEqual(['sticker:marvel-3:6cm']);
  });

  it('cobra exactamente lo mismo con regalo que sin él', async () => {
    await handler(pedido({ regaloEmitidoEn: Date.now() }));
    const con = preferenciaCreada().items;

    vi.mocked(fetch).mockClear();
    await handler(pedido());
    const sin = preferenciaCreada().items;

    expect(con).toEqual(sin);
  });

  it('lo deja anotado en la metadata, que es el plan B si Blobs se cae', async () => {
    await handler(pedido({ regaloEmitidoEn: Date.now() }));

    expect(preferenciaCreada().metadata.regalo).toBe('pack_sorpresa');
  });

  it('sin regalo no ensucia la metadata', async () => {
    await handler(pedido());

    expect(preferenciaCreada().metadata.regalo).toBeUndefined();
  });

  it('con la ventana vencida el pago se crea igual, sin pack', async () => {
    const res = await handler(pedido({ regaloEmitidoEn: Date.now() - 20 * 60 * 1000 }));

    expect(res.statusCode).toBe(200);
    expect(preferenciaCreada().metadata.regalo).toBeUndefined();
  });

  it('un `regaloEmitidoEn` basura no voltea el checkout', async () => {
    const res = await handler(pedido({ regaloEmitidoEn: { truco: true } }));

    expect(res.statusCode).toBe(200);
    expect(preferenciaCreada().metadata.regalo).toBeUndefined();
  });

  it('el pack es UNO por pedido, tenga las líneas que tenga', async () => {
    // 30 líneas: el regalo no se multiplica con el carrito. Se usan productos de
    // precio FIJO a propósito — 30 calcos dispararían el 3x2 y el pedido se
    // caería con price_mismatch por un motivo que este test no está mirando.
    const muchas = Array.from({ length: 30 }, () => ({
      id: 'fixed:tatuajes-hoja',
      title: 'Hoja de tatuajes',
      quantity: 1,
      unit_price: 12000
    }));
    const res = await handler({
      httpMethod: 'POST',
      headers: { origin: 'https://epicalcos.com' },
      body: JSON.stringify({
        items: muchas,
        payer: { name: 'Ana', email: 'ana@example.com', phone: '3411234567', address: 'Córdoba 1234' },
        shipping: { methodValue: 'retiro' },
        regaloEmitidoEn: Date.now()
      })
    });

    expect(res.statusCode).toBe(200);
    const pref = preferenciaCreada();
    expect(pref.items.filter((i) => String(i.id).startsWith('regalo:'))).toHaveLength(0);
    expect(pref.metadata.regalo).toBe('pack_sorpresa');
  });

  it('también lo lleva con envío a domicilio, no solo con retiro', async () => {
    const res = await handler(
      pedido({
        shipping: { methodValue: 'envio', city: 'Rosario', province: 'Santa Fe', zipCode: '2000' },
        regaloEmitidoEn: Date.now()
      })
    );

    expect(res.statusCode).toBe(200);
    const pref = preferenciaCreada();
    expect(pref.metadata.regalo).toBe('pack_sorpresa');
    // Y el envío se cobra igual: el regalo no lo toca.
    expect(pref.items.find((i) => i.id === 'shipping').unit_price).toBe(4500);
  });
});
