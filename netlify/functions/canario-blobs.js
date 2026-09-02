/**
 * Netlify Scheduled Function: canario de Netlify Blobs. Corre 1 vez por día.
 *
 * ─── POR QUÉ EXISTE ───────────────────────────────────────────────────────────
 * Blobs estuvo caído en runtime desde julio hasta el 2/9/2026 —más de un mes—
 * sin que nadie se enterara. Netlify dejó de inyectarle las credenciales a las
 * funciones, `getStore()` empezó a tirar `MissingBlobsEnvironmentError`, y los
 * catch de cada store lo taparon: `getOrder` devolvía null y desde afuera todo
 * parecía andar. Se perdió el historial de pedidos de dos meses y todos los
 * carritos abandonados.
 *
 * Hoy Blobs anda gracias a un PAT manual (NETLIFY_BLOBS_TOKEN). **Ese PAT es el
 * único punto de falla que queda**: el día que venza o se revoque, esto se cae
 * exactamente igual de callado que la vez anterior. Este canario existe para
 * que la segunda vez nos enteremos el mismo día y no dos meses después.
 *
 * ─── QUÉ HACE ─────────────────────────────────────────────────────────────────
 * Un ida y vuelta completo sobre el store `orders`: escribe, lee, compara y
 * borra. La ida sola no alcanza — el modo de falla que tuvimos fue justamente
 * una escritura que "salía bien" sin persistir nada.
 *
 * Alcanza con probar UN store: los dos usan las mismas credenciales y el mismo
 * helper (ver lib/orderStore.js ↔ lib/abandonedStore.js, y el test de paridad
 * en src/lib/blobsFallback.test.js). Se prueba `orders` porque es el que guarda
 * las ventas. No se toca `abandoned-carts` a propósito: una clave de prueba
 * ahí sería un carrito falso para el cron horario.
 *
 * ─── POR QUÉ NO AVISA CUANDO TODO ANDA ────────────────────────────────────────
 * Solo manda mail si FALLA. Un "todo ok" diario se vuelve ruido, se archiva
 * solo con un filtro, y el día que llega el que importa se archiva también.
 * Cuando anda, esto no existe.
 */
import { getStore } from '@netlify/blobs';
import { sendAlertEmail } from './lib/notify.js';

const STORE = 'orders';
/** Prefijo reconocible: si una clave queda huérfana, se sabe qué es y de dónde salió. */
const CLAVE = '__canario-blobs';

/** Mismo helper que orderStore/abandonedStore. Ver el comentario allá. */
function store() {
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;
  return siteID && token ? getStore({ name: STORE, siteID, token }) : getStore(STORE);
}

/**
 * Escribe, lee, compara y borra. Nunca lanza.
 * `etapa` dice DÓNDE se rompió, que es la mitad del diagnóstico.
 * @returns {Promise<{ok: boolean, etapa: string, detalle?: string}>}
 */
export async function probarBlobs() {
  const marca = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let s;

  try {
    s = store();
  } catch (err) {
    // Acá cae MissingBlobsEnvironmentError: Netlify no inyectó nada y el PAT
    // manual no está o no sirve. Es exactamente el fallo de julio.
    return { ok: false, etapa: 'abrir_store', detalle: err?.message || String(err) };
  }

  try {
    await s.setJSON(CLAVE, { marca, at: new Date().toISOString() });
  } catch (err) {
    return { ok: false, etapa: 'escribir', detalle: err?.message || String(err) };
  }

  let leido;
  try {
    leido = await s.get(CLAVE, { type: 'json' });
  } catch (err) {
    return { ok: false, etapa: 'leer', detalle: err?.message || String(err) };
  }

  // El caso silencioso: la escritura no tiró y el dato no está. Sin esta
  // comparación el canario cantaría "todo bien" con el store vacío.
  if (leido?.marca !== marca) {
    return {
      ok: false,
      etapa: 'verificar',
      detalle: `se escribió "${marca}" y se leyó ${leido ? `"${leido.marca}"` : 'nada'}`
    };
  }

  // El borrado es limpieza, no parte de la prueba: si falla, el canario igual
  // pasó (Blobs anda). Queda una clave suelta y se loguea.
  try {
    await s.delete(CLAVE);
  } catch (err) {
    console.warn('[canario] no se pudo borrar la clave de prueba:', err?.message || err);
  }

  return { ok: true, etapa: 'completo' };
}

export default async () => {
  const r = await probarBlobs();

  if (r.ok) {
    console.log('[canario] Blobs OK');
    return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } });
  }

  console.error('[canario] BLOBS CAÍDO:', r.etapa, r.detalle || '');

  // Una alarma por día como mucho. La clave lleva la fecha: si el cron corre de
  // más, o alguien golpea el endpoint, Resend manda una sola. Al día siguiente
  // la clave cambia y vuelve a avisar, que es lo que se quiere mientras el
  // problema siga.
  const hoy = new Date().toISOString().slice(0, 10);
  const aviso = await sendAlertEmail({
    subject: '🚨 Netlify Blobs no está guardando nada',
    clave: `canario-blobs-${hoy}`,
    text:
      `El chequeo diario de Netlify Blobs falló en la etapa "${r.etapa}".\n\n` +
      `Detalle: ${r.detalle || '—'}\n\n` +
      `QUÉ SIGNIFICA: no se están guardando los pedidos ni los carritos\n` +
      `abandonados. Los mails de pedido SIGUEN saliendo (no dependen de Blobs),\n` +
      `así que las ventas no se pierden — pero no queda historial de nada.\n\n` +
      `CAUSA MÁS PROBABLE: venció o se revocó el PAT de NETLIFY_BLOBS_TOKEN.\n` +
      `Se regenera en Netlify → User settings → Applications → Personal access\n` +
      `tokens, y se recarga en las env vars del sitio junto con\n` +
      `NETLIFY_BLOBS_SITE_ID. Después hay que redeployar.\n\n` +
      `Para comprobar cuándo vuelva a andar:\n` +
      `curl -s -X POST https://epicalcos.com/api/track-cart \\\n` +
      `  -H "Content-Type: application/json" -H "Origin: https://epicalcos.com" \\\n` +
      `  -d '{"email":"diag@example.com","items":[{"id":"x","name":"p","quantity":1,"price":1}],"total":1}'\n\n` +
      `Ver docs/database.md §1.`
  });

  console.log('[canario] alarma:', JSON.stringify(aviso));
  return new Response(JSON.stringify({ ...r, aviso: aviso.sent }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const config = {
  // Diario alcanza: el fallo que cubre (un PAT que vence) no es intermitente,
  // es permanente desde el momento en que pasa. Enterarse el mismo día contra
  // enterarse en dos meses es toda la diferencia que hace falta.
  schedule: '@daily'
};
