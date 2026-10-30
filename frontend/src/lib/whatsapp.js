/**
 * Links de WhatsApp con mensaje precargado (spec 031, RF-W2).
 *
 * Que el primer mensaje ya diga de dónde viene le ahorra a Mariano la pregunta
 * de vuelta, y separa al que quiere 2.000 calcos para su packaging del que
 * pregunta por un calco de Boca.
 */
import { contact } from '../config/site.js';
// `negociosBase` y no `negocios`: el botón flotante está en todas las rutas.
import { WHATSAPP } from '../config/negociosBase.js';

export function hrefWhatsapp(mensaje) {
  return mensaje ? `${contact.whatsappUrl}?text=${encodeURIComponent(mensaje)}` : contact.whatsappUrl;
}

/**
 * Mensaje del botón flotante según la página (spec 034). Solo las páginas de
 * venta por cantidad llevan mensaje: en el resto el botón sigue abriendo el
 * chat vacío, como siempre — un "Hola, quiero calcos" en una categoría de
 * anime diría menos que nada.
 *
 * @returns {string|null}
 */
export function mensajeWhatsapp(pathname = '') {
  const ruta = String(pathname).split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (ruta === '/negocio') return WHATSAPP.negocio;
  if (ruta === '/mayorista') return WHATSAPP.mayorista;
  return null;
}
