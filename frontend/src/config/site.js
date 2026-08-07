/**
 * Configuración centralizada de EPICALCOS.
 * Todos los datos comerciales viven acá — un solo lugar para editar.
 */

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

export const shipping = {
  /** Envío gratis en Rosario a partir de este monto */
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
  /** Plazos de producción/entrega */
  productionDaysRosario: '2 a 3 días hábiles',
  productionDaysInterior: '5 a 7 días hábiles'
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
 * - envío a Rosario (motomensajería) → $4.500 (gratis desde $50.000 de subtotal)
 * - envío a ciudades próximas (Funes, Granadero Baigorria, Villa Gobernador Gálvez) → $6.500
 * - envío al resto del país (Correo Argentino) → $8.500
 * - fuera de Rosario, cualquier destino viaja GRATIS desde $75.000 de subtotal
 * @param {{ method: string, subtotal?: number, city?: string, province?: string }} opts
 * @returns {number}
 */
export function calculateShipping({ method, subtotal = 0, city, province }) {
  if (method === 'retiro') return 0;
  const zone = shippingZone(city, province);
  if (zone === 'rosario') {
    return subtotal >= shipping.freeShippingThresholdRosario ? 0 : shipping.costRosario;
  }
  // Resto del país (ciudades próximas + interior): gratis desde $75.000.
  if (subtotal >= shipping.freeShippingThresholdNational) return 0;
  if (zone === 'nearby') return shipping.costNearby;
  return shipping.costInterior;
}

/**
 * Monto de subtotal desde el cual el envío es gratis para ese destino:
 * $50.000 en Rosario, $75.000 en el resto del país. Sirve para el "sumá $X y el
 * envío te sale gratis" del checkout.
 */
export function freeShippingThresholdFor(city, province) {
  return shippingZone(city, province) === 'rosario'
    ? shipping.freeShippingThresholdRosario
    : shipping.freeShippingThresholdNational;
}

/** Etiqueta legible del método/zona para el vendedor (mail + CRM Notion). */
export function shippingMethodLabel(method, city, province) {
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
  '🇦🇷 Envío gratis a todo el país desde $75.000',
  '🚚 Envío gratis en Rosario desde $50.000',
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
  { to: '/personalizados', label: 'Personalizados' },
  { to: '/mayorista', label: 'Mayorista' },
  { to: '/negocio', label: 'Negocio' },
  { to: '/contacto', label: 'Contacto' },
  // FAQ es una sección del Home (id="faq"); el hash hace que el header scrollee hasta ahí.
  { to: '/#faq', label: 'FAQ', hash: true }
]);

export const footerLinks = {
  tienda: visibles([
    { to: '/categorias', label: 'Todas las categorías' },
    { to: '/personalizados', label: 'Personalizados' },
    { to: '/mayorista', label: 'Pack Mayorista x100' },
    { to: '/negocio', label: 'Negocio' },
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
