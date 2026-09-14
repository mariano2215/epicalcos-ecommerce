/**
 * Qué garantía le corresponde a un carrito, y cómo se dice (spec 021).
 *
 * La política de la spec 020 NO es igual para todo lo que se vende:
 *   - lo de CATÁLOGO se devuelve por cualquier motivo durante `devoluciones.dias`;
 *   - lo HECHO CON EL ARCHIVO del cliente (personalizados, Promo Negocio,
 *     Polaroid, tatuajes) solo se repone si llega con una falla: se produce a su
 *     medida y no se puede volver a vender;
 *   - lo DIGITAL (archivos imprimibles) no se devuelve.
 * Un único cartel en el checkout le prometería a alguien algo que la política no
 * le da, justo en el momento de pagar. Por eso el mensaje sale del carrito.
 *
 * Puro y sin React a propósito: la suite corre en entorno `node` y esta tabla es
 * lo que hay que poder testear caso por caso (lib/garantia.test.js).
 *
 * ⚠️ Si cambia la política (business-rules.md §7, D-4), cambia esta
 * clasificación en el mismo commit.
 */
import { devoluciones } from '../config/site.js';

/** Una línea dudosa cuenta como hecha con archivo: prometer de menos no le miente a nadie. */
const HECHO_CON_ARCHIVO = { catalogo: false, archivo: true };

/**
 * A qué grupo pertenece una línea del carrito. `null` = no cuenta (digital).
 *
 * El pack es el caso fino: `/mayorista` deja mezclar diseños del catálogo con
 * calcos del archivo del cliente (`allowCustom` en PackBuilder), así que UNA
 * línea puede ser las dos cosas. `meta.items` son los diseños de catálogo y
 * `meta.customCount` las unidades con archivo; están en toda línea de pack desde
 * el primer armador (24/6/2026). Si faltan, la línea es dudosa.
 *
 * @param {{ type?: string, meta?: object }} line
 * @returns {{ catalogo: boolean, archivo: boolean } | null}
 */
export function grupoDeLinea(line) {
  switch (line?.type) {
    case 'sticker':
      return { catalogo: true, archivo: false };
    case 'custom':
    case 'negocio':
    case 'fixed': // tatuajes y Polaroid: los dos se hacen con diseños o fotos del cliente
      return HECHO_CON_ARCHIVO;
    case 'digital':
      return null;
    case 'pack': {
      const m = line.meta || {};
      if (m.packType === 'personalizados' || !Array.isArray(m.items)) return HECHO_CON_ARCHIVO;
      return { catalogo: m.items.length > 0, archivo: Number(m.customCount) > 0 };
    }
    default:
      return HECHO_CON_ARCHIVO;
  }
}

/**
 * La garantía del carrito entero.
 *   'devolucion' → solo catálogo (lo digital no cuenta)
 *   'mixto'      → catálogo + hecho con archivo
 *   'falla'      → solo hecho con archivo
 *   null         → vacío o solo digital: no hay nada que prometer
 *
 * @param {Array<object>} items
 * @returns {'devolucion' | 'mixto' | 'falla' | null}
 */
export function garantiaDelCarrito(items = []) {
  const grupos = items.map(grupoDeLinea).filter(Boolean);
  const catalogo = grupos.some((g) => g.catalogo);
  const archivo = grupos.some((g) => g.archivo);
  if (catalogo && archivo) return 'mixto';
  if (catalogo) return 'devolucion';
  if (archivo) return 'falla';
  return null;
}

/**
 * Lo que se lee en el checkout para cada tipo. Las condiciones resumen la
 * política (business-rules.md §7) sin agregarle ni sacarle nada: si una frase
 * de acá no está allá, está mal esta, no aquella.
 *
 * Los días salen de `devoluciones.dias` —el mismo número de la tira, la
 * política, los Términos y el FAQ—, y se leen en cada llamada para que un
 * cambio del config no deje un texto viejo cacheado.
 *
 * ⚠️ El título de `falla` NO dice "devolver": a quien solo compró cosas hechas
 * con su archivo, la política no le da devolución por cualquier motivo, y el
 * título es lo único que lee el que no abre las condiciones.
 *
 * @param {'devolucion' | 'mixto' | 'falla' | null} tipo
 * @returns {{ icono: string, titulo: string, condiciones: string[] } | null}
 */
export function textosGarantia(tipo) {
  const { dias } = devoluciones;
  const devolucion = [
    `Los ${dias} días corren desde que recibís el pedido.`,
    'Las calcos tienen que estar sin pegar: una vez pegadas, el adhesivo se activa y no se pueden volver a usar.',
    'El envío de vuelta lo pagás vos, salvo que llegue con una falla o te hayamos mandado algo equivocado.',
    'Te devolvemos lo que pagaste por los productos (el envío no), por el mismo medio de pago, dentro de los 10 días hábiles de recibirlas.',
    'Se pide por WhatsApp o mail, con tu número de pedido.'
  ];

  switch (tipo) {
    case 'devolucion':
      return {
        icono: '🔄',
        titulo: `${dias} días para devolverlo, por el motivo que sea`,
        condiciones: devolucion
      };
    case 'mixto':
      return {
        icono: '🔄',
        titulo: `${dias} días para devolver las calcos de catálogo`,
        condiciones: [
          ...devolucion,
          'Lo hecho con tu archivo se repone gratis si llega con una falla de fabricación, pero no entra en la devolución por cualquier motivo: se produce a tu medida.'
        ]
      };
    case 'falla':
      return {
        icono: '🛠️',
        titulo: 'Si llega con una falla, te lo reponemos gratis',
        condiciones: [
          `Avisanos con foto o video dentro de los ${dias} días de recibido el pedido.`,
          'Lo reponemos o reimprimimos sin costo, envío incluido.',
          'Lo hecho con tu archivo no entra en la devolución por cualquier motivo: se produce a tu medida.',
          'Se pide por WhatsApp o mail, con tu número de pedido.'
        ]
      };
    default:
      return null;
  }
}
