/**
 * Verificación de la firma x-signature de las notificaciones de Mercado Pago.
 * Docs: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 *
 * MP firma cada notificación con HMAC-SHA256 sobre el manifest
 *   id:[data.id];request-id:[x-request-id];ts:[ts];
 * usando la "firma secreta" del panel (Tu app → Webhooks). Los segmentos cuyo
 * valor no llegue en la notificación se omiten del manifest.
 *
 * Variables de entorno:
 *   MP_WEBHOOK_SECRET (o MERCADOPAGO_WEBHOOK_SECRET) → firma secreta del panel
 *   MP_WEBHOOK_STRICT → "1"/"true" para rechazar también las notificaciones que
 *     llegan SIN header x-signature. Por defecto solo se rechazan las firmas
 *     inválidas: las notificaciones vía notification_url podrían llegar sin
 *     firmar y no queremos dejar de procesar pagos reales. Cuando los logs
 *     confirmen que todas llegan firmadas ("firma ok"), activar el modo estricto.
 */
import crypto from 'node:crypto';

/**
 * @param {object} event evento de Netlify Function (headers, queryStringParameters)
 * @returns {{ ok: boolean, mode: 'no_secret'|'missing_signature'|'malformed'|'valid'|'invalid' }}
 */
export function verifyMpSignature(event) {
  const secret = process.env.MP_WEBHOOK_SECRET || process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return { ok: true, mode: 'no_secret' };

  const headers = event.headers || {};
  const signature = headers['x-signature'] || headers['X-Signature'];
  if (!signature) {
    const strict = /^(1|true)$/i.test(process.env.MP_WEBHOOK_STRICT || '');
    return { ok: !strict, mode: 'missing_signature' };
  }

  // x-signature: "ts=1742505638683,v1=ced36ab6..."
  const parts = {};
  for (const chunk of String(signature).split(',')) {
    const idx = chunk.indexOf('=');
    if (idx > 0) parts[chunk.slice(0, idx).trim()] = chunk.slice(idx + 1).trim();
  }
  const { ts, v1 } = parts;
  if (!ts || !v1) return { ok: false, mode: 'malformed' };

  const query = event.queryStringParameters || {};
  const requestId = headers['x-request-id'] || headers['X-Request-Id'] || '';

  // De dónde sale el data.id que entra al manifest (en minúsculas, requisito de
  // la doc de MP):
  //   - El simulador del panel y las notificaciones con querystring lo mandan
  //     como ?data.id=123.
  //   - Las notificaciones REALES del webhook llegan sin querystring: el id
  //     viaja solo en el body ({"data":{"id":"123"}}), pero MP igual firma el
  //     manifest incluyéndolo. Leerlo solo de la query hacía que armáramos el
  //     manifest sin el segmento `id:` y rechazáramos el 100% de los pagos.
  //   - Las IPN viejas (?topic=payment&id=123) no traen data.id en ningún lado
  //     y MP firma sin ese segmento; por eso queda el candidato sin id.
  // Ojo: NO vale caer a query.id — ese es el id de la IPN, no el de data.id, y
  // agregarlo rompe el HMAC.
  let bodyDataId = '';
  try {
    bodyDataId = String(JSON.parse(event.body || '{}')?.data?.id || '');
  } catch { /* body no-JSON: nos quedamos con los otros candidatos */ }

  const ids = [...new Set(
    [query['data.id'], bodyDataId].map((v) => String(v || '').toLowerCase()).filter(Boolean)
  )];

  const buildManifest = (dataId) => {
    const parts = [];
    if (dataId) parts.push(`id:${dataId}`);
    if (requestId) parts.push(`request-id:${requestId}`);
    parts.push(`ts:${ts}`);
    return parts.join(';') + ';';
  };

  const expected = Buffer.from(String(v1));
  const matches = (manifest) => {
    const computed = Buffer.from(crypto.createHmac('sha256', secret).update(manifest).digest('hex'));
    return computed.length === expected.length && crypto.timingSafeEqual(computed, expected);
  };

  // Probar cada origen posible del id, más la variante sin id (IPN). Todas
  // exigen un HMAC válido con el secreto, así que no se debilita la verificación.
  for (const dataId of [...ids, '']) {
    if (matches(buildManifest(dataId))) return { ok: true, mode: 'valid' };
  }
  return { ok: false, mode: 'invalid' };
}
