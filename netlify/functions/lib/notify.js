/**
 * Notificaciones de pedidos: mail a EPICALCOS, mail de confirmación al cliente
 * y/o alta en un CRM (Notion).
 *
 * Todo es opcional y se activa por variables de entorno. Si no hay nada
 * configurado, simplemente no notifica (y lo deja logueado). Ninguna de estas
 * funciones lanza: el webhook SIEMPRE tiene que responder 200 a Mercado Pago.
 *
 * ⚠️ Los mails de PEDIDO no son best-effort como el resto: con Netlify Blobs
 * caído en runtime son el único registro que queda de una venta. Por eso
 * `sendOrderEmail` y `sendCustomerEmail` reintentan los fallos transitorios,
 * cortan cada intento con timeout y viajan con Idempotency-Key para que el
 * reintento no duplique nada (ver "Envío resiliente" más abajo). Los handlers
 * los llaman ANTES que a cualquier otra integración.
 *
 * Variables de entorno (Netlify dashboard → Environment variables):
 *
 *   --- Mail (Resend, https://resend.com — gratis hasta 3000 mails/mes) ---
 *   RESEND_API_KEY      → API key de Resend (empieza con "re_")
 *   NOTIFY_EMAIL_TO     → destino interno (default: epicalcos@gmail.com)
 *   NOTIFY_EMAIL_FROM   → remitente verificado (default: onboarding@resend.dev)
 *
 *   ⚠️ Para el mail al CLIENTE, NOTIFY_EMAIL_FROM tiene que ser una dirección
 *   de un dominio verificado en Resend (ej: EPICALCOS <pedidos@epicalcos.com>).
 *   Con el default onboarding@resend.dev, Resend solo permite enviar a la
 *   casilla del dueño de la cuenta, así que el mail al cliente se omite.
 *
 *   --- CRM (Notion, opcional) ---
 *   NOTION_TOKEN        → token de integración interna de Notion (empieza con "ntn_" o "secret_")
 *   NOTION_DATABASE_ID  → id de la base de datos donde se cargan los pedidos
 */

import { digitalDeliveries, needsManualDelivery, tieneArchivosDigitales, linkEntrega } from './digital.js';

const DEFAULT_TO = 'epicalcos@gmail.com';
const DEFAULT_FROM = 'EPICALCOS <onboarding@resend.dev>';

// Datos de contacto que van en el mail al cliente (espejo de frontend/src/config/site.js).
const CONTACT = {
  email: 'epicalcos@gmail.com',
  whatsappDisplay: '+54 9 341 680-6675',
  whatsappUrl: 'https://wa.me/5493416806675',
  instagram: '@epicalcos',
  instagramUrl: 'https://instagram.com/epicalcos'
};

// Datos bancarios para transferencia (espejo de frontend/src/config/site.js → bankTransfer).
const BANK_TRANSFER = {
  cvu: '0000003100088847424287',
  alias: 'epicalcos.mp',
  titular: 'MARIANO ALEJANDRO JESUS CALANDRA'
};

const money = (n) =>
  typeof n === 'number' && !Number.isNaN(n)
    ? '$ ' + n.toLocaleString('es-AR')
    : '—';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Detalle del pedido rearmado desde el pago de Mercado Pago.
 *
 * Es el plan B de `buildOrderView`: MP devuelve en `additional_info.items` los
 * MISMOS items que se le mandaron al crear la preferencia (ver
 * create-preference.js), línea de envío incluida, así que el aviso sale igual
 * que si el pedido guardado hubiera estado.
 *
 * Existe porque Netlify Blobs se cayó en runtime sin hacer ruido —`getOrder`
 * devuelve null y su catch lo tapa— y los pedidos pagados con Mercado Pago
 * llegaron con "PEDIDO —": el mail no decía qué calcos había que imprimir. El
 * detalle estuvo siempre en el mismo objeto `payment` que el webhook ya tenía
 * en la mano.
 *
 * MP los manda como strings ("1", "1600"); se normalizan acá para no dejarle
 * esa trampa al que los consuma.
 */
function itemsDelPago(payment) {
  return (payment?.additional_info?.items || []).map((i) => ({
    id: i.id,
    title: i.title,
    quantity: Number(i.quantity) || 1,
    unit_price: Number(i.unit_price) || 0
  }));
}

/**
 * Construye un objeto de pedido "plano" combinando lo guardado en Blobs con la
 * info del pago de Mercado Pago. Tolera que falte cualquiera de las dos fuentes.
 * @param {object|null} order  pedido guardado en create-preference
 * @param {object|null} payment objeto payment de Mercado Pago
 */
export function buildOrderView(order, payment) {
  const meta = payment?.metadata || {};
  const payer = order?.payer || {};
  const shipping = order?.shipping || {};

  // El pedido guardado manda; si no está, el detalle se rearma con lo que trae
  // el pago. Un aviso de venta sin decir qué se vendió no sirve para nada.
  const items = order?.items?.length ? order.items : itemsDelPago(payment);
  const itemsTotal =
    order?.itemsTotal ??
    (items.length
      ? items
          .filter((i) => i.id !== 'shipping')
          .reduce((acc, i) => acc + Number(i.unit_price) * Number(i.quantity), 0)
      : undefined);

  // La metadata de MP llega con las claves en minúscula → fallback.
  return {
    orderId:
      order?.orderId || payment?.external_reference || 'sin-referencia',
    createdAt: order?.createdAt,
    name: payer.name || meta.buyer_name || payment?.payer?.first_name || '—',
    // `meta.buyer_email` (el que escribió en el checkout) va ANTES que
    // `payment.payer.email` (la cuenta con la que pagó): no son lo mismo. Con
    // estos dos al revés, un pedido real se confirmó a la casilla del titular
    // de la cuenta de Mercado Pago mientras el comprador esperaba en la suya un
    // mail que nunca iba a ver. La confirmación va al mail que dejó él.
    email: payer.email || meta.buyer_email || payment?.payer?.email || '—',
    phone: payer.phone || meta.buyer_phone || '—',
    address: payer.address || meta.shipping_address || '—',
    city: shipping.city || meta.shipping_city || '—',
    province: shipping.province || meta.shipping_province || '—',
    zipCode: shipping.zipCode || meta.shipping_zip_code || '—',
    shippingMethod: shipping.method || meta.shipping_method || '—',
    shippingCost:
      typeof shipping.cost === 'number'
        ? shipping.cost
        : Number(meta.shipping_cost) || 0,
    comments: shipping.comments || meta.comments || '',
    items,
    itemsTotal,
    total: order?.total ?? payment?.transaction_amount,
    // Datos del pago confirmado (o, si es un pedido por transferencia sin
    // confirmar todavía, los datos que dejó create-order-transfer).
    paymentId: payment?.id,
    paymentStatus: payment?.status || order?.status,
    paymentStatusDetail: payment?.status_detail,
    amountPaid: payment?.transaction_amount,
    paymentMethod: payment?.payment_method_id || order?.paymentMethod,
    paymentType: payment?.payment_type_id,
    paymentDate: payment?.date_approved || payment?.date_created || order?.createdAt
  };
}

