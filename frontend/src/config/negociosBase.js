/**
 * Lo poquito de las páginas de negocio que necesitan el header y el botón de
 * WhatsApp — que están en TODAS las rutas (spec 034).
 *
 * POR QUÉ ES UN ARCHIVO APARTE: el botón Cotizar del header y el WhatsApp
 * flotante importaban `config/negocios.js` entero. Con el copy del cotizador,
 * la escala, los usos y las preguntas (spec 034), eso le sumaba +5 kB gzip al
 * chunk principal, que baja en cada visita aunque nunca se abra /negocio
 * (medido el 17/10/2026: 100,9 → 106,1 kB). Acá queda solo lo que esos dos
 * componentes leen; el resto vive en `config/negocios.js`, que solo cargan las
 * rutas lazy. `config/negocios.js` re-exporta todo esto: para el resto del
 * código, la fuente sigue siendo una.
 *
 * ⚠️ Misma regla que negocios.js: ningún número escrito a mano.
 */
import { ESCALA_MAX } from './pricing.js';

/**
 * Interruptor del cotizador de /negocio (spec 034, RF-5). `false` vuelve a
 * mostrar el formulario de la Promo Negocio y saca "Ver el precio ahora" del
 * botón Cotizar. Sin tocar ningún componente.
 */
export const COTIZADOR_ACTIVO = true;

/** Mensajes precargados de WhatsApp por contexto (spec 031 RF-W2). */
export const WHATSAPP = {
  negocio: 'Hola EPICALCOS. Estoy buscando calcos personalizados para mi negocio.',
  mayorista: 'Hola EPICALCOS. Quiero hacer un pedido de calcos por mayor.',
  pedidosGrandes: `Hola EPICALCOS. Necesito cotizar un pedido de más de ${ESCALA_MAX.toLocaleString('es-AR')} calcos.`,
  /** El botón Cotizar del header: puede tocarlo cualquiera, de cualquier página. */
  cotizar: 'Hola EPICALCOS. Quiero cotizar calcos.'
};
