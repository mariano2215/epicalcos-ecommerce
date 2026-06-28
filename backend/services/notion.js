import { Client } from '@notionhq/client';

let _client = null;

function getClient() {
  if (!process.env.NOTION_TOKEN) return null;
  if (!_client) _client = new Client({ auth: process.env.NOTION_TOKEN });
  return _client;
}

const DB_ID = process.env.NOTION_CRM_DATABASE_ID || 'a2e218a7fa0a422a9d03a8efd965670b';

export async function registrarPedidoEnCRM({ payer, shipping, items, total, orderId }) {
  const client = getClient();
  if (!client) {
    console.warn('[notion] NOTION_TOKEN no configurado — saltando CRM');
    return null;
  }

  const itemsTexto = items
    .map((it) => `• ${it.title} x${it.quantity} ($${(it.unit_price * it.quantity).toLocaleString('es-AR')})`)
    .join('\n');

  const observaciones = [
    `N° Pedido: ${orderId}`,
    `Envío: ${shipping?.method || '-'} — ${shipping?.city || ''}${shipping?.province ? `, ${shipping.province}` : ''}`,
    shipping?.zipCode ? `CP: ${shipping.zipCode}` : null,
    shipping?.address ? `Dirección: ${shipping.address}` : null,
    payer?.dni ? `DNI: ${payer.dni}` : null,
    shipping?.comments ? `Nota: ${shipping.comments}` : null,
    '',
    itemsTexto,
  ]
    .filter((l) => l !== null)
    .join('\n')
    .slice(0, 2000); // Notion rich_text tiene límite de 2000 chars

  try {
    const page = await client.pages.create({
      parent: { database_id: DB_ID },
      properties: {
        Nombre: { title: [{ text: { content: payer.name } }] },
        Correo: { email: payer.email || null },
        'Teléfono': { phone_number: payer.phone || null },
        Ciudad: { rich_text: [{ text: { content: shipping?.city || '' } }] },
        Provincia: { rich_text: [{ text: { content: shipping?.province || '' } }] },
        'Monto del pedido ($)': { number: total },
        Orden: { rich_text: [{ text: { content: orderId || '' } }] },
        Estado: { select: { name: 'Checkout iniciado' } },
        Observaciones: { rich_text: [{ text: { content: observaciones } }] },
      },
    });
    console.log('[notion] pedido registrado:', page.id, '—', orderId);
    return page.id;
  } catch (err) {
    console.error('[notion] error al registrar pedido:', err.message);
    return null;
  }
}
