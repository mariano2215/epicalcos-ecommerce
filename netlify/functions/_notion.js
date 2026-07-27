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
  lead: 'Lead 10% OFF',
};

/** Devuelve el token solo si está configurado de verdad (no el placeholder).
 *  Acepta NOTION_TOKEN o el alias NOTION_KEY (el que está cargado en Netlify). */
function getToken() {
  const raw = process.env.NOTION_TOKEN || process.env.NOTION_KEY;
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

/**
 * Fecha/hora actual como ISO con offset de Argentina (-03:00, sin horario de
 * verano). Se manda con offset explícito para que Notion muestre la hora local
 * del negocio y no la UTC del servidor de Netlify.
 * Ej: "2026-07-27T15:04:00-03:00"
 */
function ahoraEnArgentina() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  // hour12:false puede devolver "24" a la medianoche en algunos runtimes.
  const hora = p.hour === '24' ? '00' : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hora}:${p.minute}:${p.second}-03:00`;
}

/**
 * Crea la página en el CRM. Si Notion rechaza el request por la propiedad
 * `Fecha` (no existe en la base, o no es de tipo Date), reintenta sin ella:
 * preferimos una fila sin fecha antes que perder el lead/pedido entero.
 */
async function crearPagina(properties) {
  try {
    return await notionFetch('/pages', 'POST', { parent: { database_id: DB_ID }, properties });
  } catch (err) {
    if (!properties.Fecha || !/Fecha/i.test(err.message)) throw err;
    console.warn('[notion] la base rechazó la propiedad Fecha — reintentando sin ella:', err.message);
    const { Fecha, ...resto } = properties;
    return notionFetch('/pages', 'POST', { parent: { database_id: DB_ID }, properties: resto });
  }
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
    // Momento en que entró la fila al CRM: permite ordenar/filtrar por más reciente.
    Fecha: { date: { start: ahoraEnArgentina() } },
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
    const page = await crearPagina(
      buildProperties({ payer, shipping, items, total, orderId, estado: ESTADOS.iniciado }),
    );
    console.log('[notion] lead creado', page.id, '—', orderId);
    return page.id;
  } catch (err) {
    console.error('[notion] crearLeadEnCRM error:', err.message);
    return null;
  }
}

/**
 * Crea una fila de LEAD (popup de bienvenida "10% OFF por tu mail") en el
 * mismo CRM de pedidos, distinguible por Estado="Lead 10% OFF". No es un
 * pedido: no lleva N° de orden ni monto. Nunca lanza. Devuelve el pageId o null.
 */
export async function crearLeadNewsletter(email) {
  if (!getToken()) {
    console.warn('[notion] NOTION_TOKEN no configurado — salteando CRM (lead)');
    return null;
  }
  const fecha = ahoraEnArgentina();
  try {
    const page = await crearPagina({
      Nombre: { title: [{ text: { content: `Lead: ${email}`.slice(0, 200) } }] },
      Estado: { select: { name: ESTADOS.lead } },
      Correo: { email },
      // Cuándo dejó los datos: la columna Fecha permite ordenar/filtrar por
      // más reciente (antes esto solo vivía como texto en Observaciones).
      Fecha: { date: { start: fecha } },
      Observaciones: {
        rich_text: [
          {
            text: {
              content: `Dejó el mail en el popup de 10% OFF (cupón EPICA10) — ${new Date(fecha).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false })}`,
            },
          },
        ],
      },
    });
    console.log('[notion] lead newsletter creado', page.id, '—', email);
    return page.id;
  } catch (err) {
    console.error('[notion] crearLeadNewsletter error:', err.message);
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
      const page = await crearPagina(buildProperties({ ...fallback, estado }));
      console.log('[notion] fila creada (fallback webhook)', page.id, '→', estado);
      return page.id;
    }
    return null;
  } catch (err) {
    console.error('[notion] actualizarEstadoPedido error:', err.message);
    return null;
  }
}
