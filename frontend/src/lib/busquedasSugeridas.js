/**
 * Lo que se le ofrece a alguien parado frente a un buscador vacío.
 *
 * Con 61 categorías y 3.397 diseños, el buscador es el mecanismo de navegación
 * más importante del sitio — y un input vacío no le dice a nadie QUÉ se puede
 * buscar acá. Los chips convierten el buscador de "escribí algo" en "mirá todo
 * lo que hay": son ejemplos, no filtros.
 *
 * ⚠️ CADA TÉRMINO TIENE QUE ENCONTRAR ALGO. Un chip que cae en "sin resultados"
 * es peor que no tenerlo: promete catálogo y entrega un callejón. Lo verifica
 * `busquedasSugeridas.test.js` contra los alias reales de /data/aliases.json.
 *
 * Los términos NO son slugs: son las palabras que la gente escribe ("Fútbol" y
 * no "escudos-futbol"). El motor de `searchCatalog.js` resuelve el resto.
 */
export const BUSQUEDAS_SUGERIDAS = [
  'Argentina',
  'Anime',
  'Disney',
  'Fútbol',
  'Harry Potter',
  'Taylor Swift',
  'Los Simpsons',
  'Marvel'
];

// ─── Búsquedas recientes ──────────────────────────────────────────────────────

/**
 * Igual de deliberadamente simple que `lib/recientes.js`: sólo términos en
 * localStorage, sin PII, sin backend, sin perfilado. Si no hay nada guardado el
 * bloque no se muestra y el visitante nuevo ve exactamente lo de siempre.
 */
const KEY = 'epicalcos.busquedas.v1';
const MAX = 5;

/** Términos buscados, del más reciente al más viejo. Nunca lanza. */
export function leerBusquedas() {
  try {
    const lista = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(lista)) return [];
    return lista.filter((t) => typeof t === 'string' && t.trim()).slice(0, MAX);
  } catch {
    return [];
  }
}

/**
 * Registra un término. Si ya estaba sube al principio en vez de duplicarse: la
 * lista es "las últimas 5 distintas", no "las últimas 5 veces que busqué".
 * La comparación ignora mayúsculas para que "boca" y "Boca" no ocupen dos
 * lugares de los cinco.
 */
export function registrarBusqueda(termino) {
  const t = (termino || '').trim();
  if (!t) return;
  try {
    const lista = leerBusquedas().filter((x) => x.toLowerCase() !== t.toLowerCase());
    localStorage.setItem(KEY, JSON.stringify([t, ...lista].slice(0, MAX)));
  } catch {
    /* incógnito o storage lleno: la comodidad simplemente no ocurre */
  }
}

/** Borra el historial (lo pide el usuario desde el modal de búsqueda). */
export function limpiarBusquedas() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ídem */
  }
}
