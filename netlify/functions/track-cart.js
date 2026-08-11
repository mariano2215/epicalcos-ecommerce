/**
 * Netlify Function: POST /api/track-cart
 *
 * Registra el carrito de alguien que llegó al checkout y escribió un mail
 * válido, para poder mandarle un recordatorio si no termina de comprar.
 * Ver netlify/functions/abandoned-cart.js (el envío) y lib/abandonedStore.js.
 *
 * NO-OP POR DEFECTO: sin `ABANDONED_CART_ENABLED=true` no guarda nada. La
 * recuperación de carritos manda mails a clientes reales, así que se prende a
 * propósito y no por el solo hecho de deployar este archivo.
 *
 * Variables de entorno:
 *   ABANDONED_CART_ENABLED=true   (obligatoria) prende la función
 *   ABANDONED_CART_SECRET         (obligatoria) secreto para firmar el link de baja
 */
import { guardarCarrito, consultarBaja } from './lib/abandonedStore.js';

const ALLOWED_ORIGINS = [
  process.env.URL,
  'https://epicalcos.com',
  'https://www.epicalcos.com',
  'https://epicalcos-ecommerce.netlify.app',
  'http://localhost:8888'
].filter(Boolean);

const corsHeadersFor = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin'
});

const MAX_BODY_BYTES = 20_000;
const MAX_ITEMS = 40; // solo para el resumen del mail; no es el tope del carrito
const clip = (v, max) => String(v ?? '').slice(0, max).trim();

export const handler = async (event) => {
  const corsHeaders = corsHeadersFor(event.headers?.origin || event.headers?.Origin || '');
  const json = (status, body) => ({
    statusCode: status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  if ((event.body?.length || 0) > MAX_BODY_BYTES) return json(413, { error: 'payload_too_large' });

  // Interruptor general. Se responde 200 igual: al navegador no le importa, y
  // así el frontend no tiene que saber si está prendido.
  if (process.env.ABANDONED_CART_ENABLED !== 'true' || !process.env.ABANDONED_CART_SECRET) {
    return json(200, { tracked: false, reason: 'disabled' });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const email = clip(payload.email, 200);
  if (!/^\S+@\S+\.\S+$/.test(email)) return json(400, { error: 'invalid_email' });

  // Respeta el opt-out desde el primer momento: si pidió no recibir más, ni
  // siquiera se guarda el carrito.
  //
  // Un fallo del store NO se reporta como baja: se sigue adelante e intenta
  // guardar igual. El envío está protegido aparte —abandoned-cart.js vuelve a
  // consultar el opt-out antes de cada mail y ahí sí falla cerrado—, así que
  // guardar de más no le escribe a nadie que no corresponda.
  const { baja, error: errorStore } = await consultarBaja(email);
  if (baja) return json(200, { tracked: false, reason: 'opted_out' });

  const items = Array.isArray(payload.items) ? payload.items.slice(0, MAX_ITEMS) : [];
  if (items.length === 0) return json(400, { error: 'empty_cart' });

  // Solo lo mínimo para armar el mail. Nada de direcciones ni teléfonos: este
  // registro puede quedar días en Blobs y no necesita más que esto.
  const limpios = items.map((i) => ({
    name: clip(i.name, 120),
    quantity: Math.max(1, Math.min(1000, Number(i.quantity) || 1)),
    price: Math.max(0, Number(i.price) || 0),
    image: clip(i.image, 300)
  }));

  const total = limpios.reduce((a, i) => a + i.price * i.quantity, 0);

  const guardado = await guardarCarrito(email, {
    nombre: clip(payload.name, 120) || null,
    items: limpios,
    total,
    units: limpios.reduce((a, i) => a + i.quantity, 0)
  });

  // `store_error` es el diagnóstico: si Blobs no anda, se ve acá en vez de
  // disfrazarse de baja voluntaria como pasaba antes.
  if (!guardado || errorStore) return json(200, { tracked: false, reason: 'store_error' });

  return json(200, { tracked: true });
};
