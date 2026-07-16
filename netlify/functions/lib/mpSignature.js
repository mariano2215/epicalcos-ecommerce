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
  // Solo el data.id de los QUERY PARAMS entra en el manifest, en minúsculas si es
  // alfanumérico (requisito de la doc de MP). Ojo: NO vale caer a query.id — las
  // notificaciones IPN (?topic=payment&id=123) no traen data.id, así que MP firma
  // el manifest SIN el segmento id; agregarlo desde query.id rompe el HMAC y
  // rechaza pagos reales con 401.
  const dataId = String(query['data.id'] || '').toLowerCase();
  const requestId = headers['x-request-id'] || headers['X-Request-Id'] || '';

  const manifestParts = [];
  if (dataId) manifestParts.push(`id:${dataId}`);
  if (requestId) manifestParts.push(`request-id:${requestId}`);
  manifestParts.push(`ts:${ts}`);
  const manifest = manifestParts.join(';') + ';';

  const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(computed);
  const b = Buffer.from(String(v1));
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, mode: ok ? 'valid' : 'invalid' };
}
