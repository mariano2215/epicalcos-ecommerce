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
    // ⚠️ `marvel` y NO `disney`, y 2 unidades y no 3: este test es sobre los
    // AVISOS, no sobre precios, así que el carrito tiene que ser uno al que no
    // le corra ninguna promo. Con la spec 017, 2 calcos de disney son un 2x1
    // (el server esperaría $800) y 3 de cualquier categoría son un 3x2 — el
    // pedido se caía con price_mismatch y el test fallaba por el motivo
    // equivocado, tapando lo que de verdad mira.
    items: [{ id: 'sticker:marvel-3:6cm', title: 'Marvel #3 · 6 cm', quantity: 2, unit_price: 1600 }],
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
        items: [{ id: 'sticker:marvel-3:6cm', title: 'Marvel', quantity: 2, unit_price: 1 }],
        payer: { name: 'Test', email: 'test@test.com', phone: '1', address: 'x' },
        shipping: { methodValue: 'retiro' }
      })
    };

    const res = await handler(adulterado);

    expect(res.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});

/**
 * El pack sorpresa en un pedido por transferencia (spec 025).
 *
 * Es el camino donde más importa que se vea: sin webhook de confirmación, el
 * mail interno es la única constancia de la venta, y si ahí el pack no aparece
 * la caja sale sin él. El regalo tampoco puede mover un solo número del pedido.
 */
const pedidoConRegalo = (emitidoEn = Date.now()) => {
  const base = pedido();
  return { ...base, body: JSON.stringify({ ...JSON.parse(base.body), regaloEmitidoEn: emitidoEn }) };
};

describe('pack sorpresa', () => {
  it('el mail interno lo destaca arriba y lo lista como GRATIS', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ id: 'resend-1' })));

    await handler(pedidoConRegalo());

    const interno = mails().find((m) => m.subject.includes('Nuevo pedido'));
    // La banda, arriba de la tabla: una línea más entre 30 es justo lo que se
    // pasa por alto cuando hay diez pedidos para armar.
    expect(interno.html).toContain('INCLUIR PACK SORPRESA');
    expect(interno.text).toContain('INCLUIR PACK SORPRESA');
    // Y la línea, que dice GRATIS y no "$ 0".
    expect(interno.html).toContain('Pack de stickers sorpresa');
    expect(interno.html).toContain('GRATIS');
    expect(interno.text).toContain('Pack de stickers sorpresa (regalo) x1 — GRATIS');
  });

  it('la línea del pack aparece UNA sola vez en el pedido', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ id: 'resend-1' })));

    await handler(pedidoConRegalo());

    const interno = mails().find((m) => m.subject.includes('Nuevo pedido'));
    const veces = (interno.text.match(/Pack de stickers sorpresa/g) || []).length;
    expect(veces).toBe(1);
  });

  it('el mail al cliente también le dice que va el pack', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ id: 'resend-1' })));

    await handler(pedidoConRegalo());

    const cliente = mails().find((m) => m.subject.includes('Pedido confirmado'));
    expect(cliente.html).toContain('Pack de stickers sorpresa');
    expect(cliente.html).toContain('GRATIS');
  });

  it('⚠️ el total del pedido es el MISMO con regalo que sin él', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ id: 'resend-1' })));

    const conRegalo = JSON.parse((await handler(pedidoConRegalo())).body);
    const sinRegalo = JSON.parse((await handler(pedido())).body);

    expect(conRegalo.total).toBe(sinRegalo.total);
    expect(conRegalo.total).toBe(3200);
  });

  it('con la ventana vencida el pedido sale sin pack, y sale igual', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ id: 'resend-1' })));

    const res = await handler(pedidoConRegalo(Date.now() - 20 * 60 * 1000));

    expect(res.statusCode).toBe(200);
    const interno = mails().find((m) => m.subject.includes('Nuevo pedido'));
    expect(interno.html).not.toContain('INCLUIR PACK SORPRESA');
    expect(interno.html).not.toContain('Pack de stickers sorpresa');
  });

  it('un `regaloEmitidoEn` basura no voltea el pedido', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ id: 'resend-1' })));

    const res = await handler(pedidoConRegalo('no-es-un-numero'));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).total).toBe(3200);
  });

  it('el mail de un pedido SIN regalo sigue mostrando los precios de sus líneas', async () => {
    // Regresión de la regla "unit_price 0 → GRATIS": no puede volverse loca con
    // las líneas que sí cuestan (el mail de carrito abandonado usa lo mismo).
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ id: 'resend-1' })));

    await handler(pedido());

    const interno = mails().find((m) => m.subject.includes('Nuevo pedido'));
    expect(interno.text).toContain('Marvel #3 · 6 cm x2 — $ 3.200');
    expect(interno.html).not.toContain('GRATIS');
  });
});
