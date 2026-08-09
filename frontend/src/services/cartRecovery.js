const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Registra el carrito para el recordatorio de abandono.
 *
 * Se llama cuando la persona escribe un mail VÁLIDO en el checkout: ahí ya
 * mostró intención real de comprar, y si no termina es un abandono de verdad
 * (no alguien mirando el catálogo).
 *
 * Es best-effort y silencioso: si falla, la compra sigue igual. El tracking
 * nunca puede romper el checkout — es la misma regla que en lib/analytics.js.
 *
 * El backend es no-op salvo que esté ABANDONED_CART_ENABLED=true, así que este
 * llamado no hace nada hasta que se prenda a propósito.
 */
export async function trackCart({ email, name, items }) {
  if (!email || !items?.length) return;
  try {
    await fetch(`${API_BASE}/api/track-cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // El navegador puede cancelarlo si se va de la página; no importa.
      keepalive: true,
      body: JSON.stringify({
        email,
        name,
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          image: i.image
        }))
      })
    });
  } catch {
    /* silencioso a propósito */
  }
}
