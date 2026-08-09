/**
 * Entrega de los ARCHIVOS IMPRIMIBLES (producto digital).
 *
 * El producto no se despacha: llega por mail. Este módulo resuelve, para un
 * pedido ya pagado, QUÉ links de descarga hay que meter en el mail de
 * confirmación (ver buildCustomerEmailHtml en lib/notify.js).
 *
 * ─── Cómo se configura el link ────────────────────────────────────────────────
 * El archivo NO vive en el repo (son cientos de MB): se sube a Google Drive,
 * Dropbox, WeTransfer, Cloudinary o donde sea, y el link va en una variable de
 * entorno de Netlify (Site settings → Environment variables):
 *
 *   DIGITAL_LINK_PACK_STICKERS = https://drive.google.com/…
 *
 * El nombre de la variable es DIGITAL_LINK_ + el id del pack en MAYÚSCULAS y con
 * guiones bajos (`pack-stickers` → `DIGITAL_LINK_PACK_STICKERS`).
 *
 * ⚠️ Poné el link en modo "cualquiera con el enlace puede ver" (o el archivo no
 * se le va a abrir a nadie) y no lo borres ni lo muevas: el mail viejo lo sigue
 * apuntando.
 *
 * ─── Si TODAVÍA no configuraste el link ──────────────────────────────────────
 * No se rompe nada y la venta se sigue pudiendo hacer: el mail al cliente le
 * dice que se lo mandamos a esa misma casilla, y el aviso interno a EPICALCOS
 * arranca con un cartel de "HAY QUE MANDAR EL ARCHIVO A MANO". O sea: sin
 * variable, la entrega es manual pero nadie se queda sin saber qué pasa.
 */

/** Nombre de la env var con el link de descarga de un pack. */
export const linkEnvVar = (packId) =>
  'DIGITAL_LINK_' + String(packId).toUpperCase().replace(/[^A-Z0-9]+/g, '_');

/** true si la línea del pedido es un pack de archivos imprimibles. */
export const isDigitalLine = (item) => String(item?.id ?? '').startsWith('digital:');

/** Id del pack a partir del id de la línea (`digital:pack-stickers` → `pack-stickers`). */
export const packIdOf = (item) => String(item?.id ?? '').split(':')[1] || '';

/**
 * Los archivos digitales de un pedido, con su link de descarga si está
 * configurado. Devuelve [] si el pedido no tiene ninguno.
 *
 * @param {{ items?: Array<{ id: string, title: string }> }} order
 * @returns {Array<{ packId: string, title: string, url: string|null, envVar: string }>}
 */
export function digitalDeliveries(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.filter(isDigitalLine).map((item) => {
    const packId = packIdOf(item);
    const envVar = linkEnvVar(packId);
    const url = String(process.env[envVar] || '').trim();
    return {
      packId,
      title: item.title || 'Archivos imprimibles',
      // Solo http(s): una variable mal cargada no tiene que terminar en un
      // `href` raro dentro del mail de un cliente.
      url: /^https?:\/\//i.test(url) ? url : null,
      envVar
    };
  });
}

/** true si el pedido tiene al menos un pack digital sin link configurado (entrega manual). */
export function needsManualDelivery(order) {
  const deliveries = digitalDeliveries(order);
  return deliveries.length > 0 && deliveries.some((d) => !d.url);
}
