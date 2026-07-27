/**
 * En producción (Netlify) usa ruta relativa: /api/create-preference → Netlify Function.
 * En dev local podés setear VITE_API_URL=http://localhost:3001 para apuntar al backend Express.
 */
const API_URL = import.meta.env.VITE_API_URL || '';

function getCookie(name) {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Cookies del píxel de Meta para la API de conversiones (el webhook de MP manda
 * el Purchase server-side con estas señales). Si no hay cookie _fbc pero la URL
 * trae fbclid (click reciente en un anuncio), la armamos con el formato de Meta.
 */
function metaTracking() {
  const fbp = getCookie('_fbp');
  let fbc = getCookie('_fbc');
  if (!fbc && typeof window !== 'undefined') {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
  }
  const tracking = {};
  if (fbp) tracking.fbp = fbp;
  if (fbc) tracking.fbc = fbc;
  return Object.keys(tracking).length ? tracking : undefined;
}

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
    couponCode: couponCode || undefined,
    tracking: metaTracking()
  };

  let res;
  try {
    res = await fetch(`${API_URL}/api/create-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    const wrapped = new Error(`No se pudo crear la preferencia (red): ${err?.message || err}`);
    wrapped.code = 'red';
    throw wrapped;
  }

  if (!res.ok) {
    let detail = '';
    let code = '';
    try {
      const data = await res.json();
      detail = data?.message || data?.error || '';
      code = data?.error || '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    const err = new Error(`No se pudo crear la preferencia (${res.status})${detail ? ': ' + detail : ''}`);
    err.status = res.status;
    err.code = code ? `${res.status} ${code}` : String(res.status);
    throw err;
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

  let res;
  try {
    res = await fetch(`${API_URL}/api/create-order-transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // La request nunca llegó (sin señal, navegador embebido que corta la conexión…).
    // `code` viaja hasta la UI para que el mensaje de error sea diagnosticable.
    const wrapped = new Error(`No se pudo registrar el pedido (red): ${err?.message || err}`);
    wrapped.code = 'red';
    throw wrapped;
  }

  if (!res.ok) {
    let detail = '';
    let code = '';
    try {
      const data = await res.json();
      detail = data?.message || data?.error || '';
      code = data?.error || '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    const err = new Error(`No se pudo registrar el pedido (${res.status})${detail ? ': ' + detail : ''}`);
    err.status = res.status;
    err.code = code ? `${res.status} ${code}` : String(res.status);
    throw err;
  }

  return res.json();
}
