import { useSyncExternalStore } from 'react';
import { leerCupon } from './cuponVentana.js';
import { migrarEstadoViejo, tipoVisitante } from './popupReglas.js';

/**
 * Lo que el popup de bienvenida recuerda de cada visitante (spec 026).
 *
 * Dos cajones, con vidas distintas a propósito:
 *  - `epicalcos.popup.v1` (localStorage): cuándo lo vio, lo cerró, dejó el
 *    mail o compró. Es lo que decide los 7 y 30 días.
 *  - `epicalcos.popup.sesion.v1` (sessionStorage): lo de ESTA visita. Cuándo
 *    empezó (para los 12/15 s), si ya se abrió solo una vez, y las señales de
 *    interés (fichas vistas, búsqueda, categoría).
 *
 * ⚠️ TODO ACCESO A STORAGE VA EN try/catch. En el navegador embebido de
 * Instagram —de donde viene la mayoría del tráfico— puede tirar, y el popup no
 * puede romper la tienda. Si tira, se trabaja en memoria: la regla "sin
 * storage no se abre solo" la decide `puedeAbrirSolo` con `storageOk()`.
 *
 * Sin PII: ni el mail ni nada del lead pasa por acá. Las fichas vistas se
 * guardan como ruta (`/producto/boca/3`), que ya es pública.
 */

export const POPUP_ESTADO_KEY = 'epicalcos.popup.v1';
export const POPUP_SESION_KEY = 'epicalcos.popup.sesion.v1';
/** Lo que guardaba el popup anterior. Se lee para migrar y NO se borra (ver design §8). */
export const POPUP_VIEJO_KEY = 'epicalcos.welcomePopup.seen';

const VACIO = { primeraVisitaEn: null, vistoEn: null, cerradoEn: null, convertidoEn: null, compradoEn: null };
/** Alcanza con 2 para decidir; se guardan unas más por si se sube el umbral. */
const MAX_PRODUCTOS = 10;

let memEstado = null;
let memSesion = null;
let version = 0;
const suscriptores = new Set();

const ts = (v) => (Number.isFinite(v) ? v : null);

function normalizarEstado(data) {
  return {
    primeraVisitaEn: ts(data?.primeraVisitaEn),
    vistoEn: ts(data?.vistoEn),
    cerradoEn: ts(data?.cerradoEn),
    convertidoEn: ts(data?.convertidoEn),
    compradoEn: ts(data?.compradoEn)
  };
}

function normalizarSesion(data) {
  return {
    inicioEn: ts(data?.inicioEn) ?? Date.now(),
    entrada: typeof data?.entrada === 'string' ? data.entrada : null,
    autoAbierto: Boolean(data?.autoAbierto),
    productos: Array.isArray(data?.productos) ? data.productos.filter((p) => typeof p === 'string') : [],
    busqueda: Boolean(data?.busqueda),
    categoria: Boolean(data?.categoria),
    visitante: data?.visitante === 'returning' ? 'returning' : 'new'
  };
}

function notificar() {
  version += 1;
  suscriptores.forEach((fn) => {
    try {
      fn();
    } catch {
      /* un suscriptor roto no frena a los demás */
    }
  });
}

