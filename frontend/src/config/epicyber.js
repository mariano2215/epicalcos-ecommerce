/**
 * EPICYBER WEEK 2026 (spec 036): copy y lógica de presentación.
 *
 * ⚠️ Acá no hay precios ni fechas escritos a mano: salen de `CYBER` en
 * config/pricing.js, que es lo que está espejado en el servidor. Mover la fecha
 * o un precio ahí mueve la barra, el banner y el contador sin tocar este archivo.
 */
import {
  CYBER,
  CYBER_START_MS,
  CYBER_END_MS,
  WHOLESALE_QTY,
  TRANSFER_PCT,
  packCyberDeLinea,
  precioHabitualPack
} from './pricing.js';
import { formatPrice } from '../lib/formato.js';

const ZONA = 'America/Argentina/Buenos_Aires';
const parte = (ms, opciones) =>
  new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, ...opciones }).format(new Date(ms));

/** "del 2 al 8 de noviembre". */
export const RANGO_FECHAS = `del ${parte(CYBER_START_MS, { day: 'numeric' })} al ${parte(CYBER_END_MS, { day: 'numeric' })} de ${parte(CYBER_END_MS, { month: 'long' })}`;

export const EPICYBER_COPY = {
  barra: {
    titulo: `⚡ ${CYBER.nombre}`,
    subtitulo: `Ofertas especiales ${RANGO_FECHAS}`
  },
  banner: {
    titulo: CYBER.nombre,
    subtitulo: 'Tus calcos favoritos con precios especiales',
    // El brief agrega "holográficos y mucho más". Va cuando esa promo tenga
    // precio aprobado: hoy sería anunciar algo que el carrito no cobra.
    texto: 'Promociones en packs chicos, calcos personalizados y packs para tu marca',
    cta: 'VER OFERTAS'
  },
  chicos: {
    titulo: 'PACKS CYBER PARA TUS IDEAS',
    subtitulo: 'Elegí cuántos calcos querés y aprovechá los precios especiales'
  },
  mayoristas: {
    titulo: 'TU MARCA PEGA MÁS FUERTE',
    subtitulo: 'Cuantos más calcos pedís, menos pagás por unidad',
    texto: 'Para packaging, branding y merchandising. Con tus diseños o con los del catálogo.',
    cta: 'PERSONALIZAR MI PEDIDO'
  }
};

/** La letra chica, junto a la oferta y con los números reales. */
export const CONDICIONES_CYBER =
  `Válido ${RANGO_FECHAS} (hora Argentina), en 4 y 6 cm. ` +
  `Precios con Mercado Pago; pagando por transferencia, ${TRANSFER_PCT}% menos. ` +
  'No se acumula con cupones. El envío se calcula según tu zona.';

/**
 * Propuestas del brief sin costo o sin precio. Se ven SOLO en la vista previa:
 * no tienen regla en el servidor, así que publicarlas sería prometer un
 * descuento que el checkout no cobra.
 */
export const CYBER_PENDIENTES = [
  { id: 'holografico', titulo: 'Calcos holográficos', oferta: 'Hasta 20% OFF en packs seleccionados', falta: 'Costo del material' },
  { id: 'dtf-uv', titulo: 'DTF UV', oferta: 'Hasta 15% OFF en productos elegibles', falta: 'Costo del material' },
  { id: 'polaroid', titulo: 'Fotos Polaroid', oferta: '3×2', falta: 'Costo por pack y cruce con su descuento por volumen' },
  { id: 'tatuajes', titulo: 'Tatuajes temporales', oferta: 'A definir', falta: 'Costo por hoja y definir la promo' }
];

/** Precio por calco para mostrar. */
export const porCalco = (pack) => Math.round(pack.price / pack.qty);

/** % real contra lo que esa cantidad cuesta hoy. Se mide en 4 cm: es el menor de los dos. */
export function offDePack(pack) {
  const habitual = precioHabitualPack({ qty: pack.qty, size: CYBER.sizes[0] });
  return habitual > pack.price ? Math.round((1 - pack.price / habitual) * 100) : 0;
}

