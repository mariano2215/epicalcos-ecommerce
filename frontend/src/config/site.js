/**
 * Configuración centralizada de EPICALCOS.
 * Todos los datos comerciales viven acá — un solo lugar para editar.
 */
import { formatPrice } from '../lib/formato.js';
import { TRANSFER_OFF, esCategoriaEn2x1, NEGOCIO } from './pricing.js';

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
  freeShippingThresholdRosario: 35000,
  /**
   * Envío gratis al RESTO DEL PAÍS (ciudades próximas + interior) a partir de
   * este monto. En Rosario sigue mandando el umbral de arriba, que es más bajo.
   * $55.000 desde el 1/10/2026 (spec 029, enmienda): con los precios nuevos la
   * promo de 100 calcos y Negocio ($52.999) quedaban arriba de $50.000 y
   * viajaban gratis a todo el país pagando con Mercado Pago. Mariano subió el
   * umbral para que sigan pagando envío fuera de Rosario, como hasta ese día.
   * ⚠️ Espejado en netlify/functions/lib/pricing.js (FREE_SHIPPING_THRESHOLD_NATIONAL).
   */
  freeShippingThresholdNational: 55000,
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
  deliveryInterior: '5 a 7 días hábiles',

  /**
   * Plazo de producción de los pedidos GRANDES (spec 031, RF-P3). Mariano,
   * 5/10/2026: "aplica para todo, los 3 a 5 días siendo 100 calcos o más". Es
   * de cualquier producto —calcos de catálogo, personalizados, packs, Negocio—:
   * lo que manda es cuántas calcos tiene el pedido, no qué página lo armó.
   * Corre desde que se aprueba la vista previa y se acredita el pago.
   *
   * Los `delivery*` de arriba suman producción + correo con el plazo corto, así
   * que NO valen para estos pedidos: con 100+ se dice la producción y que
   * después se despacha, sin inventar un total.
   *
   * ⚠️ Espejado en netlify/functions/lib/plazoProduccion.js (el mail al
   * cliente). Cómo se cuentan las calcos: lib/plazoProduccion.js.
   */
  produccionVolumen: '3 a 5 días hábiles',
  produccionVolumenDesde: 100
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
 * - envío a Rosario (motomensajería) → `costRosario` (gratis desde `freeShippingThresholdRosario`)
 * - envío a ciudades próximas (Funes, Granadero Baigorria, Villa Gobernador Gálvez) → `costNearby`
 * - envío al resto del país (Correo Argentino) → `costInterior`
 * - fuera de Rosario, cualquier destino viaja GRATIS desde `freeShippingThresholdNational`
 *
 * ⚠️ El umbral es el ÚNICO camino al envío gratis. No hay parámetro para que un
 * pack o una promo lo saltee, y no hay que agregarlo: ver el bloque "NO HAY
 * PACKS CON EL ENVÍO INCLUIDO" en config/pricing.js.
 *
 * @param {{ method: string, subtotal?: number, city?: string, province?: string }} opts
 * @returns {number}
 */