/** ¿Se puede escribir en localStorage? Sin eso no hay frecuencia que respetar. */
export function storageOk() {
  try {
    const k = 'epicalcos.popup.prueba';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/**
 * El estado persistente. La primera vez después del deploy migra lo que haya
 * dejado el popup anterior (y lo guarda, para no migrarlo en cada lectura).
 */
export function leerEstado() {
  try {
    const raw = localStorage.getItem(POPUP_ESTADO_KEY);
    if (raw) return normalizarEstado(JSON.parse(raw));
    const migrado = migrarEstadoViejo({
      seen: localStorage.getItem(POPUP_VIEJO_KEY),
      cupon: leerCupon(),
      ahora: Date.now()
    });
    if (migrado) {
      localStorage.setItem(POPUP_ESTADO_KEY, JSON.stringify(migrado));
      return migrado;
    }
    return { ...VACIO };
  } catch {
    // Storage bloqueado o JSON corrupto: lo que haya en memoria de esta carga.
    return memEstado ? { ...memEstado } : { ...VACIO };
  }
}

function guardarEstado(cambios) {
  const nuevo = { ...leerEstado(), ...cambios };
  memEstado = nuevo;
  try {
    localStorage.setItem(POPUP_ESTADO_KEY, JSON.stringify(nuevo));
  } catch {
    /* queda en memoria */
  }
  notificar();
  return nuevo;
}

/** La sesión en curso, o `null` si todavía no se abrió (ver `iniciarSesion`). */
export function leerSesion() {
  try {
    const raw = sessionStorage.getItem(POPUP_SESION_KEY);
    if (raw) return normalizarSesion(JSON.parse(raw));
  } catch {
    /* cae a memoria */
  }
  return memSesion ? { ...memSesion, productos: [...memSesion.productos] } : null;
}

function guardarSesion(sesion) {
  memSesion = sesion;
  try {
    sessionStorage.setItem(POPUP_SESION_KEY, JSON.stringify(sesion));
  } catch {
    /* queda en memoria */
  }
  notificar();
  return sesion;
}

/**
 * Abre la sesión si no hay una (una por pestaña: sobrevive a las recargas, que
 * es lo que hace que "una apertura automática por sesión" aguante un F5).
 *
 * `entrada` es la página por la que llegó: una categoría abierta desde un
 * anuncio no es una señal de interés, es el anuncio.
 */
export function iniciarSesion(pathname, ahora = Date.now()) {
  const actual = leerSesion();
  if (actual) return actual;

  const previo = leerEstado();
  const sesion = normalizarSesion({
    inicioEn: ahora,
    entrada: pathname,
    visitante: tipoVisitante(previo)
  });
  if (!previo.primeraVisitaEn) guardarEstado({ primeraVisitaEn: ahora });
  return guardarSesion(sesion);
}

/**
 * Señales de interés: `producto` (con la ruta de la ficha), `categoria` (con
 * la ruta) o `busqueda`. Se juntan en todo el sitio; el popup las usa en el Home.
 */
export function registrarSenal(tipo, ruta) {
  const sesion = leerSesion() || iniciarSesion(ruta || '/');
  if (tipo === 'producto') {
    if (!ruta || sesion.productos.includes(ruta)) return;
    guardarSesion({ ...sesion, productos: [...sesion.productos, ruta].slice(-MAX_PRODUCTOS) });
  } else if (tipo === 'categoria') {
    if (sesion.categoria || !ruta || ruta === sesion.entrada) return;
    guardarSesion({ ...sesion, categoria: true });
  } else if (tipo === 'busqueda') {
    if (sesion.busqueda) return;
    guardarSesion({ ...sesion, busqueda: true });
  }
}

export function marcarAutoAbierto() {
  const sesion = leerSesion() || iniciarSesion('/');
  guardarSesion({ ...sesion, autoAbierto: true });
}

export const registrarVisto = (ahora = Date.now()) => guardarEstado({ vistoEn: ahora });
export const registrarCerrado = (ahora = Date.now()) => guardarEstado({ cerradoEn: ahora });
export const registrarConvertido = (ahora = Date.now()) => guardarEstado({ convertidoEn: ahora });

/**
 * Compró. El popup no se vuelve a abrir solo y el acceso "🎁 10% OFF" (el que
 * ofrece el descuento) desaparece.
 *
 * ⚠️ NO toca el cupón guardado (spec 026, P-3): el 10% sigue valiendo en las
 * compras siguientes, a pedido de Mariano ("la idea es que compren al final").
 */
export const registrarCompra = (ahora = Date.now()) => guardarEstado({ compradoEn: ahora });

/** Avisa a los suscriptores después de cambiar algo por fuera (ej. al emitir el cupón). */
export const avisarCambio = notificar;

function suscribir(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

/**
 * Número que cambia con cada escritura. Los componentes lo usan para volver a
 * leer el estado y el cupón: el chip del 10% y el carrito se enteran de la
 * conversión sin recargar. Mismo patrón que `useTamanoElegido`.
 */
export function usePopupVersion() {
  return useSyncExternalStore(suscribir, () => version, () => version);
}

/** Solo para tests: vacía la memoria de respaldo entre casos. */
export function reiniciarMemoria() {
  memEstado = null;
  memSesion = null;
}
