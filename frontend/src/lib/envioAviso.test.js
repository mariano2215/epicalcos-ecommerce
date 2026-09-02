/**
 * El ENVÍO del aviso de pedido (netlify/functions/lib/notify.js).
 *
 * `avisoPedido.test.js` cubre QUÉ dice el mail; esto cubre que SALGA. Es la otra
 * mitad del mismo problema: el pedido por transferencia no tiene webhook que
 * reintente, Blobs no persiste nada en runtime, y con eso el mail es el único
 * registro que queda de una venta. Un POST fallido a Resend era una venta
 * perdida en silencio.
 *
 * Todo con `fetch` mockeado: la suite no manda mails de verdad.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendOrderEmail, sendCustomerEmail, notifyOrder } from '../../../netlify/functions/lib/notify.js';

const pedido = {
  orderId: 'EPI-1788310159899-5m8v5',
  name: 'Manuel Vallejos',
  email: 'manuelvjos20@gmail.com',
  phone: '3416806675',
  address: 'Córdoba 1234',
  city: 'Rosario',
  province: 'Santa Fe',
  zipCode: '2000',
  shippingMethod: 'Envío a Rosario',
  shippingCost: 4500,
  comments: '',
  items: [{ id: 'sticker:disney-3:6cm', title: 'Disney #3 · 6 cm', quantity: 1, unit_price: 1600 }],
  itemsTotal: 1600,
  total: 6100,
  paymentMethod: 'transferencia',
  paymentStatus: 'pendiente_transferencia'
};

/** Respuesta de Resend. `ok:false` con el status que se quiera simular. */
const respuesta = (status = 200, body = { id: 'resend-1' }) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body)
});

/** Cuerpo JSON del intento `n` (0-based) que recibió Resend. */
const cuerpo = (n = 0) => JSON.parse(fetch.mock.calls[n][1].body);
const cabeceras = (n = 0) => fetch.mock.calls[n][1].headers;

beforeEach(() => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.NOTIFY_EMAIL_FROM = 'EPICALCOS <hola@epicalcos.com>';
  process.env.NOTIFY_EMAIL_TO = 'epicalcos@gmail.com';
  vi.stubGlobal('fetch', vi.fn());
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('un fallo transitorio de Resend no cuesta un pedido', () => {
  it('reintenta el 429 del rate limit y el aviso termina saliendo', async () => {
    // Los dos mails del pedido salen a la vez y Resend permite 2 req/s: el 429
    // llegaba justo ahí y el aviso se perdía para siempre.
    fetch.mockResolvedValueOnce(respuesta(429)).mockResolvedValueOnce(respuesta(200));

    const r = await sendOrderEmail(pedido);

    expect(r.sent).toBe(true);
    expect(r.intentos).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reintenta un 500 de Resend', async () => {
    fetch.mockResolvedValueOnce(respuesta(500)).mockResolvedValueOnce(respuesta(200));

    await expect(sendOrderEmail(pedido)).resolves.toMatchObject({ sent: true });
  });

  it('reintenta cuando la red se cae en el medio', async () => {
    fetch.mockRejectedValueOnce(new Error('fetch failed')).mockResolvedValueOnce(respuesta(200));

    await expect(sendOrderEmail(pedido)).resolves.toMatchObject({ sent: true });
  });

  it('NO reintenta un 422: la dirección inválida no se arregla insistiendo', async () => {
    fetch.mockResolvedValue(respuesta(422, { message: 'Invalid `to` field' }));

    const r = await sendOrderEmail(pedido);

    expect(r.sent).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('después de agotar los intentos devuelve el fallo, no lanza', async () => {
    fetch.mockResolvedValue(respuesta(503));

    const r = await sendOrderEmail(pedido);

    expect(r.sent).toBe(false);
    expect(r.reason).toBe('resend_503');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('con el deadline vencido no arranca ningún intento', async () => {
    fetch.mockResolvedValue(respuesta(200));

    const r = await sendOrderEmail(pedido, { deadline: Date.now() - 1 });

    expect(r.sent).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('los reintentos no duplican mails', () => {
  it('cada mail del pedido viaja con su Idempotency-Key', async () => {
    // Mercado Pago notifica el mismo pago varias veces y el dedup vivía en
    // Blobs, que no persiste: sin esta clave el cliente recibía la confirmación
    // dos y tres veces.
    fetch.mockResolvedValue(respuesta(200));

    await sendOrderEmail(pedido);
    await sendCustomerEmail(pedido);

    expect(cabeceras(0)['Idempotency-Key']).toBe(`interno-${pedido.orderId}`);
    expect(cabeceras(1)['Idempotency-Key']).toBe(`cliente-${pedido.orderId}`);
  });
});

describe('nada del contenido puede voltear el envío', () => {
  it('un pedido con items rotos igual manda el aviso, degradado', async () => {
    fetch.mockResolvedValue(respuesta(200));
    // `items` no iterable: antes esto lanzaba ANTES del fetch, se propagaba
    // hasta el handler y el cliente veía un 500 sin que saliera ningún mail.
    const roto = { ...pedido, items: 'no-es-una-lista' };

    const r = await sendOrderEmail(roto);

    expect(r.sent).toBe(true);
    expect(cuerpo(0).subject).toContain(pedido.orderId);
  });

  it('al cliente NO se le manda el mail degradado', async () => {
    fetch.mockResolvedValue(respuesta(200));

    const r = await sendCustomerEmail({ ...pedido, items: 'no-es-una-lista' });

    expect(r.sent).toBe(false);
    expect(r.reason).toBe('build_failed');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('si el cliente se queda sin confirmación, EPICALCOS se entera', () => {
  it('manda una alerta al mail interno cuando falla solo el mail al cliente', async () => {
    // 1º aviso interno OK · 2º confirmación al cliente falla (422, sin reintento)
    // · 3º la alerta.
    fetch
      .mockResolvedValueOnce(respuesta(200))
      .mockResolvedValueOnce(respuesta(422, { message: 'Invalid `to` field' }))
      .mockResolvedValueOnce(respuesta(200));

    const r = await notifyOrder(pedido);

    expect(r.email.sent).toBe(true);
    expect(r.customerEmail.sent).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(3);
    const alerta = cuerpo(2);
    expect(alerta.to).toEqual(['epicalcos@gmail.com']);
    expect(alerta.subject).toContain(pedido.email);
    expect(alerta.text).toContain(pedido.orderId);
  });

  it('un pedido sin mail de cliente no dispara la alerta', async () => {
    fetch.mockResolvedValue(respuesta(200));

    const r = await notifyOrder({ ...pedido, email: '—' });

    expect(r.email.sent).toBe(true);
    expect(r.customerEmail.reason).toBe('no_customer_email');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('notifyOrder nunca lanza, ni con Resend caído', async () => {
    fetch.mockRejectedValue(new Error('ECONNRESET'));

    const r = await notifyOrder(pedido);

    expect(r.email.sent).toBe(false);
    expect(r.customerEmail.sent).toBe(false);
  });
});

describe('sin configuración no se rompe nada', () => {
  it('sin RESEND_API_KEY no llama a Resend y lo dice', async () => {
    delete process.env.RESEND_API_KEY;

    const r = await sendOrderEmail(pedido);

    expect(r).toMatchObject({ sent: false, reason: 'no_api_key' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('con el remitente de prueba de Resend no se le escribe al cliente', async () => {
    delete process.env.NOTIFY_EMAIL_FROM;

    const r = await sendCustomerEmail(pedido);

    expect(r).toMatchObject({ sent: false, reason: 'unverified_sender' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
