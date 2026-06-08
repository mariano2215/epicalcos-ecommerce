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
  url: 'https://epicalcos-ecommerce.netlify.app', // TODO: cambiar cuando tengan dominio propio
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
  /** Costo de envío al resto del país */
  costInterior: 8000,
  /** Texto para retiro */
  pickupLabel: 'Coordinamos retiro por WhatsApp',
  /** Plazos de producción/entrega */
  productionDaysRosario: '2 a 3 días hábiles',
  productionDaysInterior: '7 a 10 días hábiles'
};

/**
 * Calcula costo de envío dado el método y subtotal.
 * @param {string} method - 'retiro' | 'envio-rosario' | 'envio-otra'
 * @param {number} subtotal
 * @returns {number} costo en pesos
 */
export function calculateShipping(method, subtotal) {
  if (method === 'retiro') return 0;
  if (method === 'envio-rosario') {
    return subtotal >= shipping.freeShippingThresholdRosario ? 0 : shipping.costRosario;
  }
  if (method === 'envio-otra') return shipping.costInterior;
  return 0;
}

export const shippingMethods = [
  { value: 'retiro', label: 'Retiro en Rosario' },
  { value: 'envio-rosario', label: 'Envío en Rosario' },
  { value: 'envio-otra', label: 'Envío al resto del país' }
];

export const order = {
  /** Pedido mínimo: 10 calcos por pedido (todos los packs ya cumplen por defecto) */
  minimumCalcos: 10,
  paymentMethods: ['Mercado Pago', 'Transferencia bancaria']
};

export const announcements = [
  '🚚 Envío gratis en Rosario desde $50.000',
  '⚡ Producción 2 a 3 días hábiles',
  '🔒 Pagá seguro con Mercado Pago'
];

export const navLinks = [
  { to: '/', label: 'Inicio' },
  { to: '/productos', label: 'Tienda' },
  { to: '/productos?cat=personalizadas', label: 'Personalizados' },
  { to: '/contacto', label: 'Contacto' }
];

export const footerLinks = {
  tienda: [
    { to: '/productos', label: 'Todos los productos' },
    { to: '/productos?cat=personalizadas', label: 'Personalizadas' },
    { to: '/productos?cat=polaroids', label: 'Polaroids' },
    { to: '/productos?cat=vinilos', label: 'Vinilos' }
  ],
  ayuda: [
    { to: '/contacto', label: 'Contacto' },
    { to: '/politicas/envios', label: 'Envíos' },
    { to: '/politicas/cambios', label: 'Cambios y devoluciones' },
    { to: '/politicas/privacidad', label: 'Privacidad' },
    { to: '/terminos-y-condiciones', label: 'Términos y condiciones' }
  ]
};
