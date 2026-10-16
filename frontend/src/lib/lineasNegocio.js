import { NEGOCIO } from '../config/pricing.js';
import { MATERIAL_HOLOGRAFICO_ID, RECARGO_HOLOGRAFICO, IMAGEN_HOLOGRAFICO, getMaterial } from '../config/personalizados.js';

/**
 * Las líneas de carrito de la Promo Negocio de /negocio (spec 033): 100 calcos
 * de 6 cm con el logo del cliente, en vinilo común o —opcional— tornasoladas.
 *
 * Sin tornasolado devuelve la MISMA línea `negocio:{ts}` de siempre.
 *
 * Con tornasolado no hay producto nuevo: son las dos líneas que el servidor ya
 * cobra desde el pack holográfico de /personalizados (enmienda 26/9/2026 de la
 * spec 023) — `negocio:vinilo-holografico:6cm:{ts}` a `NEGOCIO_PRICE` y su
 * recargo `fixed:material-holografico:{ts}`. El `ts` es lo que las liga: el
 * servidor rechaza una sin la otra (`recargo_material_faltante`) y
 * `removeItem` del carrito saca el recargo junto con la promo. El total da lo
 * mismo que 100 holográficas en la escala por volumen (spec 032).
 *
 * ⚠️ `meta.materialLabel` y NO `meta.material`. En lib/resumenPedido.js,
 * `meta.material` en una línea de Negocio quiere decir "pack del
 * configurador": la nota del pedido la imprimía como `Vinilo Holográfico
 * (6 cm, corte undefined, x100)` y SIN el nombre del negocio. Con
 * `materialLabel` sola va por la rama del formulario, que dice el negocio, el
 * logo y ahora también el material.
 *
 * El recargo sale en el formato que espera `addFixed` del CartContext (id sin
 * el `fixed:`, que lo pone él).
 *
 * @returns {{ linea: object, recargo: object|null }}
 */
export function lineasNegocio({ business, archivos = [], tornasolado = false, ts = Date.now(), imagen = null }) {
  const nombre = business.trim();
  const meta = {
    business: nombre,
    qty: NEGOCIO.qty,
    size: NEGOCIO.size,
    archivos: archivos.length ? archivos : null
  };
  const comun = {
    categoryLabel: 'Negocio',
    image: imagen,
    size: NEGOCIO.size,
    basePrice: NEGOCIO.price,
    quantity: 1
  };

  if (!tornasolado) {
    return {
      linea: { id: `negocio:${ts}`, name: `Negocio · ${nombre} · 100u 6 cm`, ...comun, meta },
      recargo: null
    };
  }

  const material = getMaterial(MATERIAL_HOLOGRAFICO_ID);
  return {
    linea: {
      id: `negocio:${MATERIAL_HOLOGRAFICO_ID}:${NEGOCIO.size}:${ts}`,
      name: `Negocio · ${nombre} · 100u 6 cm · Holográfico`,
      ...comun,
      meta: { ...meta, materialLabel: material.label }
    },
    recargo: {
      id: `${RECARGO_HOLOGRAFICO.id}:${ts}`,
      name: `Recargo · ${material.label}`,
      categoryLabel: 'Negocio',
      image: IMAGEN_HOLOGRAFICO,
      price: RECARGO_HOLOGRAFICO.precio
    }
  };
}
