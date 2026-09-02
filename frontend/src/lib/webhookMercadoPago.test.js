/**
 * El webhook de Mercado Pago (netlify/functions/mercadopago-webhook.js).
 *
 * Cubre UNA invariante: si Mercado Pago avisa que un pago quedó aprobado, los
 * dos mails salen. No importa que Blobs esté caído, que Meta CAPI se cuelgue o
 * que el CRM no conteste — todo eso es accesorio y el aviso del pedido no.
 *
 * El webhook nunca se había testeado y es el camino de la mitad de las ventas.
 *
 * No se mockean módulos: los archivos de `netlify/functions` viven fuera del
 * root de Vitest y `vi.mock` no los alcanza. Se intercepta `fetch` y se rutea
 * por dominio, que además prueba el SDK de Mercado Pago de verdad.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from '../../../netlify/functions/mercadopago-webhook.js';

const pagoAprobado = {
  id: 176793258104,
  status: 'approved',
  external_reference: 'EPI-1788310159899-5m8v5',
  transaction_amount: 22100,
  payer: { email: 'cuenta-de-otro@gmail.com' },
  metadata: {
    buyer_name: 'Manuel Vallejos',
    buyer_email: 'manuelvjos20@gmail.com',
    buyer_phone: '3416806675',
    shipping_method: 'Envío a Rosario',
    shipping_cost: 4500
  },
  additional_info: {
    items: [{ id: 'sticker:disney-3:6cm', title: 'Disney #3 · 6 cm', quantity: '2', unit_price: '1600' }]
  }
};

const respuesta = (body) => ({
  ok: true,
  status: 200,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
  text: async () => JSON.stringify(body)
});

/** Cuerpos de los mails que se le mandaron a Resend. */
const mailsEnviados = () =>
  fetch.mock.calls
    .filter(([url]) => String(url).includes('api.resend.com'))
    .map(([, opciones]) => JSON.parse(opciones.body));

/**
 * Rutea `fetch` por dominio. `metaCuelga` simula Graph sin responder nunca:
 * es lo que se comía los 10 s de la función antes de que el mail fuera primero.
 */
const stubFetch = ({ pago = pagoAprobado, metaCuelga = false } = {}) =>
  vi.fn(async (url) => {
    const u = String(url);
    if (u.includes('api.mercadopago.com')) return respuesta(pago);
    if (u.includes('facebook.com')) {
      if (metaCuelga) return new Promise(() => {});
      return respuesta({ events_received: 1 });
    }
    return respuesta({ id: 'resend-1' });
  });

beforeEach(() => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token';
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

const notificacion = () => ({
  httpMethod: 'POST',
  headers: {},
  queryStringParameters: {},
  body: JSON.stringify({ type: 'payment', data: { id: '176793258104' } })
});

describe('un pago aprobado siempre termina en dos mails', () => {
  it('manda el aviso interno y la confirmación al cliente', async () => {
    vi.stubGlobal('fetch', stubFetch());

    const res = await handler(notificacion());

    expect(res.statusCode).toBe(200);
    const mails = mailsEnviados();
    expect(mails).toHaveLength(2);

    const interno = mails.find((m) => m.subject.includes('Nuevo pedido'));
    const cliente = mails.find((m) => m.subject.includes('Pedido confirmado'));
    expect(interno.to).toEqual(['epicalcos@gmail.com']);
    // Al mail del checkout, no al de la cuenta de MP con la que se pagó.
    expect(cliente.to).toEqual(['manuelvjos20@gmail.com']);
  });

  it('con Blobs caído el aviso igual dice QUÉ se vendió', async () => {
    vi.stubGlobal('fetch', stubFetch());

    await handler(notificacion());

    const interno = mailsEnviados().find((m) => m.subject.includes('Nuevo pedido'));
    expect(interno.text).toContain('Disney #3 · 6 cm');
  });

  it('los mails salen aunque Meta CAPI no conteste nunca', async () => {
    process.env.META_CAPI_TOKEN = 'token';
    process.env.META_PIXEL_ID = '123';
    vi.stubGlobal('fetch', stubFetch({ metaCuelga: true }));

    const res = await handler(notificacion());

    expect(res.statusCode).toBe(200);
    expect(mailsEnviados()).toHaveLength(2);
  });

  it('los reintentos de MP no duplican: cada mail lleva su Idempotency-Key', async () => {
    vi.stubGlobal('fetch', stubFetch());

    await handler(notificacion());

    const claves = fetch.mock.calls
      .filter(([url]) => String(url).includes('api.resend.com'))
      .map(([, o]) => o.headers['Idempotency-Key']);
    expect(claves).toContain(`interno-${pagoAprobado.external_reference}`);
    expect(claves).toContain(`cliente-${pagoAprobado.external_reference}`);
  });

  it('un pago rechazado no le manda nada al cliente', async () => {
    vi.stubGlobal('fetch', stubFetch({ pago: { ...pagoAprobado, status: 'rejected' } }));

    await handler(notificacion());

    expect(mailsEnviados()).toHaveLength(0);
  });
});
