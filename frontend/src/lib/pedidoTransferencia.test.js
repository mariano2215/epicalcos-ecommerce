/**
 * El alta de un pedido por TRANSFERENCIA (netlify/functions/create-order-transfer.js).
 *
 * Es el camino más frágil de los dos: no hay webhook que reintente y Blobs no
 * persiste nada, así que el mail es la ÚNICA constancia de la venta. Antes el
 * mail salía último, detrás de Notion, Blobs y el webhook del CRM, y dentro del
 * mismo try: cualquiera de esas tres podía dejar el pedido sin avisar.
 *
 * `fetch` se rutea por dominio (ver webhookMercadoPago.test.js para el porqué
 * de no usar vi.mock).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from '../../../netlify/functions/create-order-transfer.js';

const respuesta = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
  text: async () => JSON.stringify(body)
});

const pedido = () => ({
  httpMethod: 'POST',
  headers: { origin: 'https://epicalcos.com' },
  body: JSON.stringify({
    items: [{ id: 'sticker:disney-3:6cm', title: 'Disney #3 · 6 cm', quantity: 2, unit_price: 1600 }],
    payer: {
      name: 'Manuel Vallejos',
      email: 'manuelvjos20@gmail.com',
      phone: '3416806675',
      address: 'Córdoba 1234'
    },
    shipping: { methodValue: 'retiro' }
  })
});

const mails = () =>
  fetch.mock.calls
    .filter(([url]) => String(url).includes('api.resend.com'))
    .map(([, o]) => JSON.parse(o.body));

beforeEach(() => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.NOTIFY_EMAIL_FROM = 'EPICALCOS <hola@epicalcos.com>';
  process.env.NOTIFY_EMAIL_TO = 'epicalcos@gmail.com';
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('un pedido por transferencia avisa siempre', () => {
  it('manda el aviso interno y la confirmación al cliente, y devuelve el pedido', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ id: 'resend-1' })));

    const res = await handler(pedido());
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.orderId).toMatch(/^EPI-/);
    expect(body.total).toBe(3200);
    expect(body.notified).toEqual({ interno: true, cliente: true });

    const enviados = mails();
    expect(enviados.find((m) => m.subject.includes('Nuevo pedido')).to).toEqual(['epicalcos@gmail.com']);
    expect(enviados.find((m) => m.subject.includes('Pedido confirmado')).to).toEqual(['manuelvjos20@gmail.com']);
  });

  it('el mail sale ANTES que el webhook del CRM', async () => {
    // El orden importa: el CRM tarda ~2 s y no siempre contesta. Cuando el mail
    // iba después, ese tiempo salía del presupuesto de la función.
    process.env.CRM_WEBHOOK_URL = 'https://app.epicalcos.com/api/webhooks/website-order';
    process.env.CRM_WEBHOOK_SECRET = 'secreto';
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ ok: true })));

    await handler(pedido());

    const dominios = fetch.mock.calls.map(([url]) =>
      String(url).includes('resend') ? 'resend' : 'crm'
    );
    expect(dominios.indexOf('resend')).toBeLessThan(dominios.indexOf('crm'));
  });

  it('el pedido entra igual aunque el CRM se caiga', async () => {
    process.env.CRM_WEBHOOK_URL = 'https://app.epicalcos.com/api/webhooks/website-order';
    process.env.CRM_WEBHOOK_SECRET = 'secreto';
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('resend')) return respuesta({ id: 'resend-1' });
      throw new Error('CRM caído');
    }));

    const res = await handler(pedido());

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).notified.interno).toBe(true);
  });

  it('si NADIE se enteró del pedido, no le dice "listo" al cliente', async () => {
    // Sin mail y sin CRM el pedido no existe en ningún lado: Blobs no persiste
    // y la transferencia no tiene webhook. Un 200 acá es una venta perdida en
    // silencio — que es exactamente lo que venía pasando.
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ message: 'service unavailable' }, 503)));

    const res = await handler(pedido());

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toBe('notify_failed');
    expect(JSON.parse(res.body).message).toContain('WhatsApp');
  });

  it('un pedido con precios adulterados se rechaza antes de mandar nada', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ id: 'resend-1' })));
    const adulterado = {
      ...pedido(),
      body: JSON.stringify({
        items: [{ id: 'sticker:disney-3:6cm', title: 'Disney', quantity: 2, unit_price: 1 }],
        payer: { name: 'Test', email: 'test@test.com', phone: '1', address: 'x' },
        shipping: { methodValue: 'retiro' }
      })
    };

    const res = await handler(adulterado);

    expect(res.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
