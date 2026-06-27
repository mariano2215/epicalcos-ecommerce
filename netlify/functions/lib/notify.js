/**
 * Notificaciones de pedidos: envío de mail a EPICALCOS y/o alta en un CRM (Notion).
 *
 * Todo es opcional y se activa por variables de entorno. Si no hay nada
 * configurado, simplemente no notifica (y lo deja logueado). Ninguna de estas
 * funciones lanza: el webhook SIEMPRE tiene que responder 200 a Mercado Pago.
 *
 * Variables de entorno (Netlify dashboard → Environment variables):
 *
 *   --- Mail (Resend, https://resend.com — gratis hasta 3000 mails/mes) ---
 *   RESEND_API_KEY      → API key de Resend (empieza con "re_")
 *   NOTIFY_EMAIL_TO     → destino (default: epicalcos@gmail.com)
 *   NOTIFY_EMAIL_FROM   → remitente verificado (default: onboarding@resend.dev)
 *
 *   --- CRM (Notion, opcional) ---
 *   NOTION_TOKEN        → token de integración interna de Notion (empieza con "ntn_" o "secret_")
 *   NOTION_DATABASE_ID  → id de la base de datos donde se cargan los pedidos
 */

const DEFAULT_TO = 'epicalcos@gmail.com';
const DEFAULT_FROM = 'EPICALCOS <onboarding@resend.dev>';

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
 * Construye un objeto de pedido "plano" combinando lo guardado en Blobs con la
 * info del pago de Mercado Pago. Tolera que falte cualquiera de las dos fuentes.
 * @param {object|null} order  pedido guardado en create-preference
 * @param {object|null} payment objeto payment de Mercado Pago
 */
export function buildOrderView(order, payment) {
  const meta = payment?.metadata || {};
  const payer = order?.payer || {};
  const shipping = order?.shipping || {};

  // La metadata de MP llega con las claves en minúscula → fallback.
  return {
    orderId:
      order?.orderId || payment?.external_reference || 'sin-referencia',
    createdAt: order?.createdAt,
    name: payer.name || meta.buyer_name || payment?.payer?.first_name || '—',
    email:
      payer.email || payment?.payer?.email || meta.buyer_email || '—',
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
    items: order?.items || [],
    itemsTotal: order?.itemsTotal,
    total: order?.total,
    // Datos del pago confirmado
    paymentId: payment?.id,
    paymentStatus: payment?.status,
    paymentStatusDetail: payment?.status_detail,
    amountPaid: payment?.transaction_amount,
    paymentMethod: payment?.payment_method_id,
    paymentType: payment?.payment_type_id,
    paymentDate: payment?.date_approved || payment?.date_created
  };
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
          (o.paymentStatus || 'pendiente').toUpperCase()
        )}</span>`;

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:620px;margin:0 auto;color:#111">
    <h2 style="margin:0 0 4px">🛒 Nuevo pedido EPICALCOS</h2>
    <p style="margin:0 0 16px">${statusBadge} &nbsp; <strong>Ref:</strong> ${esc(o.orderId)}</p>

    <h3 style="margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:4px">Cliente</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:3px 0;width:140px;color:#666">Nombre</td><td><strong>${esc(o.name)}</strong></td></tr>
      <tr><td style="padding:3px 0;color:#666">Email</td><td>${esc(o.email)}</td></tr>
      <tr><td style="padding:3px 0;color:#666">Teléfono / WhatsApp</td><td>${esc(o.phone)}</td></tr>
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
      <tr><td style="padding:3px 0;width:140px;color:#666">Monto pagado</td><td style="font-size:18px"><strong>${money(
        o.amountPaid ?? o.total
      )}</strong></td></tr>
      <tr><td style="padding:3px 0;color:#666">Estado</td><td>${esc(o.paymentStatus || '—')} ${
    o.paymentStatusDetail ? '(' + esc(o.paymentStatusDetail) + ')' : ''
  }</td></tr>
      <tr><td style="padding:3px 0;color:#666">Medio</td><td>${esc(o.paymentMethod || '—')} / ${esc(
    o.paymentType || '—'
  )}</td></tr>
      <tr><td style="padding:3px 0;color:#666">ID de pago MP</td><td>${esc(o.paymentId || '—')}</td></tr>
      <tr><td style="padding:3px 0;color:#666">Fecha</td><td>${esc(o.paymentDate || '—')}</td></tr>
    </table>

    <p style="margin-top:24px;font-size:12px;color:#999">Notificación automática de la tienda EPICALCOS.</p>
  </div>`;
}

function buildEmailText(o) {
  return `NUEVO PEDIDO EPICALCOS — Ref: ${o.orderId}
Estado del pago: ${o.paymentStatus || '—'}

CLIENTE
  Nombre: ${o.name}
  Email: ${o.email}
  Teléfono / WhatsApp: ${o.phone}

ENTREGA
  Método: ${o.shippingMethod}
  Dirección: ${o.address}
  Ciudad: ${o.city} (${o.province}) — CP ${o.zipCode}
  Costo envío: ${money(o.shippingCost)}

PEDIDO
${itemsText(o.items)}

${o.comments ? 'COMENTARIOS / DETALLE:\n  ' + o.comments + '\n' : ''}
PAGO
  Monto pagado: ${money(o.amountPaid ?? o.total)}
  Medio: ${o.paymentMethod || '—'} / ${o.paymentType || '—'}
  ID de pago MP: ${o.paymentId || '—'}
  Fecha: ${o.paymentDate || '—'}
`;
}

/**
 * Envía el mail del pedido vía Resend. No-op si falta RESEND_API_KEY.
 * @param {object} o vista de pedido (buildOrderView)
 */
export async function sendOrderEmail(o) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[notify] RESEND_API_KEY no configurada — se omite el mail.');
    return { sent: false, reason: 'no_api_key' };
  }

  const to = (process.env.NOTIFY_EMAIL_TO || DEFAULT_TO)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.NOTIFY_EMAIL_FROM || DEFAULT_FROM;

  const subject = `🛒 Nuevo pedido ${o.orderId} — ${o.name} — ${money(
    o.amountPaid ?? o.total
  )}`;

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
        reply_to: o.email && o.email !== '—' ? o.email : undefined,
        subject,
        html: buildEmailHtml(o),
        text: buildEmailText(o)
      })
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[notify] Resend respondió', res.status, detail);
      return { sent: false, reason: `resend_${res.status}`, detail };
    }
    console.log('[notify] mail enviado a', to.join(', '));
    return { sent: true };
  } catch (err) {
    console.error('[notify] error enviando mail:', err?.message || err);
    return { sent: false, reason: 'exception', detail: err?.message };
  }
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
 * Dispara todas las notificaciones configuradas. Nunca lanza.
 * @param {object} o vista de pedido (buildOrderView)
 */
export async function notifyOrder(o) {
  const [email, notion] = await Promise.all([
    sendOrderEmail(o),
    createNotionRow(o)
  ]);
  return { email, notion };
}
