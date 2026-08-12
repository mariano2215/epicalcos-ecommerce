/**
 * Setup global de la suite — spec 004.
 *
 * ─── POR QUÉ EXISTE ───────────────────────────────────────────────────────────
 * Los tests del servidor leen `process.env`, y desde la spec 004 la suite corre
 * DENTRO DEL BUILD DE NETLIFY, donde todas las variables del sitio están
 * cargadas. Sin esto, un test que verifica "qué pasa cuando la variable NO está"
 * empezaría a fallar en el deploy por un motivo que no tiene nada que ver con el
 * código que se subió.
 *
 * No es hipotético: antes de este archivo, `entregaDigital.test.js` fallaba si se
 * lo corría aislado con `DIGITAL_LINK_PACK_STICKERS` presente. La suite completa
 * pasaba igual, pero por CASUALIDAD —el `afterEach` de un test anterior borraba
 * la variable—, que es la misma clase de verde engañoso que la spec 003 vino a
 * eliminar.
 *
 * ─── QUÉ HACE ─────────────────────────────────────────────────────────────────
 * Antes de CADA test borra las variables del servidor, así el punto de partida
 * es siempre el mismo: sin configurar. El test que necesite una la setea él.
 *
 * Se limpia el entorno del PROCESO de test, no el de producción: `process.env`
 * acá es una copia del proceso de vitest y no toca nada del deploy.
 *
 * ⚠️ Si agregás una variable de entorno nueva que el servidor lea, sumala acá.
 * Si no, el día que se cargue en Netlify puede empezar a romper el build.
 */
import { beforeEach } from 'vitest';

/** Variables que lee `netlify/functions/**` (ver `.env.example` y docs/integrations.md §13). */
const VARIABLES_DEL_SERVIDOR = [
  // Mercado Pago
  'MERCADOPAGO_ACCESS_TOKEN',
  'MP_WEBHOOK_SECRET',
  'MERCADOPAGO_WEBHOOK_SECRET',
  'MP_WEBHOOK_STRICT',
  // Notion
  'NOTION_TOKEN',
  'NOTION_KEY',
  'NOTION_CRM_DATABASE_ID',
  'NOTION_DATABASE_ID',
  // Resend
  'RESEND_API_KEY',
  'NOTIFY_EMAIL_TO',
  'NOTIFY_EMAIL_FROM',
  // Meta
  'META_CAPI_TOKEN',
  'META_PIXEL_ID',
  'META_CAPI_TEST_CODE',
  'VITE_META_PIXEL_ID', // metaCapi cae a esta si falta META_PIXEL_ID
  // CRM interno
  'CRM_WEBHOOK_URL',
  'CRM_WEBHOOK_SECRET',
  // Carrito abandonado
  'ABANDONED_CART_ENABLED',
  'ABANDONED_CART_SECRET',
  'ABANDONED_CART_HOURS',
  'ABANDONED_CART_MAX_HOURS',
  'ABANDONED_CART_MAX_PER_RUN',
  'ABANDONED_CART_TEST_EMAIL',
  // Entrega digital
  'DIGITAL_DELIVERY_SECRET',
  // Blobs y Netlify
  'NETLIFY_BLOBS_SITE_ID',
  'NETLIFY_BLOBS_TOKEN',
  'SITE_ID',
  'URL'
];

beforeEach(() => {
  for (const nombre of VARIABLES_DEL_SERVIDOR) delete process.env[nombre];
  // Los links de descarga son dinámicos (`DIGITAL_LINK_` + id del pack), así que
  // se barren por prefijo en vez de enumerarlos: un pack nuevo queda cubierto solo.
  for (const nombre of Object.keys(process.env)) {
    if (nombre.startsWith('DIGITAL_LINK_')) delete process.env[nombre];
  }
});
