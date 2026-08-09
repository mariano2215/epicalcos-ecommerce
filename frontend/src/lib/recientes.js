/**
 * Categorías vistas recientemente.
 *
 * El catálogo tiene 99 categorías: el que vuelve al sitio y ya estaba mirando
 * "Fútbol Rosario Central" tiene que encontrarla de nuevo entre 99 tarjetas o
 * escribirla en el buscador. Guardar las últimas y ofrecerlas es de las pocas
 * personalizaciones que reducen fricción de verdad en vez de sumar ruido.
 *
 * Deliberadamente simple: solo slugs de categoría en localStorage. Sin PII, sin
 * backend, sin perfilado. Si no hay nada guardado, el componente no se muestra
 * y el visitante nuevo ve exactamente lo de siempre.
 */
const KEY = 'epicalcos.recientes.v1';
const MAX = 6;

/** Slugs vistos, del más reciente al más viejo. */
export function leerRecientes() {
  try {
    const lista = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(lista) ? lista.filter((s) => typeof s === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/**
 * Registra una categoría como vista. Si ya estaba, sube al principio en vez de
 * duplicarse — la lista es "las últimas 6 distintas", no "las últimas 6 visitas".
 */
export function registrarVista(slug) {
  if (!slug) return;
  try {
    const lista = leerRecientes().filter((s) => s !== slug);
    localStorage.setItem(KEY, JSON.stringify([slug, ...lista].slice(0, MAX)));
  } catch {
    /* incógnito o storage lleno: la personalización simplemente no ocurre */
  }
}