/** true si el pedido es por transferencia y todavía no se confirmó el pago. */
function isPendingTransfer(o) {
  return o.paymentMethod === 'transferencia' && o.paymentStatus !== 'approved';
}

/**
 * true si el pedido tiene archivos imprimibles y está esperando que se confirme
 * una transferencia.
 *
 * Es el caso que se le escapaba al sistema: la transferencia no tiene webhook,
 * así que después de confirmarla a mano NADA volvía a ejecutarse y el archivo
 * llegaba solo si el vendedor se acordaba. Ahora el aviso interno marca estos
 * pedidos y trae el botón para entregarlos. Ver lib/digital.js.
 */
function esperaConfirmacionParaEntregar(o) {
  return isPendingTransfer(o) && tieneArchivosDigitales(o);
}

/** Etiqueta del badge de estado para el mail interno. */
function statusLabel(o) {
  if (o.paymentStatus === 'approved') return 'PAGO APROBADO';
  if (isPendingTransfer(o)) return 'TRANSFERENCIA — PENDIENTE DE COMPROBANTE';
  return (o.paymentStatus || 'pendiente').toUpperCase();
}

/** Bloque HTML con los datos bancarios (mail interno y mail al cliente). */
function bankTransferHtml() {
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:3px 0;width:140px;color:#666">CVU</td><td style="font-family:monospace">${BANK_TRANSFER.cvu}</td></tr>
      <tr><td style="padding:3px 0;color:#666">Alias</td><td style="font-family:monospace">${BANK_TRANSFER.alias}</td></tr>
      <tr><td style="padding:3px 0;color:#666">Titular</td><td>${BANK_TRANSFER.titular}</td></tr>
    </table>`;
}

function bankTransferText() {
  return `  CVU: ${BANK_TRANSFER.cvu}\n  Alias: ${BANK_TRANSFER.alias}\n  Titular: ${BANK_TRANSFER.titular}`;
}

function itemsText(items) {
  if (!items?.length) return '—';
  return items
    .map(
      (i) =>
        `• ${i.title} x${i.quantity} — ${money(
          Number(i.unit_price) * Number(i.quantity)
        )}`
    )
    .join('\n');
}

function itemsHtml(items) {
  if (!items?.length) return '<tr><td colspan="3">—</td></tr>';
  return items
    .map(
      (i) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(i.title)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${esc(i.quantity)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${money(
          Number(i.unit_price) * Number(i.quantity)
        )}</td>
      </tr>`
    )
    .join('');
}

function buildEmailHtml(o) {
  const statusBadge =
    o.paymentStatus === 'approved'
      ? '<span style="background:#16a34a;color:#fff;padding:3px 10px;border-radius:999px;font-size:13px">PAGO APROBADO</span>'
      : `<span style="background:#f59e0b;color:#fff;padding:3px 10px;border-radius:999px;font-size:13px">${esc(
          statusLabel(o)
        )}</span>`;

  // Archivos imprimibles sin DIGITAL_LINK_* configurado: el cliente pagó y el
  // mail que recibió NO trae link, así que hay que mandárselo a mano. Va arriba
  // de todo y en rojo: es lo único de este mail que exige una acción inmediata.
  const manualDigital =
    o.paymentStatus === 'approved' && needsManualDelivery(o)
      ? `<div style="margin:0 0 16px;padding:14px;background:#fef2f2;border:2px solid #dc2626;border-radius:8px">
           <strong style="color:#dc2626;font-size:15px">⚠️ HAY QUE MANDAR EL ARCHIVO A MANO</strong><br>
           <span style="font-size:14px">
             Este pedido tiene archivos imprimibles sin link configurado. Mandale la descarga a
             <strong>${esc(o.email)}</strong>.<br>
             Para que salga solo en el mail de confirmación, cargá en Netlify la variable
             ${digitalDeliveries(o)
               .filter((d) => !d.url)
               .map((d) => `<code>${esc(d.envVar)}</code>`)
               .join(' y ')}.
           </span>
         </div>`
      : '';

  // Pedido con archivos que espera la confirmación de una transferencia. El
  // botón manda la descarga al cliente en un click (ver entregar-digital.js).
  // Sin DIGITAL_DELIVERY_SECRET no hay botón, pero el aviso igual aparece: la
  // entrega se hace a mano, como se venía haciendo.
  const entregaTrasConfirmar = (() => {
    if (!esperaConfirmacionParaEntregar(o)) return '';
    const url = linkEntrega(o.orderId, process.env.URL);
    const boton = url
      ? `<p style="margin:12px 0 0">
           <a href="${esc(url)}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">
             📩 Enviarle los archivos ahora
           </a>
         </p>
         <p style="margin:8px 0 0;font-size:12px;color:#555">
           Tocá el botón <strong>recién cuando tengas el comprobante</strong>: le manda la descarga a
           <strong>${esc(o.email)}</strong> al instante.
         </p>`
      : `<p style="margin:10px 0 0;font-size:13px;color:#555">
           Cargá <code>DIGITAL_DELIVERY_SECRET</code> en Netlify para poder entregarlo desde acá.
           Por ahora, mandale la descarga a <strong>${esc(o.email)}</strong> a mano.
         </p>`;
    return `<div style="margin:0 0 16px;padding:14px;background:#eff6ff;border:2px solid #1d4ed8;border-radius:8px">
              <strong style="color:#1d4ed8;font-size:15px">📩 ARCHIVOS PENDIENTES DE ENTREGA</strong><br>
              <span style="font-size:14px">
                Este pedido tiene archivos imprimibles y se paga por transferencia:
                el cliente <strong>todavía no</strong> recibió la descarga.
              </span>
              ${boton}
            </div>`;
  })();

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:620px;margin:0 auto;color:#111">
    <h2 style="margin:0 0 4px">🛒 Nuevo pedido EPICALCOS</h2>
    <p style="margin:0 0 16px">${statusBadge} &nbsp; <strong>Ref:</strong> ${esc(o.orderId)}</p>

    ${manualDigital}
    ${entregaTrasConfirmar}

    <h3 style="margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:4px">Cliente</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:3px 0;width:140px;color:#666">Nombre</td><td><strong>${esc(o.name)}</strong></td></tr>
      <tr><td style="padding:3px 0;color:#666">Email</td><td>${esc(o.email)}</td></tr>
      <tr><td style="padding:3px 0;color:#666">Teléfono</td><td>${esc(o.phone)}</td></tr>
    </table>

    <h3 style="margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:4px">Entrega</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:3px 0;width:140px;color:#666">Método</td><td>${esc(o.shippingMethod)}</td></tr>
      <tr><td style="padding:3px 0;color:#666">Dirección</td><td>${esc(o.address)}</td></tr>
      <tr><td style="padding:3px 0;color:#666">Ciudad</td><td>${esc(o.city)} (${esc(o.province)}) — CP ${esc(o.zipCode)}</td></tr>
      <tr><td style="padding:3px 0;color:#666">Costo envío</td><td>${money(o.shippingCost)}</td></tr>
    </table>

    <h3 style="margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:4px">Pedido</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f5f5f5">
          <th style="padding:6px 10px;text-align:left">Producto</th>
          <th style="padding:6px 10px;text-align:center">Cant.</th>
          <th style="padding:6px 10px;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemsHtml(o.items)}</tbody>
    </table>

    ${
      o.comments
        ? `<p style="margin:14px 0;padding:10px;background:#fff7ed;border-left:3px solid #f59e0b;font-size:14px"><strong>Comentarios / detalle:</strong><br>${esc(
            o.comments
          )}</p>`
        : ''
    }

    <h3 style="margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:4px">Pago</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:3px 0;width:140px;color:#666">${isPendingTransfer(o) ? 'Total a transferir' : 'Monto pagado'}</td><td style="font-size:18px"><strong>${money(
        o.amountPaid ?? o.total
      )}</strong></td></tr>
      <tr><td style="padding:3px 0;color:#666">Estado</td><td>${esc(o.paymentStatus || '—')} ${
    o.paymentStatusDetail ? '(' + esc(o.paymentStatusDetail) + ')' : ''
  }</td></tr>
      <tr><td style="padding:3px 0;color:#666">Medio</td><td>${esc(o.paymentMethod || '—')}${
    o.paymentType ? ' / ' + esc(o.paymentType) : ''
  }</td></tr>
      <tr><td style="padding:3px 0;color:#666">ID de pago MP</td><td>${esc(o.paymentId || '—')}</td></tr>
      <tr><td style="padding:3px 0;color:#666">Fecha</td><td>${esc(o.paymentDate || '—')}</td></tr>
    </table>
    ${
      isPendingTransfer(o)
        ? `<p style="margin:14px 0;padding:10px;background:#fff7ed;border-left:3px solid #f59e0b;font-size:14px">
             <strong>⏳ Esperando comprobante</strong> — el cliente va a enviarlo por WhatsApp. Datos que le dimos:
           </p>${bankTransferHtml()}`
        : ''
    }

    <p style="margin-top:24px;font-size:12px;color:#999">Notificación automática de la tienda EPICALCOS.</p>
  </div>`;
}

function buildEmailText(o) {
  const pendingTransfer = isPendingTransfer(o);
  const manualDigital =
    o.paymentStatus === 'approved' && needsManualDelivery(o)
      ? `\n⚠️ HAY QUE MANDAR EL ARCHIVO A MANO — mandale la descarga a ${o.email}.\n` +
        `   Para automatizarlo, cargá en Netlify: ${digitalDeliveries(o)
          .filter((d) => !d.url)
          .map((d) => d.envVar)
          .join(', ')}\n`
      : '';
  // Espejo en texto del bloque de entrega tras confirmar la transferencia.
  const entregaTrasConfirmar = (() => {
    if (!esperaConfirmacionParaEntregar(o)) return '';
    const url = linkEntrega(o.orderId, process.env.URL);
    return (
      `\n📩 ARCHIVOS PENDIENTES DE ENTREGA — el cliente todavía NO recibió la descarga.\n` +
      (url
        ? `   Cuando tengas el comprobante, entregáselos acá:\n   ${url}\n`
        : `   Cargá DIGITAL_DELIVERY_SECRET en Netlify para entregarlo desde el mail.\n` +
          `   Por ahora, mandale la descarga a ${o.email} a mano.\n`)
    );
  })();
  return `NUEVO PEDIDO EPICALCOS — Ref: ${o.orderId}
