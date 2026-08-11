/**
 * Configuración centralizada de EPICALCOS.
 * Todos los datos comerciales viven acá — un solo lugar para editar.
 */
import { formatPrice } from '../lib/formato.js';

export const site = {
  name: 'EPICALCOS',
  tagline: 'Calcos premium para personalizar lo que quieras!',
  description:
    'Calcomanías personalizadas, stickers premium, vinilos decorativos y fotos Polaroid en Rosario. Resistentes al agua y al sol. Comprá online con Mercado Pago.',
  city: 'Rosario, Santa Fe, Argentina',
  url: 'https://epicalcos.com',
  legalName: 'EPICALCOS — Mariano Calandra',
  taxIdType: 'CUIL', // personal, no monotributo/SRL
  founded: 2024
};

export const contact = {
  email: 'epicalcos@gmail.com',
  whatsapp: '+5493416806675',
  whatsappDisplay: '+54 9 341 680-6675',
  whatsappUrl: 'https://wa.me/5493416806675',
  instagram: '@epicalcos',
  instagramUrl: 'https://instagram.com/epicalcos'
};

/**
 * ⚠️ NINGÚN texto del sitio escribe estos montos a mano: el ticker de anuncios,
 * el FAQ, /politicas/envios, el carrito y el checkout los leen de acá. Si
 * cambiás un umbral, cambia todo junto y el sitio no se contradice solo.
 */
export const shipping = {
  /**
   * Envío gratis en Rosario a partir de este monto.
   * ⚠️ Espejado en netlify/functions/lib/pricing.js (FREE_SHIPPING_THRESHOLD_ROSARIO).
   */
  freeShippingThresholdRosario: 50000,
  /**
   * Envío gratis al RESTO DEL PAÍS (ciudades próximas + interior) a partir de
   * este monto. En Rosario sigue mandando el umbral de arriba, que es más bajo.
   * ⚠️ Espejado en netlify/functions/lib/pricing.js (FREE_SHIPPING_THRESHOLD_NATIONAL).
   */
  freeShippingThresholdNational: 75000,
  /** Costo de envío dentro de Rosario bajo el mínimo (motomensajería) */
  costRosario: 4500,
  /** Costo de envío a ciudades próximas (Funes, Granadero Baigorria, Villa Gobernador Gálvez) */
  costNearby: 6500,
  /** Costo de envío al resto del país (Correo Argentino) */
  costInterior: 8500,
  /** Texto para retiro */
  pickupLabel: 'Coordinamos retiro por WhatsApp',
  /** Zona donde se retira (se avisa en el checkout para evitar pedidos de envío después) */
  pickupZone: 'Ov. Lagos y Bv. Seguí, Rosario',

  /**
   * PRODUCCIÓN e ENTREGA son dos cosas distintas y hay que decirlas por separado.
   * Antes las dos vivían como `productionDaysRosario` / `productionDaysInterior`,
   * y el interior mostraba "producción: 5 a 7 días hábiles" cuando en realidad
   * esos 5-7 días son producción MÁS el correo (así lo dice la FAQ y el mail de
   * confirmación). El cliente leía un plazo de taller inflado.
   *
   * `production` = impresión y corte, igual para todo destino, desde que se
   * confirma el pago. `delivery*` = plazo total estimado hasta que lo recibe.
   */
  production: '2 a 3 días hábiles',
  deliveryRosario: '2 a 3 días hábiles',
  deliveryInterior: '5 a 7 días hábiles'
};

/** Provincias y jurisdicciones de Argentina (orden alfabético) para el select del checkout. */
export const provinces = [
  'Buenos Aires',
  'Ciudad Autónoma de Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán'
];

/**
 * Ciudades de Santa Fe con tarifa intermedia ("ciudades próximas", $6500).
 * Se comparan normalizadas (minúsculas y sin acentos).
 */
const nearbyCities = ['funes', 'granadero baigorria', 'villa gobernador galvez'];

