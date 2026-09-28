import { POPUP_CONFIG, POPUP_JUEGO } from '../config/popup.js';
import { premioDelJuego, porcentajeOferta, beneficioActivo } from './popupReglas.js';
import { leerEstado } from './popupEstado.js';
import { leerCupon } from './cuponVentana.js';

/**
 * El juego de pegar calcos del hero y el popup de bienvenida (spec 028,
 * ampliación C) viven en árboles distintos: el popup en `App` (chunk principal)
 * y el juego en `HeroCalcos` (chunk del Home). Este módulo es el punto donde se
 * encuentran: el juego avisa cuánto lleva y el popup se entera cuando alguien
 * ganó. Vive lo que vive la pestaña: el premio se da una vez por carga.
 */

let estado = { pegadas: 0, premiado: false };
const oyentes = new Set();
let aviso = null;

/**
 * ¿Esta pegada es la que gana? La primera vez que se llega a las piezas, y solo
 * si hay premio para dar. Pura, para testearla sin estado.
 */
export function ganaAhora({ pegadas, premiado, hayPremio, piezas = POPUP_JUEGO.piezas }) {
  return Boolean(hayPremio && !premiado && pegadas >= piezas);
}

/** ¿Hay premio para esta persona ahora? Lee el estado del popup y el cupón. */
export function hayPremio(ahora = Date.now()) {
  const pct = porcentajeOferta(undefined, ahora);
  return premioDelJuego({
    habilitado: POPUP_CONFIG.activo && pct != null,
    cuponActivo: beneficioActivo(leerCupon(), ahora),
    comprado: Boolean(leerEstado().compradoEn)
  });
}

/**
 * El juego informa cuántas calcos hay pegadas. Devuelve `true` si con esta
 * ganó: el popup se entera `demoraPremioMs` después.
 */
export function registrarPegadas(pegadas) {
  const gana = ganaAhora({ pegadas, premiado: estado.premiado, hayPremio: hayPremio() });
  estado = { pegadas, premiado: estado.premiado || gana };
  if (gana) {
    clearTimeout(aviso);
    aviso = setTimeout(() => oyentes.forEach((fn) => fn()), POPUP_JUEGO.demoraPremioMs);
  }
  return gana;
}

/** ¿Ya se ganó el premio en esta carga? */
export const yaPremiado = () => estado.premiado;

/** El popup se suscribe al premio. Devuelve la función para desuscribirse. */
export function alGanar(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