Estado del pago: ${statusLabel(o)}
${manualDigital}${entregaTrasConfirmar}
CLIENTE
  Nombre: ${o.name}
  Email: ${o.email}
  Teléfono: ${o.phone}

ENTREGA
  Método: ${o.shippingMethod}
  Dirección: ${o.address}
  Ciudad: ${o.city} (${o.province}) — CP ${o.zipCode}
  Costo envío: ${money(o.shippingCost)}

PEDIDO
${itemsText(o.items)}

${o.comments ? 'COMENTARIOS / DETALLE:\n  ' + o.comments + '\n' : ''}
PAGO
  ${pendingTransfer ? 'Total a transferir' : 'Monto pagado'}: ${money(o.amountPaid ?? o.total)}
  Medio: ${o.paymentMethod || '—'}${o.paymentType ? ' / ' + o.paymentType : ''}
  ID de pago MP: ${o.paymentId || '—'}
  Fecha: ${o.paymentDate || '—'}
${pendingTransfer ? '\nESPERANDO COMPROBANTE (WhatsApp). Datos que le dimos:\n' + bankTransferText() + '\n' : ''}`;
}

/**
 * Plazo estimado según el método/zona de entrega (etiqueta de shippingMethodLabel).
 * Espejo de shipping.productionDays* en frontend/src/config/site.js.
 */
function customerTimeline(o) {
  const method = String(o.shippingMethod || '');
  if (/retiro/i.test(method)) {
    return 'Tu pedido va a estar listo en 2 a 3 días hábiles. Te escribimos por WhatsApp para coordinar el retiro.';
  }
  if (/resto del país/i.test(method)) {
    return 'Tu pedido llega en 5 a 7 días hábiles. Te avisamos cuando lo despachemos.';
  }
  return 'Tu pedido llega en 2 a 3 días hábiles. Te avisamos cuando salga en camino.';
}

/** Primer nombre del cliente para el saludo (o vacío si no hay nombre). */
function firstName(o) {
  const n = String(o.name || '').trim();
  return n && n !== '—' ? n.split(/\s+/)[0] : '';
}

/**
 * Bloque de descarga de los ARCHIVOS IMPRIMIBLES para el mail al cliente.
 *
 * Es lo primero que tiene que ver quien compró un producto digital, así que va
 * arriba de todo, antes del detalle del pedido. Con el link configurado
 * (DIGITAL_LINK_*, ver lib/digital.js) lleva el botón de descarga; sin link, le
 * avisa que se lo mandamos a esa misma casilla — nunca se queda mudo.
 *
 * Con el pago por transferencia todavía sin confirmar no se entrega nada: el
 * link sale recién cuando el pago está aprobado.
 */
function digitalDeliveryHtml(o) {
  const entregas = digitalDeliveries(o);
  if (entregas.length === 0) return '';

  if (isPendingTransfer(o)) {
    return `
      <div style="margin:0 0 18px;padding:14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:14px">
        <strong>📩 Tus archivos imprimibles</strong><br>
        Te los mandamos a este mismo mail apenas confirmemos tu transferencia.
      </div>`;
  }

  const filas = entregas
    .map((d) =>
      d.url
        ? `<p style="margin:10px 0 0">
             <a href="${esc(d.url)}" style="display:inline-block;background:#111;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">
               ⬇️ Descargar ${esc(d.title)}
             </a>
           </p>
           <p style="margin:6px 0 0;font-size:12px;color:#666;word-break:break-all">
             Si el botón no te funciona, copiá este link: ${esc(d.url)}
           </p>`
        : `<p style="margin:10px 0 0;font-size:14px">
             <strong>${esc(d.title)}</strong> — te lo mandamos a este mismo mail en las próximas horas.
           </p>`
    )
    .join('');

  return `
    <div style="margin:0 0 18px;padding:16px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px">
      <strong style="font-size:15px">📩 Tus archivos imprimibles</strong>
      ${filas}
      <p style="margin:12px 0 0;font-size:12px;color:#666">
        Guardá este mail: podés volver a descargarlos cuando quieras.
      </p>
    </div>`;
}

/** Versión en texto plano del bloque de descarga (mismo criterio que el HTML). */
function digitalDeliveryText(o) {
  const entregas = digitalDeliveries(o);
  if (entregas.length === 0) return '';
  if (isPendingTransfer(o)) {
    return '\nTUS ARCHIVOS IMPRIMIBLES\nTe los mandamos a este mismo mail apenas confirmemos tu transferencia.\n';
  }
  const filas = entregas
    .map((d) =>
      d.url
        ? `  ${d.title}: ${d.url}`
        : `  ${d.title}: te lo mandamos a este mismo mail en las próximas horas.`
    )
    .join('\n');
  return `\nTUS ARCHIVOS IMPRIMIBLES\n${filas}\n\nGuardá este mail: podés volver a descargarlos cuando quieras.\n`;
}

function buildCustomerEmailHtml(o) {
  const saludo = firstName(o) ? `¡Hola ${esc(firstName(o))}!` : '¡Hola!';
  const esRetiro = /retiro/i.test(String(o.shippingMethod || ''));
  const esDigital = /entrega por email/i.test(String(o.shippingMethod || ''));
  const pendingTransfer = isPendingTransfer(o);

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:620px;margin:0 auto;color:#111">
    <div style="background:#111;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:22px;letter-spacing:1px">EPICALCOS</h1>
      <p style="margin:4px 0 0;font-size:14px;color:#ddd">Calcos premium para personalizar lo que quieras</p>
    </div>

    <div style="padding:24px;border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px">
      <h2 style="margin:0 0 6px">${pendingTransfer ? '📥' : '✅'} ${saludo} Recibimos tu pedido</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#444">
        ${
          pendingTransfer
            ? 'Ahora necesitamos que hagas la transferencia y nos envíes el comprobante para pasar a producción.'
            : 'Tu pago fue aprobado y ya estamos preparando todo.'
        }
        Guardá este mail como comprobante.<br>
        <strong>Número de pedido:</strong> ${esc(o.orderId)}
      </p>

      ${digitalDeliveryHtml(o)}

      <h3 style="margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:4px">Tu pedido</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:6px 10px;text-align:left">Producto</th>
            <th style="padding:6px 10px;text-align:center">Cant.</th>
            <th style="padding:6px 10px;text-align:right">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsHtml(o.items)}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:10px;text-align:right;font-weight:bold">${pendingTransfer ? 'Total a transferir' : 'Total pagado'}</td>
            <td style="padding:10px;text-align:right;font-size:18px"><strong>${money(o.amountPaid ?? o.total)}</strong></td>
          </tr>
        </tfoot>
      </table>

      ${
        pendingTransfer
          ? `<h3 style="margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:4px">Datos para transferir</h3>
             ${bankTransferHtml()}
             <p style="margin:14px 0;padding:12px;background:#fff7ed;border-left:3px solid #f59e0b;font-size:14px">
               📲 Cuando hagas la transferencia, enviá el comprobante por WhatsApp al
               <a href="${CONTACT.whatsappUrl}" style="color:#111"><strong>${CONTACT.whatsappDisplay}</strong></a>
               para que empecemos a producir tu pedido.
             </p>`
          : ''
      }

      ${
        // Un pedido de solo archivos no tiene entrega que detallar: el bloque de
        // descarga de arriba ya dijo todo, y repetir "Método / Dirección" con
        // los campos vacíos solo ensucia el mail.
        esDigital
          ? ''
          : `<h3 style="margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:4px">Entrega</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:3px 0;width:140px;color:#666">Método</td><td>${esc(o.shippingMethod)}</td></tr>
        ${
          esRetiro
            ? ''
            : `<tr><td style="padding:3px 0;color:#666">Dirección</td><td>${esc(o.address)}</td></tr>
        <tr><td style="padding:3px 0;color:#666">Ciudad</td><td>${esc(o.city)} (${esc(o.province)}) — CP ${esc(o.zipCode)}</td></tr>`
        }
      </table>`
      }

      ${
        pendingTransfer || esDigital
          ? ''
          : `<p style="margin:16px 0;padding:12px;background:#f0fdf4;border-left:3px solid #16a34a;font-size:14px">
               ${esc(customerTimeline(o))}
             </p>`
      }

      <p style="margin:16px 0 0;font-size:14px;color:#444">
        ¿Dudas o cambios? Escribinos:<br>
        📱 WhatsApp: <a href="${CONTACT.whatsappUrl}" style="color:#111">${CONTACT.whatsappDisplay}</a><br>
        📷 Instagram: <a href="${CONTACT.instagramUrl}" style="color:#111">${CONTACT.instagram}</a><br>
        ✉️ Email: <a href="mailto:${CONTACT.email}" style="color:#111">${CONTACT.email}</a>
      </p>

      <p style="margin-top:24px;font-size:12px;color:#999">
        ¡Gracias por elegir EPICALCOS! 💜 — Rosario, Santa Fe, Argentina
      </p>
    </div>
  </div>`;
}

