/**
 * Fecha límite para recibir antes de Navidad (spec 042). Funciones PURAS.
 *
 * No importa `config/site.js` a propósito: site.js usa `fraseNavidad` para la
 * tira de anuncios, y un import de vuelta armaría un ciclo. Las fechas se
 * reciben siempre por parámetro (`NAVIDAD_2026` en config/site.js).
 *
 * POR QUÉ ESTAS FECHAS: salen de los plazos PUBLICADOS, que ya incluyen la
 * producción (`deliveryRosario` / `deliveryInterior` en config/site.js son el
 * total hasta la puerta), más un margen de diciembre. El Plan de conversión del
 * 20/11/2026 sumó la producción dos veces y daba 9/12 y 15/12: fechas ciertas,
 * pero que cortaban días de venta. Confirmadas por Mariano el 20/11/2026.
 *
 * Las fechas vienen en ISO con `-03:00` y el día y el mes de la etiqueta se leen
 * del texto, no de un `Date`: así "10/12" es el 10/12 de Argentina aunque el
 * navegador o el test corran en otro huso horario.
 */

/** 'YYYY-MM-DD…' → '10/12'. */
export function etiquetaFecha(iso) {
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${Number(m[2])}/${Number(m[1])}` : '';
}

/**
 * Zona de la fecha límite según cómo se entrega. Las ciudades próximas a
 * Rosario (`nearby`) viajan por motomensajería con el plazo de Rosario, igual
 * que en el checkout (`zone === 'interior' ? deliveryInterior : deliveryRosario`).
 *
 * @param {'rosario'|'nearby'|'interior'} zone   de `shippingZone()`
 * @param {string} [metodo]                       'retiro' | 'envio' | …
 * @returns {'interior'|'rosario'|'retiro'}
 */
export function zonaNavidad(zone, metodo) {
  if (metodo === 'retiro') return 'retiro';
  return zone === 'interior' ? 'interior' : 'rosario';
}

/**
 * Hasta qué día se puede pedir para recibir antes de Navidad, o `null` si ya
 * pasó, si la zona no tiene fecha o si el aviso está apagado.
 *
 * Con `volumen` (100 calcos o más, `esPedidoVolumen`) corre la tabla de los
 * pedidos grandes: 3 a 5 días de producción en vez de 2 a 3.
 *
 * @param {{ zona: string, volumen?: boolean, ahora?: number, config: object }} opts
 * @returns {string|null} etiqueta 'D/M'
 */
export function fechaLimiteNavidad({ zona, volumen = false, ahora = Date.now(), config }) {
  if (!config?.activa) return null;
  const iso = (volumen ? config.limitesVolumen : config.limites)?.[zona];
  if (!iso || ahora > Date.parse(iso)) return null;
  return etiquetaFecha(iso);
}

/**
 * Todas las fechas que siguen vigentes, en el orden en que vencen (interior,
 * Rosario, retiro), para mostrarlas juntas en la ficha.
 *
 * Con `volumen`, envío y retiro en Rosario comparten fecha: se devuelve una
 * sola entrada `rosario` para no decir dos veces el mismo día.
 *
 * @returns {{ zona: string, etiqueta: string }[]}
 */
export function fechasNavidadVigentes({ volumen = false, ahora = Date.now(), config }) {
  const zonas = volumen ? ['interior', 'rosario'] : ['interior', 'rosario', 'retiro'];
  return zonas
    .map((zona) => ({ zona, etiqueta: fechaLimiteNavidad({ zona, volumen, ahora, config }) }))
    .filter((f) => f.etiqueta);
}

/**
 * La frase de la tira de anuncios. Va cambiando a medida que vence cada fecha,
 * y desaparece (`null`) cuando ya no llega nada.
 *
 * Solo usa las fechas de los pedidos comunes: la tira es una línea y el que
 * pide 100 o más lo ve en la ficha y en el checkout.
 */
export function fraseNavidad(ahora = Date.now(), config) {
  const fecha = (zona) => fechaLimiteNavidad({ zona, ahora, config });
  const interior = fecha('interior');
  const rosario = fecha('rosario');
  const retiro = fecha('retiro');
  if (interior && rosario) {
    return `🎄 Para Navidad: pedí hasta el ${interior} al interior y el ${rosario} en Rosario`;
  }
  if (rosario) return `🎄 Para Navidad en Rosario: pedí hasta el ${rosario}`;
  if (retiro) return `🎄 Para Navidad: retirá en Rosario pidiendo hasta el ${retiro}`;
  return null;
}
