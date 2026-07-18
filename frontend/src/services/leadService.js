const API_URL = import.meta.env.VITE_API_URL || '';

/** Popup de bienvenida: registra el mail y devuelve el código de cupón. */
export async function captureLead(email) {
  const res = await fetch(`${API_URL}/api/capture-lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
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
