/**
 * El canario de Netlify Blobs (netlify/functions/canario-blobs.js).
 *
 * Blobs estuvo caído más de un mes sin que nadie se enterara. Este chequeo
 * diario existe para que no vuelva a pasar, así que lo que hay que probar es
 * justamente que SEPA FALLAR: que detecte el problema y que la alarma salga.
 * Un canario que no canta es peor que ninguno, porque da tranquilidad falsa.
 *
 * Sin credenciales de Blobs (el setup de la suite las borra), `getStore()` tira
 * `MissingBlobsEnvironmentError` — que es exactamente el fallo de julio. O sea
 * que el escenario roto sale gratis y sin mocks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { probarBlobs, config } from '../../../netlify/functions/canario-blobs.js';
import handler from '../../../netlify/functions/canario-blobs.js';

const respuesta = (body = { id: 'resend-1' }, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body)
});

const mails = () =>
  fetch.mock.calls
    .filter(([url]) => String(url).includes('api.resend.com'))
    .map(([, o]) => ({ cuerpo: JSON.parse(o.body), headers: o.headers }));

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('el canario detecta el fallo que se nos escapó un mes', () => {
  it('sin credenciales de Blobs, falla al abrir el store', async () => {
    const r = await probarBlobs();

    expect(r.ok).toBe(false);
    // La etapa es la mitad del diagnóstico: dice DÓNDE se rompió.
    expect(r.etapa).toBe('abrir_store');
    expect(r.detalle).toBeTruthy();
  });

  it('nunca lanza: un canario que revienta no avisa nada', async () => {
    await expect(probarBlobs()).resolves.toHaveProperty('ok');
  });
});

describe('la alarma', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.NOTIFY_EMAIL_FROM = 'EPICALCOS <hola@epicalcos.com>';
    process.env.NOTIFY_EMAIL_TO = 'epicalcos@gmail.com';
    vi.stubGlobal('fetch', vi.fn(async () => respuesta()));
  });

  it('con Blobs roto manda UN mail a la casilla interna y responde 500', async () => {
    const res = await handler();

    expect(res.status).toBe(500);
    const enviados = mails();
    expect(enviados).toHaveLength(1);
    expect(enviados[0].cuerpo.to).toEqual(['epicalcos@gmail.com']);
    expect(enviados[0].cuerpo.subject).toContain('Blobs');
  });

  it('la alarma explica qué hacer, no solo que algo falló', async () => {
    await handler();
    const texto = mails()[0].cuerpo.text;

    // Un aviso que dice "error" y nada más obliga a reconstruir el diagnóstico
    // entero justo cuando hay apuro.
    expect(texto).toContain('NETLIFY_BLOBS_TOKEN');
    expect(texto).toContain('Personal access');
    // Y tiene que aclarar lo más importante: que las ventas NO se pierden.
    expect(texto).toMatch(/mails de pedido SIGUEN saliendo/i);
  });

  it('se manda una sola alarma por día aunque el canario corra de más', async () => {
    const hoy = new Date().toISOString().slice(0, 10);

    await handler();
    await handler();

    // Las dos llamadas van con la MISMA clave: Resend deduplica y manda una.
    const claves = mails().map((m) => m.headers['Idempotency-Key']);
    expect(claves).toEqual([`canario-blobs-${hoy}`, `canario-blobs-${hoy}`]);
  });

  it('si Resend también está caído, el canario responde igual y no lanza', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));

    const res = await handler();

    expect(res.status).toBe(500);
    expect(JSON.parse(await res.text()).aviso).toBe(false);
  });
});

describe('la programación', () => {
  it('corre una vez por día', () => {
    expect(config.schedule).toBe('@daily');
  });
});
