const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Crea una preferencia de pago en el backend y devuelve { init_point }.
 * El backend valida y firma con MERCADOPAGO_ACCESS_TOKEN — nunca lo expongas en el frontend.
 */
export async function createPreference({ items, payer, shipping }) {
  const payload = {
    items: items.map((i) => ({
      id: i.id,
      title: i.name,
      quantity: Number(i.quantity),
      unit_price: Number(i.price)
    })),
    payer,
    shipping
  };

  const res = await fetch(`${API_URL}/api/create-preference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`No se pudo crear la preferencia (${res.status}): ${text}`);
  }

  return res.json();
}
