/**
 * En producción (Netlify) usa ruta relativa: /api/create-preference → Netlify Function.
 * En dev local podés setear VITE_API_URL=http://localhost:3001 para apuntar al backend Express.
 */
const API_URL = import.meta.env.VITE_API_URL || '';

export async function createPreference({ items, payer, shipping, couponCode }) {
  const payload = {
    items: items.map((i) => ({
      id: i.id,
      title: i.name,
      quantity: Number(i.quantity),
      unit_price: Number(i.price)
    })),
    payer,
    shipping,
    couponCode: couponCode || undefined
  };

  const res = await fetch(`${API_URL}/api/create-preference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data?.message || data?.error || '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`No se pudo crear la preferencia (${res.status})${detail ? ': ' + detail : ''}`);
  }

  return res.json();
}

/** Registra un pedido a pagar por transferencia bancaria (sin pasar por Mercado Pago). */
export async function createTransferOrder({ items, payer, shipping, couponCode }) {
  const payload = {
    items: items.map((i) => ({
      id: i.id,
      title: i.name,
      quantity: Number(i.quantity),
      unit_price: Number(i.price)
    })),
    payer,
    shipping,
    couponCode: couponCode || undefined
  };

  const res = await fetch(`${API_URL}/api/create-order-transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data?.message || data?.error || '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`No se pudo registrar el pedido (${res.status})${detail ? ': ' + detail : ''}`);
  }

  return res.json();
}
