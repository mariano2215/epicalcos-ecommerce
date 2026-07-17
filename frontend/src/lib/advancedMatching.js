/**
 * Coincidencias avanzadas manuales del píxel de Meta.
 *
 * Meta hashea los valores con SHA-256 en el navegador; acá sólo hay que normalizarlos
 * (minúsculas, sin espacios ni puntuación, teléfono con código de país).
 *
 * El dato se guarda en sessionStorage porque el Purchase se dispara en /pago-exitoso,
 * que es una carga de página nueva al volver de Mercado Pago: ahí main.jsx vuelve a
 * hacer fbq('init', ...) y necesita los datos del comprador.
 */

const STORAGE_KEY = 'epicalcos:fb_am';
const DEFAULT_COUNTRY = 'ar';
const DEFAULT_PHONE_PREFIX = '54';

const clean = (v) =>
  String(v || '')
    .trim()
    .toLowerCase();

// Nombres: Meta acepta letras UTF-8 y descarta la puntuación; los espacios internos
// de un apellido compuesto se conservan.
const cleanName = (v) =>
  clean(v)
    .replace(/[^\p{L}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

// Ciudad y provincia: además de la puntuación, van sin espacios.
const cleanToken = (v) => clean(v).replace(/[^\p{L}]/gu, '');

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith(DEFAULT_PHONE_PREFIX)) return digits;
  return DEFAULT_PHONE_PREFIX + digits.replace(/^0/, '');
}

function splitName(fullName) {
  const parts = cleanName(fullName).split(' ').filter(Boolean);
  if (parts.length === 0) return { fn: '', ln: '' };
  return { fn: parts[0], ln: parts.slice(1).join(' ') };
}

/** Arma el objeto de coincidencias avanzadas a partir de los datos del checkout. */
export function buildAdvancedMatching({ payer = {}, shipping = {} } = {}) {
  const { fn, ln } = splitName(payer.name);
  const data = {
    em: clean(payer.email),
    ph: normalizePhone(payer.phone),
    fn,
    ln,
    ct: cleanToken(shipping.city),
    st: cleanToken(shipping.province),
    zp: clean(shipping.zipCode).replace(/\s/g, ''),
    country: DEFAULT_COUNTRY
  };
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v));
}

export function getStoredAdvancedMatching() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Re-inicializa el píxel con las coincidencias avanzadas y las persiste para la
 * vuelta desde Mercado Pago.
 */
export function setAdvancedMatching(checkoutData) {
  if (typeof window === 'undefined') return null;
  const data = buildAdvancedMatching(checkoutData);
  if (!data.em && !data.ph) return null;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage bloqueado: el init de esta página igual sirve.
  }

  const pixelId = import.meta.env.VITE_META_PIXEL_ID;
  if (pixelId && typeof window.fbq === 'function') {
    window.fbq('init', pixelId, data);
  }
  return data;
}

export function clearAdvancedMatching() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
