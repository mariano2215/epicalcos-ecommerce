/**
 * Verificación de la firma de los webhooks de Mercado Pago — spec 003, P1.
 *
 * ─── POR QUÉ ESTE ARCHIVO EXISTE ──────────────────────────────────────────────
 * Este módulo ya rompió producción una vez, y de la peor manera posible: en
 * silencio.
 *
 * El `data.id` de las notificaciones REALES de MP viaja solo en el BODY, no en
 * el querystring. Al leerlo únicamente de la query, el manifest se armaba sin el
 * segmento `id:` y el HMAC nunca coincidía: el 100 % de los pagos se rechazaba
 * con 401. Los pagos se cobraban igual —el cliente pagaba— pero el sitio no se
 * enteraba: sin mail, sin CRM, sin Purchase a Meta. La web estuvo ~2 semanas sin
 * registrar conversiones.
 *
 * El bug está arreglado y explicado en un comentario largo dentro del módulo.
 * Este archivo es la red que impide volver a cometerlo: el test "notificación
 * real, id solo en el body" se pone ROJO si alguien vuelve a leerlo solo de la
 * query.
 *
 * ─── CÓMO SE TESTEA ───────────────────────────────────────────────────────────
 * `verifyMpSignature` es una función pura de `event → { ok, mode }`: solo usa
 * `node:crypto` y `process.env`. No hace falta ningún mock ni red.
 *
 * Cada caso afirma sobre el `mode` y no solo sobre `ok`: un test que pasa porque
 * el módulo se rompió antes de verificar no prueba nada.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyMpSignature } from '../../../netlify/functions/lib/mpSignature.js';

/** Secreto de juguete. NUNCA el de producción. */
const SECRETO = 'firma-secreta-de-prueba';
const TS = '1742505638683';
const REQUEST_ID = 'req-abc-123';
const DATA_ID = '1234567890';

/** El HMAC tal como lo calcula Mercado Pago sobre el manifest. */
const firmar = (manifest, secret = SECRETO) =>
  createHmac('sha256', secret).update(manifest).digest('hex');

/**
 * Manifest de MP: `id:{data.id};request-id:{x-request-id};ts:{ts};`
 * Los segmentos cuyo valor no llega se omiten.
 */
const manifest = ({ dataId, requestId = REQUEST_ID, ts = TS }) => {
  const partes = [];
  if (dataId) partes.push(`id:${dataId}`);
  if (requestId) partes.push(`request-id:${requestId}`);
  partes.push(`ts:${ts}`);
  return partes.join(';') + ';';
};

/** Evento de Netlify Function con la forma que llega desde MP. */
const evento = ({ v1, ts = TS, requestId = REQUEST_ID, query = {}, body = undefined, sinFirma = false }) => ({
  headers: {
    ...(sinFirma ? {} : { 'x-signature': `ts=${ts},v1=${v1}` }),
    ...(requestId ? { 'x-request-id': requestId } : {})
  },
  queryStringParameters: query,
  body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
});

beforeEach(() => {
  process.env.MP_WEBHOOK_SECRET = SECRETO;
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  delete process.env.MP_WEBHOOK_STRICT;
});
afterEach(() => {
  delete process.env.MP_WEBHOOK_SECRET;
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  delete process.env.MP_WEBHOOK_STRICT;
});

describe('firma de Mercado Pago — de dónde sale el data.id (spec 003)', () => {
  /**
   * ⚠️ EL TEST DE ESTA SPEC.
   *
   * Es el que atrapa el bug que dejó la web dos semanas sin conversiones. Si
   * alguien vuelve a leer el `data.id` solo del querystring, este test falla.
   */
  it('notificación REAL: el data.id viaja solo en el BODY → firma válida', () => {
    const v1 = firmar(manifest({ dataId: DATA_ID }));
    const res = verifyMpSignature(
      evento({ v1, query: {}, body: { type: 'payment', data: { id: DATA_ID } } })
    );
    expect(res).toEqual({ ok: true, mode: 'valid' });
  });

  it('simulador del panel: el data.id viaja en el querystring → firma válida', () => {
    const v1 = firmar(manifest({ dataId: DATA_ID }));
    const res = verifyMpSignature(evento({ v1, query: { 'data.id': DATA_ID } }));
    expect(res).toEqual({ ok: true, mode: 'valid' });
  });

  it('IPN vieja: sin data.id en ningún lado, MP firma sin ese segmento → válida', () => {
    const v1 = firmar(manifest({ dataId: '' }));
    const res = verifyMpSignature(
      evento({ v1, query: { topic: 'payment', id: '999' }, body: { topic: 'payment' } })
    );
    expect(res).toEqual({ ok: true, mode: 'valid' });
  });

  it('el data.id entra al manifest en MINÚSCULAS (lo exige la doc de MP)', () => {
    const conMayus = 'ABC123';
    const v1 = firmar(manifest({ dataId: conMayus.toLowerCase() }));
    const res = verifyMpSignature(evento({ v1, body: { data: { id: conMayus } } }));
    expect(res.mode).toBe('valid');
  });

  it('el id de la IPN (?id=) NO se usa como data.id: rompería el HMAC', () => {
    // MP firma sin el segmento `id:` en las IPN viejas. Si alguien "arreglara"
    // esto cayendo a query.id, el manifest tendría un segmento de más.
    const v1 = firmar(manifest({ dataId: '' }));
    const res = verifyMpSignature(evento({ v1, query: { topic: 'payment', id: '777' } }));
    expect(res.mode).toBe('valid');
  });
});