export function separarPacks(packs) {
  return {
    chicos: packs.filter((p) => p.qty < WHOLESALE_QTY),
    mayoristas: packs.filter((p) => p.qty >= WHOLESALE_QTY)
  };
}

/** Lo que espera `promo` de PackBuilder para vender este pack. */
export function promoDePack(pack) {
  return {
    active: true,
    tipo: 'cyber',
    qty: pack.qty,
    price: pack.price,
    sizes: CYBER.sizes,
    habitualDe: (size) => precioHabitualPack({ qty: pack.qty, size }),
    nota: `Pack de ${pack.qty} calcos a ${formatPrice(pack.price)}, en 4 o 6 cm. ${CONDICIONES_CYBER}`
  };
}

/** El pack que le sigue a esa cantidad entre los que se venden ahora. */
export const packSiguiente = (packs, qty) => packs.find((p) => p.qty > qty) || null;

/** El texto del upsell: siempre con la diferencia real en pesos. */
export function textoUpsell(pack, diferencia) {
  return diferencia > 0
    ? `Por ${formatPrice(diferencia)} más, llevate ${pack.qty} calcos`
    : `El pack de ${pack.qty} te sale ${formatPrice(-diferencia)} menos`;
}

/** Quita el " · 6 cm" que `addSticker` le agrega al nombre del diseño. */
const nombreSinTamano = (nombre) => String(nombre || '').split(' · ')[0];

/**
 * Qué sugerirle a alguien con este carrito. Pura, sin React.
 *
 * - Con un pack de campaña: el siguiente, conservando sus diseños. Las líneas
 *   con diseños propios quedan afuera: `SubidaArchivo` no recibe archivos ya
 *   subidos, así que sembrarlas se los perdería.
 * - Con calcos sueltas: el pack más chico que las contiene. Un pack es de un
 *   solo tamaño, así que siembra las del tamaño que más pesa y deja el resto.
 *
 * @returns {null | { pack, diferencia: number, texto: string,
 *   semilla: { size: string, items: Array, reemplazar: string[] } }}
 */
export function sugerenciaCyber(items, packs) {
  if (!packs.length) return null;

  const conPack = items.filter((i) => packCyberDeLinea(i.id));
  if (conPack.length) {
    const linea = conPack.find((i) => !(Number(i.meta?.customCount) > 0));
    if (!linea) return null;
    const { qty, size } = packCyberDeLinea(linea.id);
    const pack = packSiguiente(packs, qty);
    if (!pack) return null;
    const diferencia = pack.price - linea.price;
    return {
      pack,
      diferencia,
      texto: textoUpsell(pack, diferencia),
      semilla: { size, items: linea.meta?.items || [], reemplazar: [linea.id] }
    };
  }

  const unidadesDe = (size) =>
    items.filter((i) => i.type === 'sticker' && i.size === size).reduce((a, i) => a + i.quantity, 0);
  const size = [...CYBER.sizes].sort((a, b) => unidadesDe(b) - unidadesDe(a))[0];
  const unidades = unidadesDe(size);
  if (!unidades) return null;

  const pack = packs.find((p) => p.qty >= unidades);
  if (!pack) return null;

  const sueltas = items.filter((i) => i.type === 'sticker' && i.size === size);
  const diferencia = pack.price - sueltas.reduce((a, i) => a + i.price * i.quantity, 0);
  return {
    pack,
    diferencia,
    texto: textoUpsell(pack, diferencia),
    semilla: {
      size,
      items: sueltas.map((i) => ({
        id: i.id.split(':')[1],
        sku: i.catalogSku,
        name: nombreSinTamano(i.name),
        image: i.image,
        category: i.category,
        qty: i.quantity
      })),
      reemplazar: sueltas.map((i) => i.id)
    }
  };
}