function buildCustomerEmailText(o) {
  const saludo = firstName(o) ? `¡Hola ${firstName(o)}!` : '¡Hola!';
  const esRetiro = /retiro/i.test(String(o.shippingMethod || ''));
  const esDigital = /entrega por email/i.test(String(o.shippingMethod || ''));
  const pendingTransfer = isPendingTransfer(o);
  return `${saludo} Recibimos tu pedido — EPICALCOS

${
  pendingTransfer
    ? 'Ahora necesitamos que hagas la transferencia y nos envíes el comprobante para pasar a producción.'
    : 'Tu pago fue aprobado y ya estamos preparando todo.'
}
Número de pedido: ${o.orderId}
${digitalDeliveryText(o)}
TU PEDIDO
${itemsText(o.items)}

${pendingTransfer ? 'Total a transferir' : 'Total pagado'}: ${money(o.amountPaid ?? o.total)}
${
  pendingTransfer
    ? `\nDATOS PARA TRANSFERIR\n${bankTransferText()}\n\nCuando hagas la transferencia, enviá el comprobante por WhatsApp al ${CONTACT.whatsappDisplay} para que empecemos a producir tu pedido.\n`
    : ''
}
${
  esDigital
    ? ''
    : `ENTREGA
  Método: ${o.shippingMethod}
${esRetiro ? '' : `  Dirección: ${o.address}\n  Ciudad: ${o.city} (${o.province}) — CP ${o.zipCode}\n`}`
}
${pendingTransfer || esDigital ? '' : customerTimeline(o)}

¿Dudas o cambios? Escribinos:
  WhatsApp: ${CONTACT.whatsappDisplay} (${CONTACT.whatsappUrl})
  Instagram: ${CONTACT.instagram}
  Email: ${CONTACT.email}

¡Gracias por elegir EPICALCOS!
`;
}

