const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Popup de bienvenida: registra el mail y devuelve el código de cupón.
 *
 * `timeoutMs` (spec 026): pasado ese tiempo se corta y tira, para que el popup
 * muestre el error y deje reintentar en vez de quedarse "Activando…" para
 * siempre con la red del celular colgada. El error lleva `status` (el HTTP, o
 * 0 si no hubo respuesta): el popup distingue el 400 de mail inválido del resto.
 */
export async function captureLead(email, { timeoutMs } = {}) {
  const ctrl = timeoutMs && typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;

  try {
    let res;
    try {
      res = await fetch(`${API_URL}/api/capture-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: ctrl?.signal
      });
    } catch (err) {
      const e = new Error(`No se pudo registrar el mail (sin respuesta): ${err?.message || err}`);
      e.status = 0;
      throw e;
    }

    if (!res.ok) {
      let detail = '';
      try {
        const data = await res.json();
        detail = data?.message || data?.error || '';
      } catch {
        detail = await res.text().catch(() => '');
      }
      const e = new Error(`No se pudo registrar el mail (${res.status})${detail ? ': ' + detail : ''}`);
      e.status = res.status;
      throw e;
    }

    return res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}
