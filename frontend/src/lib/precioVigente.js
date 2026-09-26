/**
 * Precio de LISTA vigente de una línea del carrito, recalculado desde su id
 * (spec 027). Función PURA, sin React.
 *
 * POR QUÉ EXISTE: cada línea guarda su `basePrice` en localStorage
 * (`epicalcos.cart.v2`) y nada lo refrescaba. El día que suben los precios, un
 * carrito armado el día anterior manda el precio viejo, el servidor espera el
 * nuevo y rechaza el checkout con `price_mismatch`: la persona no puede
 * comprar, y "recargá la página" no lo arregla porque el precio viejo sigue
 * guardado. El CartContext pasa cada línea por acá al hidratar.
 *
 * Es el mismo criterio que `lineBase()` de netlify/functions/lib/pricing.js
 * (precio de LISTA, antes de promos, cupones y transferencia). Si el id no se
 * reconoce, devuelve el `basePrice` guardado: mejor no tocar lo que no se
 * entiende que inventarle un precio.
 */
import {
  SIZES,
  NEGOCIO,
  TATUAJES,
  IMPRIMIBLES,
  PROMO_MAYORISTA_100,
  WHOLESALE_DISCOUNT,
  PERSONALIZADOS_DISCOUNT,
  precioPolaroidLista,
  round
} from '../config/pricing.js';
import { RECARGO_HOLOGRAFICO } from '../config/personalizados.js';

const precioTamano = (sizeId) => SIZES.find((s) => s.id === sizeId)?.price ?? null;

/** @returns {number} el precio de lista vigente, o el `basePrice` guardado si el id no se reconoce */
export function precioBaseVigente(line) {
  const guardado = line?.basePrice;
  const parts = String(line?.id ?? '').split(':');
  switch (parts[0]) {
    case 'sticker':
      return precioTamano(parts[2]) ?? guardado;
    case 'custom':
      return precioTamano(parts[1]) ?? guardado;
    case 'pack': {
      const base = precioTamano(parts[2]);
      if (base == null) return guardado;
      if (parts[1] === 'mayorista') return round(base * (1 - WHOLESALE_DISCOUNT));
      if (parts[1] === 'mayorista100') return PROMO_MAYORISTA_100.price;
      if (parts[1] === 'personalizados') return round(base * (1 - PERSONALIZADOS_DISCOUNT));
      return guardado;
    }
    case 'negocio':
      return NEGOCIO.price;
    case 'fixed': {
      if (parts[1] === TATUAJES.id) return TATUAJES.price;
      if (parts[1] === RECARGO_HOLOGRAFICO.id) return RECARGO_HOLOGRAFICO.precio;
      return precioPolaroidLista(parts[1]) ?? guardado;
    }
    case 'digital':
      return IMPRIMIBLES.find((p) => p.id === parts[1])?.price ?? guardado;
    default:
      return guardado;
  }
}

/** La línea con su `basePrice` al día (la misma línea si no cambió). */
export function conPrecioVigente(line) {
  const base = precioBaseVigente(line);
  return base === line?.basePrice ? line : { ...line, basePrice: base };
}