// ─── Envío resiliente ─────────────────────────────────────────────────────────
//
// El mail del pedido es el ÚNICO registro que tiene EPICALCOS de una venta:
// Blobs está caído en runtime, así que si el POST a Resend falla no queda nada
// que consultar después. Un pedido que no avisa es un pedido perdido. Por eso
// el envío no es "un fetch y si sale, sale":
//
//   - reintenta los fallos transitorios (timeout, 429 del rate limit de 2/s,
//     5xx de Resend). Un 429 llegaba justo cuando salen los dos mails a la vez;
//   - NO reintenta lo que no mejora reintentando (422 mail inválido, 403 key
//     mala): repetirlo solo quema el presupuesto de tiempo;
//   - corta cada intento con AbortController. Sin timeout, un Resend colgado se
//     come los 10 s de la función y Netlify la mata ANTES de responder: el mail
//     no sale y el cliente ve un error;
//   - respeta un `deadline` global por el mismo motivo.

const RESEND_TIMEOUT_MS = 2500;
const RESEND_MAX_INTENTOS = 3;
// Espera entre intentos. El primer reintento es casi inmediato porque el fallo
// típico (429) se destraba en menos de un segundo.
const RESEND_BACKOFF_MS = [300, 900];

/** 4xx que no son 408/429: repetirlos da exactamente el mismo error. */
const noVaAMejorar = (status) => status >= 400 && status < 500 && status !== 408 && status !== 429;

/**
 * POST a Resend con reintentos, timeout por intento y deadline global.
 * Nunca lanza: devuelve { sent, reason?, detail?, intentos, id? }.
 *
 * `idempotencyKey` hace que un reintento NO duplique el mail: si el primer
 * intento llegó a Resend y la respuesta se perdió, el segundo devuelve el mismo
 * envío en vez de mandar otro. También cubre los reintentos del webhook de
 * Mercado Pago, que hoy no tienen dedup propio porque vivía en Blobs.
 *
 * @param {object} payload cuerpo para POST https://api.resend.com/emails
 * @param {string} etiqueta nombre para los logs (ej. 'interno EPI-…')
 * @param {{ idempotencyKey?: string, deadline?: number }} opts
 */