describe('firma de Mercado Pago — rechazos (spec 003)', () => {
  it('una firma de OTRO pago se rechaza', () => {
    const v1 = firmar(manifest({ dataId: 'otro-pago-999' }));
    const res = verifyMpSignature(evento({ v1, body: { data: { id: DATA_ID } } }));
    expect(res).toEqual({ ok: false, mode: 'invalid' });
  });

  it('una firma hecha con OTRO secreto se rechaza', () => {
    const v1 = firmar(manifest({ dataId: DATA_ID }), 'secreto-equivocado');
    const res = verifyMpSignature(evento({ v1, body: { data: { id: DATA_ID } } }));
    expect(res).toEqual({ ok: false, mode: 'invalid' });
  });

  it('un ts distinto al firmado se rechaza (no se puede reusar una firma vieja)', () => {
    const v1 = firmar(manifest({ dataId: DATA_ID, ts: '1111111111111' }));
    const res = verifyMpSignature(evento({ v1, ts: TS, body: { data: { id: DATA_ID } } }));
    expect(res.mode).toBe('invalid');
  });

  it('x-signature sin v1 → malformed', () => {
    const res = verifyMpSignature({
      headers: { 'x-signature': `ts=${TS}` },
      queryStringParameters: {},
      body: '{}'
    });
    expect(res).toEqual({ ok: false, mode: 'malformed' });
  });

  it('x-signature sin ts → malformed', () => {
    const res = verifyMpSignature({
      headers: { 'x-signature': 'v1=abc123' },
      queryStringParameters: {},
      body: '{}'
    });
    expect(res).toEqual({ ok: false, mode: 'malformed' });
  });

  it('x-signature con basura → malformed, sin explotar', () => {
    const res = verifyMpSignature({
      headers: { 'x-signature': 'cualquier cosa' },
      queryStringParameters: {},
      body: '{}'
    });
    expect(res.ok).toBe(false);
    expect(res.mode).toBe('malformed');
  });
});

describe('firma de Mercado Pago — configuración (spec 003)', () => {
  it('SIN secreto configurado se procesa igual (no se pierden pagos reales)', () => {
    delete process.env.MP_WEBHOOK_SECRET;
    const res = verifyMpSignature(evento({ v1: 'loquesea' }));
    expect(res).toEqual({ ok: true, mode: 'no_secret' });
  });

  it('acepta el alias MERCADOPAGO_WEBHOOK_SECRET', () => {
    delete process.env.MP_WEBHOOK_SECRET;
    process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRETO;
    const v1 = firmar(manifest({ dataId: DATA_ID }));
    const res = verifyMpSignature(evento({ v1, body: { data: { id: DATA_ID } } }));
    expect(res.mode).toBe('valid');
  });

  it('sin header de firma y SIN modo estricto → se procesa', () => {
    const res = verifyMpSignature(evento({ sinFirma: true, body: { data: { id: DATA_ID } } }));
    expect(res).toEqual({ ok: true, mode: 'missing_signature' });
  });

  it('sin header de firma y CON modo estricto → se rechaza', () => {
    for (const valor of ['1', 'true', 'TRUE']) {
      process.env.MP_WEBHOOK_STRICT = valor;
      const res = verifyMpSignature(evento({ sinFirma: true, body: { data: { id: DATA_ID } } }));
      expect(res).toEqual({ ok: false, mode: 'missing_signature' });
    }
  });

  it('MP_WEBHOOK_STRICT con un valor cualquiera NO activa el modo estricto', () => {
    process.env.MP_WEBHOOK_STRICT = 'no';
    const res = verifyMpSignature(evento({ sinFirma: true }));
    expect(res.ok).toBe(true);
  });
});

describe('firma de Mercado Pago — entradas raras (spec 003)', () => {
  it('un body que no es JSON no explota: cae a los otros candidatos', () => {
    const v1 = firmar(manifest({ dataId: '' }));
    const res = verifyMpSignature(evento({ v1, body: 'esto no es json' }));
    expect(res.mode).toBe('valid');
  });

  it('sin body y sin query, con firma sin id → válida', () => {
    const v1 = firmar(manifest({ dataId: '' }));
    const res = verifyMpSignature(evento({ v1, body: undefined }));
    expect(res.mode).toBe('valid');
  });

  it('sin x-request-id el manifest omite ese segmento', () => {
    const v1 = firmar(manifest({ dataId: DATA_ID, requestId: '' }));
    const res = verifyMpSignature(
      evento({ v1, requestId: '', body: { data: { id: DATA_ID } } })
    );
    expect(res.mode).toBe('valid');
  });

  it('un evento vacío no explota', () => {
    expect(() => verifyMpSignature({})).not.toThrow();
    expect(verifyMpSignature({}).mode).toBe('missing_signature');
  });
});
