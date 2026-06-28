/**
 * Helper de Notion CRM para las Netlify Functions (camino de producción).
 *
 * El prefijo "_" hace que Netlify NO lo despliegue como función propia: es código
 * compartido que esbuild bundlea dentro de las funciones que lo importan.
 *
 * Usa la API REST de Notion directamente con `fetch` (Node 20 trae fetch global),
 * para no depender de la versión del SDK y mantener el bundle chico.
 *
 * Variables de entorno (configurar en Netlify → Site settings → Environment variables):
 *   NOTION_TOKEN             → token de la integración interna "EPICALCOS Ecommerce"
 *   NOTION_CRM_DATABASE_ID   → opcional; default = base CRM EPICALCOS ya existente
 */

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const DB_ID = process.env.NOTION_CRM_DATABASE_ID || 'a2e218a7fa0a422a9d03a8efd965670b';

export const ESTADOS = {
  iniciado: 'Checkout iniciado',
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  rechazado: 'Rechazado',
};

/** Devuelve el token solo si está configurado de verdad (no el placeholder). */
function getToken() {
  const raw = process.env.NOTION_TOKEN;
  if (!raw || raw.includes('xxxx')) return null;
  return raw;
}

async function notionFetch(path, method, body) {
  const res = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    // No dejamos que un Notion lento/colgado bloquee el checkout.
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Notion ${method} ${path} → ${res.status} ${detail.slice(0, 300)}`);
  }
  return res.json();
}

/** Mapea el status de Mercado Pago a una opción de la columna Estado. */
export function mapEstado(mpStatus) {
  switch (mpStatus) {
    case 'approved':
      return ESTADOS.pagado;
    case 'pending':
    case 'in_process':
    case 'authorized':
      return ESTADOS.pendiente;
    case 'rejected':
    case 'cancelled':
    case 'refunded':
    case 'charged_back':
      return ESTADOS.rechazado;
    default:
      return ESTADOS.pendiente;
  }
}

function buildObservaciones({ orderId, shipping, payer, items }) {
  const itemsTexto = (items || [])
    .map((it) => {
      const title = it.title || it.name || it.id;
      const unit = Number(it.unit_price ?? it.price ?? 0);
      return `• ${title} x${it.quantity} ($${(unit * Number(it.quantity)).toLocaleString('es-AR')})`;
    })
    .join('\n');

  const direccion = shipping?.address || payer?.address;

  return [
    `N° Pedido: ${orderId || '-'}`,
    `Envío: ${shipping?.method || '-'} — ${shipping?.city || ''}${shipping?.province ? `, ${shipping.province}` : ''}`,
    shipping?.zipCode ? `CP: ${shipping.zipCode}` : null,
    direccion ? `Dirección: ${direccion}` : null,
    payer?.dni ? `DNI: ${payer.dni}` : null,
    shipping?.comments ? `Nota: ${shipping.comments}` : null,
    '',
    itemsTexto,
  ]
    .filter((l) => l !== null)
    .join('\n')
    .slice(0, 2000); // límite de Notion para rich_text
}

function buildProperties({ payer, shipping, items, total, orderId, estado }) {
  const props = {
    Nombre: { title: [{ text: { content: String(payer?.name || 'Sin nombre').slice(0, 200) } }] },
    Orden: { rich_text: [{ text: { content: String(orderId || '') } }] },
    Estado: { select: { name: estado } },
    Observaciones: { rich_text: [{ text: { content: buildObservaciones({ orderId, shipping, payer, items }) } }] },
  };
  if (payer?.email) props.Correo = { email: payer.email };
  if (payer?.phone) props['Teléfono'] = { phone_number: String(payer.phone) };
  if (shipping?.city) props.Ciudad = { rich_text: [{ text: { content: shipping.city } }] };
  if (shipping?.province) props.Provincia = { rich_text: [{ text: { content: shipping.province } }] };
  if (typeof total === 'number' && !Number.isNaN(total)) props['Monto del pedido ($)'] = { number: total };
  return props;
}

/**
 * Crea la fila del pedido en el CRM al iniciar el checkout (estado "Checkout iniciado").
 * Devuelve el pageId de Notion (para guardarlo en el metadata de MP) o null.
 * Nunca lanza: si Notion falla, el checkout continúa igual.
 */
export async function crearLeadEnCRM({ payer, shipping, items, total, orderId }) {
  if (!getToken()) {
    console.warn('[notion] NOTION_TOKEN no configurado — salteando CRM');
    return null;
  }
  try {
    const page = await notionFetch('/pages', 'POST', {
      parent: { database_id: DB_ID },
      properties: buildProperties({ payer, shipping, items, total, orderId, estado: ESTADOS.iniciado }),
    });
    console.log('[notion] lead creado', page.id, '—', orderId);
    return page.id;
  } catch (err) {
    console.error('[notion] crearLeadEnCRM error:', err.message);
    return null;
  }
}

/**
 * Actualiza el estado del pedido cuando Mercado Pago confirma el pago.
 * - Si hay pageId (lo guardamos en el metadata de MP), actualiza esa fila exacta.
 * - Si no hay pageId (el lead no se llegó a crear), crea la fila desde `fallback`.
 * Nunca lanza. Devuelve el pageId afectado o null.
 */
export async function actualizarEstadoPedido({ pageId, estado, total, fallback }) {
  if (!getToken()) {
    console.warn('[notion] NOTION_TOKEN no configurado — salteando CRM');
    return null;
  }
  try {
    if (pageId) {
      const props = { Estado: { select: { name: estado } } };
      if (typeof total === 'number' && !Number.isNaN(total)) {
        props['Monto del pedido ($)'] = { number: total };
      }
      await notionFetch(`/pages/${pageId}`, 'PATCH', { properties: props });
      console.log('[notion] estado actualizado', pageId, '→', estado);
      return pageId;
    }
    if (fallback) {
      const page = await notionFetch('/pages', 'POST', {
        parent: { database_id: DB_ID },
        properties: buildProperties({ ...fallback, estado }),
      });
      console.log('[notion] fila creada (fallback webhook)', page.id, '→', estado);
      return page.id;
    }
    return null;
  } catch (err) {
    console.error('[notion] actualizarEstadoPedido error:', err.message);
    return null;
  }
}
