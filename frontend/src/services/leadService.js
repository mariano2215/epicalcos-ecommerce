const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Popup de bienvenida: registra el mail y devuelve lo que se ganó.
 *
 * `oferta` es un PEDIDO, no una orden: el servidor puede contestar con el cupón
 * aunque se le pida el regalo (si lo tiene apagado de ese lado). Quien llama
 * tiene que mirar `oferta` en la respuesta, no lo que mandó.
 *
 * @param {string} email
 * @param {'regalo'|undefined} oferta sin valor = el 10 % OFF de siempre.
 * @returns {Promise<{ ok: boolean, oferta: 'regalo'|'cupon', code?: string, regalo?: string }>}
 */
export async function captureLead(email, oferta) {
  const res = await fetch(`${API_URL}/api/capture-lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, oferta: oferta || undefined })
  });

  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data?.message || data?.error || '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`No se pudo registrar el mail (${res.status})${detail ? ': ' + detail : ''}`);
  }

  return res.json();
}