async function enviarConResend(payload, etiqueta, { idempotencyKey, deadline } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[notify] RESEND_API_KEY no configurada — se omite ${etiqueta}.`);
    return { sent: false, reason: 'no_api_key', intentos: 0 };
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  let ultimo = { sent: false, reason: 'sin_intentos', intentos: 0 };

  for (let intento = 1; intento <= RESEND_MAX_INTENTOS; intento++) {
    if (deadline && Date.now() >= deadline) {
      console.error(`[notify] sin tiempo para reintentar ${etiqueta} (intentos: ${intento - 1})`);
      return { ...ultimo, reason: ultimo.reason === 'sin_intentos' ? 'sin_tiempo' : ultimo.reason };
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), RESEND_TIMEOUT_MS);
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        console.log(`[notify] ${etiqueta} enviado (intento ${intento}) id=${data?.id || '?'}`);
        return { sent: true, id: data?.id, intentos: intento };
      }

      const detail = await res.text().catch(() => '');
      ultimo = { sent: false, reason: `resend_${res.status}`, detail, intentos: intento };
      console.error(`[notify] ${etiqueta}: Resend respondió ${res.status} (intento ${intento})`, detail);
      if (noVaAMejorar(res.status)) return ultimo;
    } catch (err) {
      const timeout = err?.name === 'AbortError';
      ultimo = {
        sent: false,
        reason: timeout ? 'timeout' : 'exception',
        detail: err?.message,
        intentos: intento
      };
      console.error(`[notify] ${etiqueta}: ${ultimo.reason} (intento ${intento})`, err?.message || err);
    } finally {
      clearTimeout(timer);
    }

    const espera = RESEND_BACKOFF_MS[intento - 1];
    if (intento < RESEND_MAX_INTENTOS && espera) {
      if (deadline && Date.now() + espera >= deadline) break;
      await new Promise((r) => setTimeout(r, espera));
    }
  }

  return ultimo;
}

/**
 * Envía el mail del pedido vía Resend. No-op si falta RESEND_API_KEY.
 * @param {object} o vista de pedido (buildOrderView)
 * @param {{ deadline?: number }} opts corte de tiempo para los reintentos
 */
export async function sendOrderEmail(o, { deadline } = {}) {
  const to = (process.env.NOTIFY_EMAIL_TO || DEFAULT_TO)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.NOTIFY_EMAIL_FROM || DEFAULT_FROM;

  // Armar el mail va DENTRO del try. Estaba afuera, y con eso alcanzaba para
  // que un pedido con un item raro tirara una excepción antes del fetch: el
  // aviso no salía y, encima, la excepción se propagaba hasta el handler y le
  // devolvía un 500 al cliente. El contenido del mail nunca puede voltear al
  // mail.
  let payload;
  try {
    // El prefijo 📩 marca los pedidos con archivos pendientes de entrega: en la
    // bandeja se ven de un vistazo. Son DOS casos distintos y conviene
    // distinguirlos, porque piden acciones distintas:
    //   - ENVIAR ARCHIVO      → ya está pagado, hay que mandarlo YA a mano
    //     (falta el DIGITAL_LINK_*, así que el mail al cliente salió sin descarga)
    //   - ENTREGAR AL CONFIRMAR → transferencia pendiente, se entrega recién
    //     cuando llegue el comprobante (botón en el cuerpo del mail)
    const prefijo =
      o.paymentStatus === 'approved' && needsManualDelivery(o)
        ? '📩 ENVIAR ARCHIVO · '
        : esperaConfirmacionParaEntregar(o)
          ? '📩 ENTREGAR AL CONFIRMAR · '
          : '';
    payload = {
      from,
      to,
      reply_to: o.email && o.email !== '—' ? o.email : undefined,
      subject: `${prefijo}🛒 Nuevo pedido ${o.orderId} — ${o.name} — ${money(o.amountPaid ?? o.total)}`,
      html: buildEmailHtml(o),
      text: buildEmailText(o)
    };
  } catch (err) {
    // Plan B: mejor un aviso feo que ningún aviso. El pedido crudo va en el
    // cuerpo para poder atenderlo igual.
    console.error('[notify] no se pudo armar el aviso interno, se manda crudo:', err?.message || err);
    payload = {
      from,
      to,
      subject: `⚠️ Nuevo pedido ${o?.orderId || 'sin-referencia'} (aviso degradado)`,
      text:
        'No se pudo armar el mail normal del pedido. Datos crudos:\n\n' +
        JSON.stringify(o, null, 2).slice(0, 20000)
    };
  }

  return enviarConResend(payload, `aviso interno ${o?.orderId || '?'}`, {
    idempotencyKey: o?.orderId ? `interno-${o.orderId}` : undefined,
    deadline
  });
}

/**
 * Envía al CLIENTE el mail de confirmación con el resumen de su pedido.
 * No-op si falta RESEND_API_KEY, si el pedido no tiene email, o si el
 * remitente sigue siendo el default onboarding@resend.dev (Resend no permite
 * mandar a terceros desde esa dirección — hay que verificar un dominio
 * propio y setear NOTIFY_EMAIL_FROM). Nunca lanza.
 * @param {object} o vista de pedido (buildOrderView)
 */
export async function sendCustomerEmail(o, { deadline } = {}) {
  const email = String(o.email || '').trim();
  if (!email || !email.includes('@')) {
    console.log('[notify] pedido sin email de cliente — se omite el mail al cliente.');
    return { sent: false, reason: 'no_customer_email' };
  }

  const from = process.env.NOTIFY_EMAIL_FROM || DEFAULT_FROM;
  if (from.includes('resend.dev')) {
    console.warn(
      '[notify] NOTIFY_EMAIL_FROM es el default de Resend (resend.dev): no se puede ' +
        'enviar a clientes. Verificá un dominio en Resend y seteá NOTIFY_EMAIL_FROM.'
    );
    return { sent: false, reason: 'unverified_sender' };
  }

  let payload;
  try {
    payload = {
      from,
      to: [email],
      reply_to: CONTACT.email,
      subject: `✅ Pedido confirmado ${o.orderId} — EPICALCOS`,
      html: buildCustomerEmailHtml(o),
      text: buildCustomerEmailText(o)
    };
  } catch (err) {
    // Al cliente NO se le manda un mail degradado: un "pedido confirmado" con
    // JSON adentro es peor que no mandarlo. El que tiene que enterarse es
    // EPICALCOS, y de eso se ocupa el aviso de notifyOrder().
    console.error('[notify] no se pudo armar el mail al cliente:', err?.message || err);
    return { sent: false, reason: 'build_failed', detail: err?.message };
  }

  return enviarConResend(payload, `confirmación a ${email}`, {
    idempotencyKey: o?.orderId ? `cliente-${o.orderId}` : undefined,
    deadline
  });
}

/**
 * Mail de ALARMA a la casilla interna. Para avisos operativos que no son un
 * pedido (ver canario-blobs.js). Nunca lanza.
 *
 * `clave` va como Idempotency-Key: con la misma clave, Resend manda UNO solo.
 * Sirve para que una alarma que se repite —un cron que corre varias veces, o
 * alguien que golpea el endpoint— no llene la casilla de copias del mismo
 * problema. Una alarma repetida se deja de leer, y ahí deja de ser una alarma.
 *
 * @param {{subject: string, text: string, clave?: string}} aviso
 */
export async function sendAlertEmail({ subject, text, clave }) {
  const to = (process.env.NOTIFY_EMAIL_TO || DEFAULT_TO)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.NOTIFY_EMAIL_FROM || DEFAULT_FROM;

  return enviarConResend({ from, to, subject, text }, `alarma "${subject}"`, {
    idempotencyKey: clave
  });
}

/**
 * Crea una fila en una base de datos de Notion como CRM de pedidos.
 * No-op si faltan NOTION_TOKEN / NOTION_DATABASE_ID.
 *
 * La base de datos debe tener estas propiedades (ver README):
 *   Pedido (Title) · Estado (Select) · Cliente (Text) · Email (Email)
 *   Teléfono (Phone) · Total (Number) · Envío (Text) · Fecha (Date)
 * Si alguna no existe, Notion rechaza solo esa propiedad; igual cargamos
 * el detalle completo en el cuerpo de la página.
 * @param {object} o vista de pedido (buildOrderView)
 */
export async function createNotionRow(o) {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!token || !databaseId) {
    console.log('[notify] Notion no configurado — se omite el CRM.');
    return { created: false, reason: 'not_configured' };
  }

  const properties = {
    Pedido: { title: [{ text: { content: o.orderId } }] },
    Estado: { select: { name: o.paymentStatus || 'pendiente' } },
    Cliente: { rich_text: [{ text: { content: String(o.name) } }] },
    Total: { number: Number(o.amountPaid ?? o.total) || 0 },
    Envío: {
      rich_text: [
        { text: { content: `${o.shippingMethod} — ${o.address}, ${o.city} (CP ${o.zipCode})` } }
      ]
    }
  };
  if (o.email && o.email !== '—') properties.Email = { email: o.email };
  if (o.phone && o.phone !== '—') properties['Teléfono'] = { phone_number: String(o.phone) };
  if (o.paymentDate)
    properties.Fecha = { date: { start: new Date(o.paymentDate).toISOString() } };

  const detalle = buildEmailText(o);
  const children = [
    {
      object: 'block',
      type: 'code',
      code: {
        language: 'plain text',
        rich_text: [{ type: 'text', text: { content: detalle.slice(0, 1990) } }]
      }
    }
  ];

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
        children
      })
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[notify] Notion respondió', res.status, detail);
      return { created: false, reason: `notion_${res.status}`, detail };
    }
    console.log('[notify] fila creada en Notion para', o.orderId);
    return { created: true };
  } catch (err) {
    console.error('[notify] error creando fila en Notion:', err?.message || err);
    return { created: false, reason: 'exception', detail: err?.message };
  }
}

/**
 * Notifica internamente (mail a EPICALCOS) que el popup de bienvenida capturó
 * un mail nuevo. No-op si falta RESEND_API_KEY. Nunca lanza.
 * @param {string} email
 */
export async function sendLeadEmail(email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[notify] RESEND_API_KEY no configurada — se omite el mail de lead.');
    return { sent: false, reason: 'no_api_key' };
  }

  const to = (process.env.NOTIFY_EMAIL_TO || DEFAULT_TO)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.NOTIFY_EMAIL_FROM || DEFAULT_FROM;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject: `📧 Nuevo lead (popup 10% OFF) — ${email}`,
        html: `<p>Alguien dejó su mail en el popup de bienvenida.</p><p><strong>Mail:</strong> ${esc(email)}</p><p>Se le mandó el cupón <strong>EPICA10</strong> (si el remitente está verificado en Resend).</p>`,
        text: `Nuevo lead (popup 10% OFF)\nMail: ${email}\nCupón enviado: EPICA10`
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[notify] Resend (lead) respondió', res.status, detail);
      return { sent: false, reason: `resend_${res.status}`, detail };
    }
    console.log('[notify] mail de lead enviado a', to.join(', '));
    return { sent: true };
  } catch (err) {
    console.error('[notify] error enviando mail de lead:', err?.message || err);
    return { sent: false, reason: 'exception', detail: err?.message };
  }
}

/**
 * Envía el cupón al mail que dejó en el popup. Mismo requisito que
 * sendCustomerEmail: necesita NOTIFY_EMAIL_FROM con dominio propio verificado
 * (con el default onboarding@resend.dev, Resend no permite mandar a terceros).
 * El código igual se muestra en pantalla al instante, así que esto es un
 * "además" — no-op silencioso si no está configurado. Nunca lanza.
 * @param {string} email
 * @param {string} code
 */
export async function sendLeadCouponEmail(email, code) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: 'no_api_key' };

  const from = process.env.NOTIFY_EMAIL_FROM || DEFAULT_FROM;
  if (from.includes('resend.dev')) {
    return { sent: false, reason: 'unverified_sender' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to: CONTACT.email,
        subject: `🎁 Tu 10% OFF en EPICALCOS: ${code}`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111">
            <div style="background:#111;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0">
              <h1 style="margin:0;font-size:22px;letter-spacing:1px">EPICALCOS</h1>
            </div>
            <div style="padding:24px;border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px">
              <h2 style="margin:0 0 10px">🎁 ¡Gracias por sumarte!</h2>
              <p style="font-size:14px;color:#444">Usá este código en tu próxima compra y llevate 10% OFF:</p>
              <p style="font-size:28px;font-weight:800;letter-spacing:2px;background:#f5f5f5;padding:14px;text-align:center;border-radius:10px;margin:16px 0">${esc(code)}</p>
              <p style="font-size:13px;color:#666">Lo cargás en el campo "Código de descuento" del checkout, en epicalcos.com.</p>
            </div>
          </div>`,
        text: `¡Gracias por sumarte a EPICALCOS!\n\nTu código de 10% OFF: ${code}\n\nUsalo en el checkout de epicalcos.com.`
      })
    });
    if (!res.ok) return { sent: false, reason: `resend_${res.status}` };
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: 'exception', detail: err?.message };
  }
}

