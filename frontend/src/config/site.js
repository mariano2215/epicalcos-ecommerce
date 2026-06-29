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
  /** Costo de envío dentro de Rosario bajo el mínimo */
  costRosario: 3500,
  /** Costo de envío a ciudades próximas (Funes, Granadero Baigorria, Villa Gobernador Gálvez) */
  costNearby: 5000,
  /** Costo de envío al resto del país */
  costInterior: 8000,
  /** Texto para retiro */
  pickupLabel: 'Coordinamos retiro por WhatsApp',
  /** Plazos de producción/entrega */
  productionDaysRosario: '2 a 3 días hábiles',
  productionDaysInterior: '7 a 10 días hábiles'
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
 * Ciudades de Santa Fe con tarifa intermedia ("ciudades próximas", $5000).
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
 * - envío a Rosario → $3.500 (gratis desde $50.000 de subtotal)
 * - envío a ciudades próximas (Funes, Granadero Baigorria, Villa Gobernador Gálvez) → $5.000
 * - envío al resto del país → $8.000
 * @param {{ method: string, subtotal?: number, city?: string, province?: string }} opts
 * @returns {number}
 */
export function calculateShipping({ method, subtotal = 0, city, province }) {
  if (method === 'retiro') return 0;
  const zone = shippingZone(city, province);
  if (zone === 'rosario') {
    return subtotal >= shipping.freeShippingThresholdRosario ? 0 : shipping.costRosario;
  }
  if (zone === 'nearby') return shipping.costNearby;
  return shipping.costInterior;
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
  /** Pedido mínimo: 10 calcos por pedido (todos los packs ya cumplen por defecto) */
  minimumCalcos: 10,
  paymentMethods: ['Mercado Pago', 'Transferencia bancaria']
};

export const announcements = [
  '🚚 Envío gratis en Rosario desde $50.000',
  '👥 +5.000 clientes',
  '🇦🇷 Envíos a todo el país',
  '🎉 +120.000 calcos vendidas',
  '⚡ Producción 2 a 3 días hábiles',
  '✏️ Diseños personalizados',
  '🔒 Pagá seguro con Mercado Pago'
];

export const navLinks = [
  { to: '/', label: 'Inicio' },
  { to: '/categorias', label: 'Categorías' },
  { to: '/contacto', label: 'Contacto' }
];

export const footerLinks = {
  tienda: [
    { to: '/categorias', label: 'Todas las categorías' },
    { to: '/personalizados', label: 'Personalizados' },
    { to: '/mayorista', label: 'Pack Mayorista x100' },
    { to: '/negocio', label: 'Negocio' },
    { to: '/tatuajes', label: 'Tatuajes temporales' },
    { to: '/polaroid', label: 'Fotos Polaroid' }
  ],
  ayuda: [
    { to: '/contacto', label: 'Contacto' },
    { to: '/politicas/envios', label: 'Envíos' },
    { to: '/politicas/cambios', label: 'Cambios y devoluciones' },
    { to: '/politicas/privacidad', label: 'Privacidad' },
    { to: '/terminos-y-condiciones', label: 'Términos y condiciones' }
  ]
};
