/**
 * El popup entregando el pack sorpresa (netlify/functions/capture-lead.js, spec 025).
 *
 * Lo que más importa acá no es el camino nuevo sino el VIEJO: el día del deploy
 * hay navegadores con el bundle anterior cargado, que muestran "10 % OFF" y
 * esperan un código. Ese request llega sin `oferta` y tiene que seguir
 * recibiendo EPICA10 — lo que su pantalla le prometió. Si eso se rompe, la
 * promo nueva le corta el descuento a gente que ya lo estaba viendo.
 *
 * `fetch` se rutea por dominio (ver webhookMercadoPago.test.js para el porqué
 * de no usar vi.mock).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from '../../../netlify/functions/capture-lead.js';
import { REGALO_BIENVENIDA } from '../../../netlify/functions/lib/pricing.js';

const LEAD = 'ana@example.com';

const respuesta = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
  text: async () => JSON.stringify(body)
});

const request = (body) => ({
  httpMethod: 'POST',
  headers: { origin: 'https://epicalcos.com' },
  body: JSON.stringify(body)
});

const mails = () =>
  fetch.mock.calls
    .filter(([url]) => String(url).includes('api.resend.com'))
    .map(([, o]) => JSON.parse(o.body));

/** Los mails que salieron AL LEAD (no los avisos internos a EPICALCOS). */
const mailsAlLead = () => mails().filter((m) => (m.to || []).includes(LEAD));

beforeEach(() => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.NOTIFY_EMAIL_FROM = 'EPICALCOS <hola@epicalcos.com>';
  process.env.NOTIFY_EMAIL_TO = 'epicalcos@gmail.com';
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async () => respuesta({ id: 'resend-1' })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('compatibilidad con el bundle viejo', () => {
  it('SIN `oferta` devuelve EPICA10, como antes de la spec 025', async () => {
    const res = await handler(request({ email: LEAD }));
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body).toMatchObject({ ok: true, oferta: 'cupon', code: 'EPICA10' });
  });

  it('y le manda el cupón por mail, como antes', async () => {
    await handler(request({ email: LEAD }));

    expect(mailsAlLead().some((m) => m.subject.includes('EPICA10'))).toBe(true);
  });
});

describe('con `oferta: regalo`', () => {
  it('entrega el pack y lo dice en la respuesta', async () => {
    const res = await handler(request({ email: LEAD, oferta: 'regalo' }));
    const body = JSON.parse(res.body);

    expect(body).toMatchObject({ ok: true, oferta: 'regalo', regalo: 'pack_sorpresa' });
    expect(body.code).toBeUndefined();
  });

  it('NO le manda ningún mail al lead (P-3)', async () => {
    // El pack vive en el navegador donde dejó el mail; el link de un mail abre
    // otro navegador, sin el regalo. Prometérselo por mail sería prometer algo
    // que esa pantalla no puede mostrar.
    await handler(request({ email: LEAD, oferta: 'regalo' }));

    expect(mailsAlLead()).toHaveLength(0);
  });

  it('el aviso interno dice que se ganó el pack, no el 10 %', async () => {
    await handler(request({ email: LEAD, oferta: 'regalo' }));

    const interno = mails().find((m) => m.subject.includes('Nuevo lead'));
    expect(interno.subject).toContain('pack sorpresa');
    expect(interno.text).toContain('pack de stickers sorpresa');
    expect(interno.text).not.toContain('EPICA10');
  });

  it('con el interruptor APAGADO devuelve el cupón, no el regalo', async () => {
    // El popup elige la pantalla por la respuesta justamente para esto: nunca
    // muestra un regalo que el servidor no va a poner en la caja.
    const antes = REGALO_BIENVENIDA.activa;
    try {
      REGALO_BIENVENIDA.activa = false;
      const body = JSON.parse((await handler(request({ email: LEAD, oferta: 'regalo' }))).body);

      expect(body).toMatchObject({ oferta: 'cupon', code: 'EPICA10' });
    } finally {
      REGALO_BIENVENIDA.activa = antes;
    }
  });
});

describe('validación', () => {
  it('un mail inválido sigue siendo 400', async () => {
    const res = await handler(request({ email: 'no-es-un-mail', oferta: 'regalo' }));

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('email_invalid');
  });

  it('si todo lo interno falla, igual devuelve lo que se ganó', async () => {
    // La promo no depende de que Resend/Notion/CRM hayan contestado.
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('todo caído');
    }));

    const body = JSON.parse((await handler(request({ email: LEAD, oferta: 'regalo' }))).body);

    expect(body).toMatchObject({ ok: true, oferta: 'regalo', regalo: 'pack_sorpresa' });
  });
});