/**
 * Manda al mail de EPICALCOS una consulta del formulario de /contacto (spec 012).
 *
 * ⚠️ ES LA ÚNICA FUNCIÓN DE ESTE ARCHIVO QUE **SÍ** IMPORTA SI FALLA. El resto
 * son avisos sobre algo que ya pasó (un pedido que ya se pagó): si el mail no
 * sale, la venta existe igual. Acá el mail ES la consulta — si no sale, no
 * quedó nada en ningún lado. Por eso devuelve el motivo y `contacto.js` lo
 * traduce en un 502, en vez de tragárselo como hace capture-lead.
 *
 * Anda con el remitente default (onboarding@resend.dev) porque escribe A la
 * casilla dueña de la cuenta de Resend. La restricción de dominio verificado
 * aplica a los mails que salen a terceros (ver sendCustomerEmail).
 *
 * @param {{nombre:string,email:string,telefono:string,ciudad:string,provincia:string,consulta:string}} c
 */
export async function sendContactEmail(c) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[notify] RESEND_API_KEY no configurada — no se puede enviar la consulta.');
    return { sent: false, reason: 'no_api_key' };
  }

  const to = (process.env.NOTIFY_EMAIL_TO || DEFAULT_TO)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.NOTIFY_EMAIL_FROM || DEFAULT_FROM;

  const fila = (etiqueta, valor) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap">${etiqueta}</td>` +
    `<td style="padding:6px 0"><strong>${esc(valor)}</strong></td></tr>`;

  // El wa.me con el teléfono ya cargado: responder por WhatsApp es un click en
  // vez de copiar el número a mano.
  //
  // Solo se arma cuando el número es INEQUÍVOCO: 10 dígitos (341 680 6675) o
  // ya con el 54 adelante. Un "0341 15 680 6675" queda sin link a propósito —
  // el 0 y el 15 no se pueden sacar sin adivinar, y un link a un número
  // equivocado es peor que no tener link: el teléfono está ahí arriba igual.
  const d = String(c.telefono || '').replace(/\D/g, '');
  const waLink = d.startsWith('54')
    ? `https://wa.me/${d}`
    : d.length === 10
    ? `https://wa.me/549${d}`
    : null;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to,
        // Responder desde Gmail le contesta AL CLIENTE, no a Resend.
        reply_to: c.email,
        subject: `💬 Consulta web de ${c.nombre} (${c.ciudad}, ${c.provincia})`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
            <div style="background:#111;color:#fff;padding:16px 22px;border-radius:12px 12px 0 0">
              <h1 style="margin:0;font-size:18px;letter-spacing:1px">EPICALCOS · consulta desde la web</h1>
            </div>
            <div style="padding:22px;border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px">
              <table style="font-size:14px;border-collapse:collapse">
                ${fila('Nombre', c.nombre)}
                ${fila('Email', c.email)}
                ${fila('Teléfono', c.telefono)}
                ${fila('Ciudad', c.ciudad)}
                ${fila('Provincia', c.provincia)}
              </table>
              <p style="margin:18px 0 6px;color:#666;font-size:13px">Consulta</p>
              <div style="white-space:pre-wrap;font-size:15px;line-height:1.5;background:#f7f7f7;padding:14px;border-radius:10px">${esc(c.consulta)}</div>
              <p style="margin:18px 0 0;font-size:13px;color:#666">
                Respondé este mail y le llega a ${esc(c.email)}${waLink ? ` · <a href="${waLink}" style="color:#111">abrir WhatsApp</a>` : ''}
              </p>
            </div>
          </div>`,
        text:
          `Consulta desde la web\n\n` +
          `Nombre: ${c.nombre}\nEmail: ${c.email}\nTeléfono: ${c.telefono}\n` +
          `Ciudad: ${c.ciudad}\nProvincia: ${c.provincia}\n\n${c.consulta}\n`
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[notify] Resend (contacto) respondió', res.status, detail);
      return { sent: false, reason: `resend_${res.status}`, detail };
    }
    console.log('[notify] consulta de contacto enviada a', to.join(', '));
    return { sent: true };
  } catch (err) {
    console.error('[notify] error enviando la consulta de contacto:', err?.message || err);
    return { sent: false, reason: 'exception', detail: err?.message };
  }
}

/**
 * Presupuesto por defecto para mandar los mails de un pedido.
 *
 * Netlify mata la función a los 10 s. Los mails van PRIMEROS y se quedan con la
 * mayor parte del presupuesto; lo que sobra es para el CRM y Blobs, que son
 * best-effort. Al revés (como estaba) el mail salía con los restos del tiempo,
 * después de tres llamadas de red que podían colgarse.
 */
const PRESUPUESTO_MAILS_MS = 6000;

/**
 * Dispara todas las notificaciones configuradas. Nunca lanza.
 *
 * Los dos mails van en paralelo y con reintentos propios: el aviso interno y la
 * confirmación al cliente no se pisan, y que uno falle no cancela al otro.
 * Notion queda para el final porque no tiene timeout propio y no puede
 * quedarse con el tiempo de los mails.
 *
 * @param {object} o vista de pedido (buildOrderView)
 * @param {{ deadline?: number }} opts
 */
export async function notifyOrder(o, { deadline } = {}) {
  const corte = deadline || Date.now() + PRESUPUESTO_MAILS_MS;

  const [email, customerEmail] = await Promise.all([
    sendOrderEmail(o, { deadline: corte }),
    sendCustomerEmail(o, { deadline: corte })
  ]);

  // Si el aviso interno salió pero la confirmación al cliente no, EPICALCOS
  // tiene que enterarse AHORA: el cliente está esperando un mail que no va a
  // llegar y desde afuera parece que el pedido no entró. Antes esto solo
  // quedaba en un console.error que nadie mira.
  if (email.sent && !customerEmail.sent && customerEmail.reason !== 'no_customer_email') {
    await avisarFalloConfirmacion(o, customerEmail, corte);
  }

  const notion = await createNotionRow(o).catch((err) => ({
    created: false,
    reason: 'exception',
    detail: err?.message
  }));

  return { email, customerEmail, notion };
}

/**
 * Segundo mail a EPICALCOS avisando que la confirmación al cliente NO salió.
 * Corto a propósito: es una alarma, no un informe. Nunca lanza.
 */
async function avisarFalloConfirmacion(o, resultado, deadline) {
  const to = (process.env.NOTIFY_EMAIL_TO || DEFAULT_TO)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.NOTIFY_EMAIL_FROM || DEFAULT_FROM;
  const email = o?.email || '—';

  return enviarConResend(
    {
      from,
      to,
      subject: `⚠️ NO le llegó la confirmación a ${email} — pedido ${o?.orderId || '?'}`,
      text:
        `El pedido ${o?.orderId || '?'} entró bien, pero el mail de confirmación al ` +
        `cliente NO se pudo enviar.\n\n` +
        `Cliente: ${o?.name || '—'}\n` +
        `Mail: ${email}\n` +
        `Teléfono: ${o?.phone || '—'}\n` +
        `Motivo: ${resultado?.reason || '?'} ${resultado?.detail || ''}\n\n` +
        `Escribile vos por WhatsApp para confirmarle el pedido.`
    },
    `alerta confirmación ${o?.orderId || '?'}`,
    { idempotencyKey: o?.orderId ? `alerta-cliente-${o.orderId}` : undefined, deadline }
  );
}

// ─── Recordatorio de carrito abandonado ───────────────────────────────────────

/**
 * Mail de recuperación de carrito. Ver netlify/functions/abandoned-cart.js.
 *
 * Es UN solo mail por carrito, no una secuencia: el que abandona y no vuelve
 * con un recordatorio tampoco vuelve con tres, y la diferencia entre recordar y
 * hostigar es justamente esa.
 *
 * Lleva SIEMPRE link de baja en un click. Sin `unsubscribeUrl` no se manda:
 * mandar un mail comercial sin salida es lo que convierte un recordatorio útil
 * en spam.
 *
 * No-op si falta RESEND_API_KEY o si el remitente sigue siendo el default de
 * Resend (onboarding@resend.dev no puede escribirle a terceros).
 */
export async function sendAbandonedCartEmail({ email, nombre, items, total, unsubscribeUrl, cartUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: 'no_api_key' };
  if (!email || !unsubscribeUrl) return { sent: false, reason: 'missing_email_or_unsubscribe' };

  const from = process.env.NOTIFY_EMAIL_FROM || DEFAULT_FROM;
  if (/resend\.dev/i.test(from)) {
    console.warn('[notify] NOTIFY_EMAIL_FROM es el default de Resend: no se puede escribir a clientes.');
    return { sent: false, reason: 'from_not_verified' };
  }

  const saludo = nombre ? `Hola ${esc(String(nombre).split(/\s+/)[0])},` : 'Hola,';
  const unidades = items.reduce((a, i) => a + i.quantity, 0);
  const queda = unidades === 1 ? 'quedó una calco' : `quedaron ${unidades} calcos`;

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#111111;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#ffffff">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <h1 style="font-size:22px;margin:0 0 4px">${saludo}</h1>
    <p style="color:#c9c9c9;font-size:15px;line-height:1.55;margin:0 0 20px">
      Te ${queda} en el carrito. Te lo dejamos guardado por si querés terminar la compra.
    </p>

    ${itemsHtml(items)}

    <p style="font-size:17px;font-weight:700;margin:18px 0 22px">Total: ${money(total)}</p>

    <p style="margin:0 0 26px">
      <a href="${esc(cartUrl)}" style="display:inline-block;background:linear-gradient(135deg,#FF1B8D,#FF5A1F);color:#fff;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:999px">
        Terminar mi compra
      </a>
    </p>

    <p style="color:#8f8f8f;font-size:13px;line-height:1.5;margin:0 0 6px">
      Si ya lo compraste, ignorá este mail. Cualquier duda, respondé y te contestamos.
    </p>
    <p style="color:#6d6d6d;font-size:12px;margin:18px 0 0">
      <a href="${esc(unsubscribeUrl)}" style="color:#6d6d6d">No quiero recibir más recordatorios</a>
    </p>
  </div>
</body></html>`;

  const text = `${nombre ? `Hola ${String(nombre).split(/\s+/)[0]},` : 'Hola,'}

Te ${queda} en el carrito. Te lo dejamos guardado por si querés terminar la compra.

${itemsText(items)}
Total: ${money(total)}

Terminar mi compra: ${cartUrl}

Si ya lo compraste, ignorá este mail.
No quiero recibir más recordatorios: ${unsubscribeUrl}
`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Te quedó el carrito a medio armar 🛒',
        html,
        text,
        // Baja en un click desde el propio cliente de mail (RFC 8058): Gmail lo
        // muestra al lado del remitente y evita que te marquen como spam.
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[notify] Resend (carrito) respondió', res.status, detail);
      return { sent: false, reason: `resend_${res.status}`, detail };
    }
    return { sent: true };
  } catch (err) {
    console.error('[notify] error enviando recordatorio:', err?.message || err);
    return { sent: false, reason: 'exception', detail: err?.message };
  }
}
