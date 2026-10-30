/**
 * De qué anuncio vino la visita (spec 034, design D-10). Función pura +
 * `sessionStorage`, sin React.
 *
 * POR QUÉ EXISTE: la compra le llega a Meta dos veces —el Píxel en el
 * navegador y la API de conversiones desde el webhook de Mercado Pago— y la
 * segunda solo sabe que vino de un anuncio si el checkout le manda el `fbc`.
 * `paymentService.metaTracking()` lo arma con la cookie `_fbc` (la pone el
 * Píxel) o, si no hay cookie, con el `fbclid` de la URL… del CHECKOUT, que no
 * lo trae nunca: el `fbclid` viene en la URL a la que llegó el anuncio, tres
 * páginas antes. Cuando el Píxel no llega a cargar (bloqueadores, el navegador
 * embebido de Instagram con el script tirando excepciones), la venta viajaba
 * sin atribución.
 *
 * Se guarda en `sessionStorage` (la visita, no la persona) y siempre en
 * `try/catch`: sin storage la compra sigue igual, sin el dato.
 *
 * Los UTM se guardan junto por si sirven más adelante (mandarlos al pedido
 * cambia el servidor de pagos: queda propuesto en la auditoría).
 */
const CLAVE = 'epicalcos.atribucion';
const PARAMS = ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
/** Tope por valor: un parámetro de URL no puede llenar el storage ni el payload. */
const TOPE = 500;

/**
 * Lee los parámetros de atribución de una query string. `{}` si no trae ninguno.
 * @param {string} search  `window.location.search`
 */
export function parametrosDeAtribucion(search = '') {
  let params;
  try {
    params = new URLSearchParams(search);
  } catch {
    return {};
  }
  const out = {};
  for (const p of PARAMS) {
    const v = params.get(p);
    if (v) out[p] = v.slice(0, TOPE);
  }
  return out;
}

/**
 * Al arrancar la app: si la URL de llegada trae parámetros de atribución, se
 * guardan (la última llegada con parámetros gana: es la que trajo esta
 * visita). Sin parámetros no se toca nada — navegar dentro del sitio no borra
 * de dónde se vino.
 */
export function capturarAtribucion(search = '', now = Date.now(), storage = globalThis.sessionStorage) {
  const nuevos = parametrosDeAtribucion(search);
  if (!Object.keys(nuevos).length) return;
  try {
    storage?.setItem(CLAVE, JSON.stringify({ ...nuevos, ...(nuevos.fbclid ? { fbclidTs: now } : {}) }));
  } catch {
    /* sin storage: la compra sigue igual, sin el dato */
  }
}

/** Lo guardado en esta visita, o `{}`. */
export function leerAtribucion(storage = globalThis.sessionStorage) {
  try {
    const v = JSON.parse(storage?.getItem(CLAVE) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

/**
 * El `fbc` con el formato de Meta (`fb.1.{ms}.{fbclid}`) a partir del `fbclid`
 * guardado, con el instante en que se llegó — no el del checkout: Meta lo usa
 * para saber cuánto pasó entre el click y la compra. `''` si no hay.
 */
export function fbcGuardado(storage = globalThis.sessionStorage) {
  const { fbclid, fbclidTs } = leerAtribucion(storage);
  if (!fbclid) return '';
  return `fb.1.${Number(fbclidTs) || Date.now()}.${fbclid}`;
}