/** Normaliza ciudad/provincia para comparar: minúsculas, sin acentos, sin espacios extra. */
function normalize(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determina la zona de envío según ciudad + provincia.
 * Las tarifas especiales (Rosario y ciudades próximas) solo aplican en Santa Fe.
 * @returns {'rosario' | 'nearby' | 'interior'}
 */
export function shippingZone(city, province) {
  const c = normalize(city);
  const p = normalize(province);
  if (p === 'santa fe') {
    if (c === 'rosario') return 'rosario';
    if (nearbyCities.includes(c)) return 'nearby';
  }
  return 'interior';
}

/**
 * Calcula el costo de envío en pesos según método, subtotal y destino.
 * - retiro → 0 (gratis)
 * - carrito con un pack que trae el envío incluido (`freeShipping`) → 0, sin
 *   importar zona ni subtotal (ver FREE_SHIPPING_PACK_TYPES en config/pricing.js)
 * - envío a Rosario (motomensajería) → `costRosario` (gratis desde `freeShippingThresholdRosario`)
 * - envío a ciudades próximas (Funes, Granadero Baigorria, Villa Gobernador Gálvez) → `costNearby`
 * - envío al resto del país (Correo Argentino) → `costInterior`
 * - fuera de Rosario, cualquier destino viaja GRATIS desde `freeShippingThresholdNational`
 * @param {{ method: string, subtotal?: number, city?: string, province?: string,
 *           freeShipping?: boolean }} opts
 * @returns {number}
 */
export function calculateShipping({ method, subtotal = 0, city, province, freeShipping = false }) {
  // 'digital' = el pedido son solo archivos imprimibles: no hay nada que despachar.
  if (method === 'retiro' || method === 'digital' || freeShipping) return 0;
  const zone = shippingZone(city, province);
  if (zone === 'rosario') {
    return subtotal >= shipping.freeShippingThresholdRosario ? 0 : shipping.costRosario;
  }
  // Resto del país (ciudades próximas + interior): gratis desde el umbral nacional.
  if (subtotal >= shipping.freeShippingThresholdNational) return 0;
  if (zone === 'nearby') return shipping.costNearby;
  return shipping.costInterior;
}

/**
 * Monto de subtotal desde el cual el envío es gratis para ese destino (el
 * umbral de Rosario o el nacional, según la zona). Sirve para el "sumá $X y el
 * envío te sale gratis" del checkout.
 */
export function freeShippingThresholdFor(city, province) {
  return shippingZone(city, province) === 'rosario'
    ? shipping.freeShippingThresholdRosario
    : shipping.freeShippingThresholdNational;
}

/** Etiqueta legible del método/zona para el vendedor (mail + CRM Notion). */
export function shippingMethodLabel(method, city, province) {
  if (method === 'digital') return 'Entrega por email';
  if (method === 'retiro') return 'Retiro en Rosario';
  const zone = shippingZone(city, province);
  if (zone === 'rosario') return 'Envío a Rosario';
  if (zone === 'nearby') return 'Envío a ciudad próxima';
  return 'Envío al resto del país';
}

export const shippingMethods = [
  { value: 'retiro', label: 'Retiro en Rosario (gratis)' },
  { value: 'envio', label: 'Envío a domicilio' }
];

export const order = {
  /** No hay pedido mínimo: se puede comprar un solo calco (catálogo o personalizado). */
  minimumCalcos: 1,
  paymentMethods: ['Mercado Pago', 'Transferencia bancaria']
};

/** Datos para pagar por transferencia bancaria (se muestran en el checkout y el mail de confirmación). */
export const bankTransfer = {
  cvu: '0000003100088847424287',
  alias: 'epicalcos.mp',
  titular: 'MARIANO ALEJANDRO JESUS CALANDRA',
  /** Número de WhatsApp para enviar el comprobante (mismo que contact.whatsapp). */
  receiptWhatsapp: '3416806675'
};

export const announcements = [
  // El envío gratis a todo el país va primero: es lo que más pesa en la decisión.
  // Los montos SALEN DEL CONFIG: escritos a mano, un cambio de umbral dejaba el
  // ticker prometiendo un número y el checkout cobrando otro.
  `🇦🇷 Envío gratis a todo el país desde ${formatPrice(shipping.freeShippingThresholdNational)}`,
  `🚚 Envío gratis en Rosario desde ${formatPrice(shipping.freeShippingThresholdRosario)}`,
  '👥 +5.000 clientes',
  '🎉 +120.000 calcos vendidas',
  '⚡ Producción 2 a 3 días hábiles',
  '✏️ Diseños personalizados',
  '🔒 Pagá seguro con Mercado Pago'
];

/**
 * Secciones despublicadas temporalmente. El código de la sección queda intacto:
 * sólo se le sacan las puertas de entrada (nav, menú, footer, Home, Categorías,
 * buscador, sitemap y feed de Meta) y la ruta redirige a /categorias.
 *
 * PARA DESPUBLICAR UNA: agregá su slug acá y listo, no hay que tocar nada más.
 * (`/personalizados` estuvo apagada del 27/7/2026 al 3/8/2026, hasta rehacer el
 * configurador: hoy son tres pasos —tamaño, corte y archivo— y volvió a estar viva.)
 */
export const HIDDEN_SECTIONS = [];

/** true si la sección está despublicada. Acepta el slug ('personalizados') o el path ('/personalizados'). */
export const isSectionHidden = (slugOrPath) =>
  HIDDEN_SECTIONS.includes(String(slugOrPath).replace(/^\//, ''));

/** Saca de una lista de links los que apuntan a una sección oculta. */
const visibles = (links) => links.filter((l) => !isSectionHidden(l.to));

export const navLinks = visibles([
  { to: '/', label: 'Inicio' },
  { to: '/categorias', label: 'Categorías' },
  // "Packs" y no "Armá tu pack": con 8 links, la etiqueta larga parte el nav en
  // dos líneas a 1024 px (el breakpoint donde deja de mostrarse la hamburguesa).
  // La página sí se titula "Armá tu pack".
  { to: '/armar-pack', label: 'Packs' },
  { to: '/personalizados', label: 'Personalizados' },
  { to: '/mayorista', label: 'Mayorista' },
  { to: '/negocio', label: 'Negocio' },
  // "Imprimibles" y no "Archivos imprimibles": el nav ya venía justo de ancho
  // (ver el comentario de "Packs" acá arriba) y la etiqueta larga lo parte en dos.
  { to: '/archivos-imprimibles', label: 'Imprimibles' },
  { to: '/contacto', label: 'Contacto' },
  // FAQ es una sección del Home (id="faq"); el hash hace que el header scrollee hasta ahí.
  { to: '/#faq', label: 'FAQ', hash: true }
]);

export const footerLinks = {
  tienda: visibles([
    { to: '/categorias', label: 'Todas las categorías' },
    { to: '/armar-pack', label: 'Armá tu pack' },
    { to: '/personalizados', label: 'Personalizados' },
    { to: '/mayorista', label: 'Pack Mayorista x100' },
    { to: '/negocio', label: 'Negocio' },
    { to: '/archivos-imprimibles', label: 'Archivos imprimibles' },
    { to: '/tatuajes', label: 'Tatuajes temporales' },
    { to: '/polaroid', label: 'Fotos Polaroid' }
  ]),
  ayuda: [
    { to: '/contacto', label: 'Contacto' },
    { to: '/politicas/envios', label: 'Envíos' },
    { to: '/politicas/cambios', label: 'Cambios y devoluciones' },
    { to: '/politicas/privacidad', label: 'Privacidad' },
    { to: '/terminos-y-condiciones', label: 'Términos y condiciones' }
  ]
};