export function calculateShipping({ method, subtotal = 0, city, province }) {
  // 'digital' = el pedido son solo archivos imprimibles: no hay nada que despachar.
  if (method === 'retiro' || method === 'digital') return 0;
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

/**
 * Garantía de devolución (spec 020). UN solo número para todo el sitio: lo leen
 * la tira de anuncios, /politicas/cambios, los Términos (§6) y el FAQ.
 *
 * Hasta el 14/9/2026 la política era "no aceptamos cambios ni devoluciones"
 * (fallas de fábrica: 7 días; errores de pedido: 48 h). Mariano la cambió a
 * devolución por CUALQUIER motivo durante 30 días, con condiciones: calcos sin
 * pegar, envío de vuelta a cargo del cliente salvo falla o error nuestro, y lo
 * hecho con el archivo del cliente solo por falla. El detalle está en
 * specs/020-ticker-de-confianza/requirements.md §9.
 *
 * ⚠️ Cambiar el número acá cambia a la vez la promesa de la tira y el texto
 * legal: es lo que tiene que pasar. Escrito a mano en cualquiera de los cuatro
 * lugares, el día que se toque uno el sitio promete un plazo y la política
 * cumple otro. `lib/politicaDevoluciones.test.js` lo verifica.
 */
export const devoluciones = {
  /** Días corridos desde que el cliente RECIBE el pedido (no desde que paga). */
  dias: 30
};

/**
 * Mensajes de la tira de arriba (`AnnouncementBar`), que los pasa en continuo.
 * Cada uno responde una duda de compra —cuánto sale el envío, qué promo hay,
 * qué pasa si no me gusta— y nada más.
 *
 * Esto ya fue y vino, así que la historia importa:
 * - Hasta el 4/9/2026 era una marquesina con SIETE promesas (los dos umbrales
 *   de envío, +5.000 clientes, +120.000 calcos, producción, personalizados y
 *   pago seguro). Una barra que promete siete cosas no comunica ninguna.
 * - La spec 014 la dejó en DOS mensajes, uno por vez, y la apagaba cuando había
 *   una promo viva. Con el 3x2 sin fecha de fin (spec 017) eso la apagó para
 *   siempre: desde el 7/9/2026 el header no decía desde cuánto el envío es
 *   gratis.
 * - La spec 020 (14/9/2026, pedido de Mariano) la vuelve marquesina, visible
 *   también con promo, con estos cuatro mensajes. Las métricas de marca siguen
 *   afuera —tienen su sección (MetricasConfianza), igual que los atributos del
 *   producto (Beneficios)— y `lib/anuncios.test.js` frena que vuelvan.
 *
 * Es una FUNCIÓN y no un array porque el mensaje del 2x1 depende de que la promo
 * esté viva: un array armado al cargar el módulo seguiría anunciando una promo
 * apagada. `now` se inyecta para testear los bordes sin mockear el reloj (mismo
 * criterio que `esActiva()` en config/pricing.js).
 *
 * ⚠️ Los montos, el % por transferencia y los días de garantía SALEN DEL CONFIG.
 * Escritos a mano, un cambio dejaba la barra prometiendo un número y el
 * checkout cobrando otro.
 *
 * ⚠️ El % por transferencia NUNCA se anuncia a secas: siempre con su condición
 * (`TRANSFER_OFF` la trae adentro). Es el error que ya se cometió en
 * /categorias con "10% off automático" y que el cliente descubría recién al
 * elegir medio de pago. Desde la spec 027 no hay mínimo de calcos.
 *
 * ⚠️ Argentina se anuncia por el 2x1, NO por un %. La promo ARGENTINA 50 %
 * venció el 19/8/2026, y reactivarla la ACUMULARÍA con el 2x1: un par saldría
 * 75 % off. Decisión de Mariano, 14/9/2026.
 *
 * @param {number} [now]
 * @returns {string[]}
 */
export function anunciosVigentes(now = Date.now(), { negocio = false } = {}) {
  return [
    // Solo en las páginas de negocio (spec 031, RF-N5): ahí es la duda #1 —
    // "¿me lo hacen con mi logo y desde cuánto?"—. En la tienda sería ruido.
    negocio && `🏷️ Calcos con tu logo desde ${NEGOCIO.qty} unidades`,
    `🚚 Envío gratis desde ${formatPrice(shipping.freeShippingThresholdRosario)} en Rosario ` +
      `y desde ${formatPrice(shipping.freeShippingThresholdNational)} al resto del país`,
    esCategoriaEn2x1('argentina', now) && '🇦🇷 2x1 en calcos de Argentina',
    `🔄 ${devoluciones.dias} días de garantía y devolución`,
    `💸 ${TRANSFER_OFF}, en cualquier compra`
  ].filter(Boolean);
}

/**
 * Secciones despublicadas temporalmente. El código de la sección queda intacto:
 * sólo se le sacan las puertas de entrada (nav, menú, footer, Home, Categorías,
 * buscador, sitemap y feed de Meta) y la ruta redirige a /categorias.
 *
 * PARA DESPUBLICAR UNA: agregá su slug acá y listo, no hay que tocar nada más.
 * (`/personalizados` estuvo apagada del 27/7/2026 al 3/8/2026, hasta rehacer el
 * configurador: hoy son tres pasos —tamaño, corte y archivo— y volvió a estar viva.)
 *
 * `archivos-imprimibles`: despublicada el 24/8/2026 por decisión de Mariano. El
 * producto digital sigue ENTERO —precio espejado, checkout sin dirección,
 * entregar-digital.js y sus mails— justamente para que los pedidos ya vendidos
 * se puedan seguir entregando y reenviando. Solo se cerraron las puertas.
 *
 * `armar-pack`: despublicada el 26/8/2026 por decisión de Mariano. La escalera
 * de precios de packs de catálogo (PACK_TIERS en config/pricing.js, espejada en
 * el servidor) queda INTACTA: la sigue usando /mayorista, que comparte el
 * componente PackBuilder. Lo único que dejó de tener entrada es el armador de
 * /armar-pack. Ojo si se republica: el experimento CRO-007 (`ahorro_pack`, en
 * lib/experiments.js) sigue `active: true` y mide la card de esa página, así
 * que mientras esté despublicada no recibe tráfico.
 */
export const HIDDEN_SECTIONS = ['archivos-imprimibles', 'armar-pack'];

/** true si la sección está despublicada. Acepta el slug ('personalizados') o el path ('/personalizados'). */
export const isSectionHidden = (slugOrPath) =>
  HIDDEN_SECTIONS.includes(String(slugOrPath).replace(/^\//, ''));

/** Saca de una lista de links los que apuntan a una sección oculta. */
const visibles = (links) => links.filter((l) => !isSectionHidden(l.to));

/**
 * Categorías del grupo Minorista del menú (spec 033, RF-M7): las 8 primeras de
 * las destacadas del Home (`FEATURED_SLUGS` en routes/Home.jsx).
 *
 * ⚠️ NO son "las más vendidas" y el menú no puede decirlo: de ventas por
 * categoría no hay dato (ver lib/searchCatalog.js). Si Mariano sabe cuáles
 * venden más, se cambian acá y listo. Un slug que no exista en
 * data/categories.js no rompe nada (el header lo saltea), pero lo frena
 * navMenu.test.js.
 */
export const NAV_CATEGORIAS = [
  'argentina',
  'anime',
  'disney',
  'escudos-futbol',
  'harry-potter',
  'marvel',
  'memes',
  'los-simpsons'
];

/**
 * Saca del menú las opciones que apuntan a una sección oculta, y el grupo que
 * se queda sin ninguna (RF-M9). `oculta` es parámetro solo para poder probarlo
 * sin tocar HIDDEN_SECTIONS.
 */
export function menuVisible(menu, oculta = isSectionHidden) {
  return menu
    .map((e) => (e.items ? { ...e, items: e.items.filter((l) => !oculta(l.to)) } : e))
    .filter((e) => (e.items ? e.items.length > 0 : !oculta(e.to)));
}

/**
 * Menú principal por tipo de compra (spec 033, 15/10/2026):
 *
 *   Home · Mayorista ▾ · Minorista ▾ · Otros productos ▾ · Contacto
 *
 * Mariano: "quedó muy confuso". El de la spec 031 (Para negocios · Precios ·
 * Con tu diseño · Tienda · Preguntas) ponía al mismo nivel lugares, anclas
 * dentro de un lugar ("Precios" bajaba a /negocio, "Preguntas" al FAQ del Home)
 * y un nombre que no se entendía solo ("Con tu diseño"); y Mayorista, Polaroid,
 * Tatuajes y Contacto no tenían entrada fuera del footer. Ahora el menú repite
 * la misma decisión que el selector POR MENOR / POR MAYOR del hero del Home:
 * ¿muchas o pocas?
 *
 * Una entrada con `to` es un link directo; una con `items`, un grupo que se
 * despliega (components/MenuPrincipal.jsx). `detalle` es la línea chica debajo
 * de la opción.
 * `categorias` (solo Minorista) son slugs: nombre y emoji los pone el header
 * desde data/categories.js, para no sumarle el catálogo a este módulo.
 * `activoEn` son prefijos de ruta que también marcan al grupo como activo
 * (una categoría o un producto son Minorista aunque no estén en `items`).
 *
 * ⚠️ El botón "Cotizar" NO está acá: es un CTA, no un link de navegación, y el
 * header lo dibuja aparte (ver Header.jsx y BotonCotizar.jsx).
 */
export const navMenu = menuVisible([
  { to: '/', label: 'Home' },
  {
    id: 'mayorista',
    label: 'Mayorista',
    items: [
      { to: '/mayorista', label: 'Mayorista +100 calcos', detalle: 'Elegí 100 diseños del catálogo o subí los tuyos' },
      { to: '/negocio', label: 'Negocio', detalle: '100 calcos con tu logo, también tornasoladas' }
    ]
  },
  {
    id: 'minorista',
    label: 'Minorista',
    items: [
      { to: '/personalizados', label: 'Personalizados', detalle: 'Con tu diseño, desde 1 calco' },
      // `verTodas`: el header la dibuja debajo de las categorías, como cierre de
      // esa lista, y no junto a Personalizados.
      { to: '/categorias', label: 'Ver todas las categorías', verTodas: true }
    ],
    categorias: NAV_CATEGORIAS,
    activoEn: ['/categoria/', '/producto/']
  },
  {
    id: 'otros',
    label: 'Otros productos',
    items: [
      { to: '/polaroid', label: 'Fotos Polaroid' },
      { to: '/tatuajes', label: 'Tatuajes temporales' }
    ]
  },
  { to: '/contacto', label: 'Contacto' }
]);

/**
 * Todos los links del menú en una lista plana (sin las categorías). Lo lee
 * lib/personalizadosEstatico.js para los links internos del HTML
 * prerenderizado de /personalizados, que antes salían de la lista plana de la
 * spec 031.
 */
export const navMenuPlano = navMenu.flatMap((e) => e.items || [e]);

/**
 * "Dejar mis datos" del botón Cotizar (spec 031, enmienda E-1): el formulario
 * de /contacto con la consulta ya armada para cotizar. `motivo=cotizar` lo lee
 * FormularioContacto; `#formulario` baja hasta él (en el celular va después de
 * la card de WhatsApp).
 */
export const COTIZAR_FORM_HREF = '/contacto?motivo=cotizar#formulario';

/**
 * Footer en cuatro grupos (spec 031, RF-N4): Productos · Ayuda · EPICALCOS ·
 * Legal. Los canales externos de EPICALCOS (mail, WhatsApp, Instagram) los
 * dibuja Footer.jsx con sus íconos; acá van solo las rutas internas.
 *
 * ⚠️ `ayuda` lo lee también lib/personalizadosEstatico.js para los links del
 * HTML prerenderizado de /personalizados: no renombrar la clave.
 */
export const footerLinks = {
  productos: visibles([
    { to: '/negocio', label: 'Calcos para negocios' },
    { to: '/mayorista', label: 'Mayorista: pedidos grandes' },
    { to: '/personalizados', label: 'Calcos con tu diseño' },
    { to: '/categorias', label: 'Tienda' },
    { to: '/armar-pack', label: 'Armá tu pack' },
    { to: '/archivos-imprimibles', label: 'Archivos imprimibles' },
    { to: '/tatuajes', label: 'Tatuajes temporales' },
    { to: '/polaroid', label: 'Fotos Polaroid' }
  ]),
  ayuda: [
    { to: '/negocio#como-funciona', label: 'Cómo funciona' },
    { to: '/#faq', label: 'Preguntas frecuentes' },
    { to: '/politicas/envios', label: 'Envíos' },
    { to: '/politicas/cambios', label: 'Cambios y devoluciones' }
  ],
  epicalcos: [{ to: '/contacto', label: 'Contacto' }],
  legal: [
    { to: '/terminos-y-condiciones', label: 'Términos y condiciones' },
    { to: '/politicas/privacidad', label: 'Privacidad' }
  ]
};
