import {
  POPUP_CONFIG,
  POPUP_OFERTA,
  INTERESES,
  RUTAS_POPUP,
  RUTAS_FLUJO_COMPRA,
  RUTAS_SIN_DESCUENTO
} from '../config/popup.js';
import { findCoupon } from '../config/pricing.js';
import { cuponVigente } from './cuponVentana.js';

/**
 * Las decisiones del popup de bienvenida (spec 026), como funciones puras.
 *
 * POR QUÉ ACÁ Y NO EN EL COMPONENTE: el repo no tiene tests de componentes, y
 * lo que más se rompe en un popup no es cómo se ve sino CUÁNDO aparece (un
 * cooldown mal contado lo muestra todos los días, una ruta mal escrita lo abre
 * en el checkout). Así todo eso se prueba con Vitest en `node`, sin DOM. Nada
 * de este archivo lee storage, el reloj ni `window`: todo entra por parámetro.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

/** "/categorias/" y "/categorias" son la misma página. */
function normalizar(pathname) {
  const p = String(pathname || '/');
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

const enLista = (ruta, lista) => lista.some((r) => ruta === r || ruta.startsWith(`${r}/`));

/** ¿El popup se puede abrir (solo o a mano) en esta ruta? Solo en el Home (P-6). */
export function popupPermitido(pathname) {
  return RUTAS_POPUP.includes(normalizar(pathname));
}

/**
 * ¿Se muestra el acceso fijo en esta ruta?
 *  - `oferta` ("🎁 10% OFF", reabre el popup): donde vive el popup, o sea el Home.
 *  - `activo` ("🎁 10% OFF activo"): en toda la tienda donde el 10% aplica.
 */
export function accesoVisible(pathname, tipo) {
  const ruta = normalizar(pathname);
  if (tipo === 'oferta') return popupPermitido(ruta);
  if (tipo === 'activo') return !enLista(ruta, RUTAS_FLUJO_COMPRA) && !enLista(ruta, RUTAS_SIN_DESCUENTO);
  return false;
}

/**
 * El % que ofrece el popup, leído del cupón real. `null` = el popup no tiene
 * nada que ofrecer (el cupón se apagó o la oferta es de un tipo que el motor de
 * precios todavía no sabe cobrar) y no se tiene que mostrar.
 */
export function porcentajeOferta(oferta = POPUP_OFERTA, ahora = Date.now()) {
  if (oferta?.tipo !== 'porcentaje') return null;
  const cupon = findCoupon(oferta.codigo, ahora);
  return cupon?.discount ? Math.round(cupon.discount * 100) : null;
}

/** % de un código cualquiera (el guardado puede no ser el de la oferta de hoy). */
export function porcentajeCupon(code, ahora = Date.now()) {
  const cupon = findCoupon(code, ahora);
  return cupon?.discount ? Math.round(cupon.discount * 100) : null;
}

/**
 * ¿El 10% que dejó el popup sigue sirviendo? Tiene que existir el código, no
 * haber vencido su ventana (si la tiene) y seguir activo en COUPONS: un cupón
 * apagado por Mariano no se puede seguir anunciando como "activo".
 */
export function beneficioActivo(cupon, ahora = Date.now()) {
  if (!cupon?.code) return false;
  return cuponVigente(cupon, ahora) && porcentajeCupon(cupon.code, ahora) != null;
}

/**
 * ¿Puede abrirse SOLO? (el acceso manual no pasa por acá)
 *
 * @param {{ estado: object, sesion: object, cuponActivo: boolean,
 *           storageOk: boolean, ahora: number, config?: object }} args
 */
export function puedeAbrirSolo({ estado, sesion, cuponActivo, storageOk, ahora, config = POPUP_CONFIG }) {
  if (!config.activo) return false;
  // Sin storage no hay cómo respetar "7 días": aparecería en cada visita. Era
  // la regla del popup anterior y sigue valiendo.
  if (!storageOk) return false;
  if (sesion?.autoAbierto) return false;
  if (estado?.compradoEn) return false;
  if (cuponActivo) return false;

  const convertidoEn = estado?.convertidoEn || 0;
  if (convertidoEn && ahora - convertidoEn < config.cooldownConvertidoDias * DIA_MS) return false;

  // "Visto" cuenta como cerrado: el que se fue con el popup abierto (recargó,
  // cerró la pestaña) tampoco quiere verlo mañana. Solo cuenta si es POSTERIOR
  // a la conversión: el que convirtió hace 31 días y lo volvió a cerrar ayer
  // tiene que esperar sus 7 días igual.
  const ultimaVista = Math.max(estado?.cerradoEn || 0, estado?.vistoEn || 0);
  if (ultimaVista > convertidoEn && ahora - ultimaVista < config.cooldownCerradoDias * DIA_MS) {
    return false;
  }
  return true;
}

/**
 * ¿Qué disparo se cumplió? `null` si ninguno.
 *
 * El orden importa solo para el nombre que viaja en `popup_trigger` cuando se
 * cumplen varios a la vez (típico a los 5 s de volver al Home): primero lo que
 * la persona HIZO (salir, mirar productos, buscar) y después lo que le PASÓ
 * (scroll, tiempo).
 *
 * @param {{ umbrales: {escritorio, movil}, esMovil: boolean, msEnSitio: number,
 *           msEnPagina: number, scrollPct: number|null,
 *           senales: {productos: number, busqueda: boolean, categoria: boolean},
 *           salida: boolean, config?: object }} args
 */
export function disparoCumplido({
  umbrales,
  esMovil,
  msEnSitio,
  msEnPagina,
  scrollPct,
  senales = {},
  salida = false,
  config = POPUP_CONFIG
}) {
  // RF-5: nunca "apenas carga la página", cumpla lo que cumpla.
  if (msEnPagina < config.minMsEnPagina) return null;

  if (salida && !esMovil && config.salida.activa && msEnSitio >= config.salida.minMsEnSitio) {
    return 'exit_intent';
  }

  const intencion = config.intencion;
  if ((senales.productos || 0) >= intencion.productosVistos) return 'product_views';
  if (intencion.busqueda && senales.busqueda) return 'search';
  if (intencion.categoria && senales.categoria) return 'category';

  const u = esMovil ? umbrales.movil : umbrales.escritorio;
  if (u.scrollPct != null && scrollPct != null && scrollPct >= u.scrollPct) return 'scroll';
  if (u.demoraMs != null && msEnSitio >= u.demoraMs) return 'time';
  return null;
}

/** % scrolleado de la página. `null` si la página no scrollea (no hay 30% que alcanzar). */
export function porcentajeScroll({ scrollY, alto, altoVentana }) {
  const recorrible = alto - altoVentana;
  if (!(recorrible > 0)) return null;
  return Math.min(100, Math.max(0, (scrollY / recorrible) * 100));
}

/** A dónde lleva cada interés del paso 2. Uno desconocido cae al catálogo. */
export function destinoInteres(interesId) {
  return INTERESES.find((i) => i.id === interesId)?.to || '/categorias';
}

/**
 * ¿Es su primera sesión? Se decide al ABRIR la sesión, mirando el estado que
 * había antes: cualquier rastro previo del popup (incluido el migrado del
 * popup viejo) la hace `returning`.
 */
export function tipoVisitante(estadoPrevio) {
  const e = estadoPrevio || {};
  return e.primeraVisitaEn || e.vistoEn || e.cerradoEn || e.convertidoEn || e.compradoEn
    ? 'returning'
    : 'new';
}

/**
 * El popup anterior guardaba un único `'1'` al cerrarlo o al dejar el mail.
 * No dice cuál de las dos ni cuándo, así que se reconstruye con lo que hay:
 * con el cupón guardado dejó el mail; sin él, lo cerró. La fecha es la de
 * hoy: los 7 (o 30) días corren desde la primera visita después del deploy.
 */
export function migrarEstadoViejo({ seen, cupon, ahora }) {
  if (seen !== '1') return null;
  return {
    primeraVisitaEn: null,
    vistoEn: null,
    cerradoEn: cupon ? null : ahora,
    convertidoEn: cupon ? ahora : null,
    compradoEn: null
  };
}
