/**
 * Links de WhatsApp con mensaje precargado (spec 031, RF-W2).
 *
 * Que el primer mensaje ya diga de dónde viene le ahorra a Mariano la pregunta
 * de vuelta, y separa al que quiere 2.000 calcos para su packaging del que
 * pregunta por un calco de Boca. La Fase 2 suma el mensaje por página para el
 * botón flotante y el del cotizador.
 */
import { contact } from '../config/site.js';

export function hrefWhatsapp(mensaje) {
  return mensaje ? `${contact.whatsappUrl}?text=${encodeURIComponent(mensaje)}` : contact.whatsappUrl;
}
