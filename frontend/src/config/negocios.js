/**
 * Copy y datos de las páginas de NEGOCIO (spec 031) — una sola fuente, como
 * `config/personalizadosLanding.js` para /personalizados: así el HTML
 * prerenderizado (`lib/negociosEstatico.js`) sale de los mismos textos que la
 * página React, y no pueden decir cosas distintas.
 *
 * ⚠️ NI UN MONTO, PLAZO NI CIFRA ESCRITO A MANO. Todo se interpola desde
 * config/pricing.js (espejado en el servidor), config/site.js y la lista de
 * marcas. Escrito a mano, un precio queda viejo en la próxima suba y la página
 * promete lo que el checkout no cobra. Lo frena `negocios.test.js`.
 *
 * ⚠️ COPY QUE NO VA (decisiones de Mariano, ver `negocios.test.js`):
 * - "archivo perfecto" — siembra la duda justo al subir (15/8 y 14/9/2026).
 * - "boceto" — no se diseña desde cero.
 * - "muestra" a secas: la MUESTRA GRATIS es una VISTA PREVIA DIGITAL por
 *   WhatsApp antes de producir, solo en pedidos de 100+ (5/10/2026). Siempre
 *   se aclara, para que nadie espere una calco física por correo.
 * - Ningún código de cupón: los cupones son ocultos.
 * - Ninguna regla que Mariano no confirmó: el beneficio por recompra (N-4),
 *   el ajuste de logos (N-5) y el reparto por defecto entre varios diseños
 *   (N-9) siguen abiertos y NO se publican (spec 034).
 *
 * Desde la spec 034 este archivo trae también el cotizador, la escala, los
 * usos, los materiales, las preguntas de negocio, el Home B2B y /mayorista.
 */
import { NEGOCIO, priceForSize, ESCALA_MIN, ESCALA_MAX, TRANSFER_PCT } from './pricing.js';
import { shipping } from './site.js';
import { formatosLegibles, ARCHIVO, getTamano, MATERIALES, MATERIAL_HOLOGRAFICO_ID } from './personalizados.js';
import { formatPrice } from '../lib/formato.js';
import { filasEscala, TAMANOS_ESCALA } from '../lib/cotizadorNegocio.js';
import { MARCAS } from '../data/marcas.js';
import { CATEGORY_COUNT } from '../data/catalogStats.js';
import { WHATSAPP, COTIZADOR_ACTIVO } from './negociosBase.js';

/** Un número como lo lee una persona: `1000` → `"1.000"`. */
const num = (n) => Number(n).toLocaleString('es-AR');

/** "4 y 6 cm": los tamaños que se venden por mayor, leídos de la escala. */
const TAMANOS_POR_MAYOR = (() => {
  const cms = TAMANOS_ESCALA.map((id) => getTamano(id)?.label.replace(/\s*cm$/, ''));
  return `${cms.slice(0, -1).join(', ')}${cms.length > 1 ? ' y ' : ''}${cms.at(-1)} cm`;
})();

/** Desde cuántas calcos es un pedido de negocio. */
export const DESDE = NEGOCIO.qty;

/**
 * El precio por calco de un pedido de 100 (Promo Negocio = primer escalón de la
 * escala: $52.999 / 100). Es el "desde" del hero de /negocio.
 */
export const PRECIO_POR_CALCO_DESDE = Math.round(NEGOCIO.price / NEGOCIO.qty);

/**
 * El precio por calco del escalón más grande de la escala (spec 032). Va
 * SIEMPRE junto a su cantidad ("$371 con 1.000"): solo, al lado de "desde 100
 * unidades", haría creer que 100 calcos salen a ese precio (spec 034, RF-11).
 */
const ESCALA_6CM = filasEscala({ tamano: NEGOCIO.size });
export const PRECIO_POR_CALCO_MAX_VOLUMEN = ESCALA_6CM.at(-1)?.unitario ?? PRECIO_POR_CALCO_DESDE;

/** La misma calco, suelta, en el tamaño de Negocio: la referencia del "desde". */
export const PRECIO_SUELTA = priceForSize(NEGOCIO.size);

export const MUESTRA_GRATIS = {
  titulo: 'Muestra gratis',
  aclaracion: 'Vista previa digital antes de producir'
};

export const HERO = {
  eyebrow: 'Para marcas y negocios',
  h1: 'Calcos con tu logo para tu negocio.',
  bajada:
    `Desde ${DESDE} unidades. Mandanos tu logo o tu diseño y te llegan las calcos ` +
    'listas para pegar en tus pedidos, tu packaging o tus productos.',
  precio: {
    principal: `Desde ${formatPrice(PRECIO_POR_CALCO_DESDE)} por calco`,
    referencia: `en vez de ${formatPrice(PRECIO_SUELTA)} la suelta`
  },
  ctaPrimario: 'Cotizar mis calcos',
  ctaSecundario: 'Ver precios',
  fotoEtiqueta: 'Foto real de una tirada'
};

/** Los cuatro datos de la barra de confianza (RF-T1). */
export const CONFIANZA = [
  { icono: '📦', valor: `Desde ${DESDE}`, label: 'unidades por pedido' },
  { icono: '👀', valor: MUESTRA_GRATIS.titulo, label: MUESTRA_GRATIS.aclaracion.toLowerCase() },
  { icono: '⚡', valor: shipping.produccionVolumen, label: 'de producción' },
  { icono: '🤝', valor: `${MARCAS.length} marcas`, label: 'ya confiaron en nosotros' }
];

/** "Cómo funciona" (RF-P1). El plazo corre desde la vista previa aprobada y el pago acreditado. */
export const PASOS = {
  titulo: 'Pedir tus calcos es así de simple',
  items: [
    {
      t: 'Elegí cantidad, tamaño y material',
      // Desde la spec 034 la escala de la 032 está en la página: "mientras más
      // cantidad, más barato" ya es verdad y se puede decir.
      d: `Desde ${DESDE} calcos, con uno o varios diseños. Mientras más cantidad, menos pagás por calco.`
    },
    {
      t: 'Subí tu diseño',
      d: `Tu logo o tu arte en ${formatosLegibles()}. También podés mandarlo por WhatsApp.`
    },
    {
      t: 'Te mandamos una vista previa gratis',
      d: 'Por WhatsApp, antes de imprimir: es tu muestra gratis, digital. Producimos cuando la aprobás.'
    },
    {
      t: 'Producimos y te lo mandamos',
      d:
        `En ${shipping.produccionVolumen} desde que aprobás la vista previa y se acredita el pago. ` +
        'Envíos a todo el país o retiro en Rosario.'
    }
  ]
};

export const CTA_FINAL = {
  h2: 'Tu marca también puede ser calco.',
  bajada: `Empezá tu pedido desde ${DESDE} unidades.`,
  ctaPrimario: 'Cotizar mis calcos',
  ctaSecundario: 'Ver precios'
};

/**
 * Mensajes precargados de WhatsApp (RF-W2). Viven en `negociosBase.js` porque
 * los leen el header y el botón flotante, que están en todas las rutas.
 */
export { WHATSAPP };

// ─── Cotizador (spec 031 §7.5, spec 034 §7.1) ───────────────────────────────

/**
 * `activo` es el interruptor de vuelta atrás (spec 034, RF-5): en `false`,
 * /negocio vuelve a mostrar el formulario de la Promo Negocio (`NegocioForm`),
 * que sigue en el repo. Se cambia en `negociosBase.js` (`COTIZADOR_ACTIVO`),
 * porque también lo lee el botón Cotizar del header.
 */
export const COTIZADOR = {
  activo: COTIZADOR_ACTIVO,
  titulo: '¿Cuántas calcos necesitás?',
  bajada: 'Elegí cantidad, tamaño y material: el precio que ves es el que pagás.',
  grupos: {
    cantidad: 'Cantidad',
    tamano: 'Tamaño',
    material: 'Material',
    disenos: 'Diseños'
  },
  cantidadMas: `Más de ${num(ESCALA_MAX)}`,
  /** Para qué suele ir cada tamaño en un negocio. Sugerencias de uso, no promesas. */
  usosTamano: {
    '4cm': 'Bolsas, frascos y tarjetas',
    '6cm': 'Cajas, packaging y productos'
  },
  recomendado: 'Recomendado',
  disenos: {
    uno: 'Un diseño',
    varios: 'Varios diseños',
    cuantos: '¿Cuántos diseños distintos?',
    indicaciones: '¿Cuántas de cada uno? (opcional)',
    indicacionesAyuda: 'Si no nos decís, lo coordinamos por WhatsApp antes de producir.'
  },
  muestra: `${MUESTRA_GRATIS.titulo} · ${MUESTRA_GRATIS.aclaracion.toLowerCase()}`,
  porCalco: 'por calco',
  transferencia: `pagando por transferencia (${TRANSFER_PCT}% menos)`,
  continuar: 'Continuar con mi pedido',
  datosTitulo: 'Tus datos para el pedido',
  razonSocial: {
    label: 'Razón social o nombre del negocio',
    ayuda: 'La necesitamos para tu factura C.',
    error: 'Poné la razón social o el nombre de tu negocio'
  },
  cuit: {
    label: 'CUIT (opcional)',
    ayuda: 'Si querés la factura a nombre de tu empresa.',
    error: 'Revisá el CUIT: son 11 números'
  },
  subida: {
    titulo: 'Subí tu logo o tus diseños',
    descripcion:
      `${formatosLegibles()}, hasta ${ARCHIVO.pesoMaximoMB} MB cada uno. Si tenés el vectorial (AI, SVG o PDF), mejor: ` +
      'el corte sale más preciso. También podés mandarlos por WhatsApp después de pagar.'
  },
  agregar: 'Agregar al carrito',
  whatsapp: '¿Dudas? Escribinos con esta configuración',
  presupuesto: {
    titulo: 'Para más de esa cantidad armamos una propuesta a medida.',
    bajada: 'Dejanos tus datos con lo que necesitás, o escribinos por WhatsApp.'
  }
};

/** La tabla "Mientras más cantidad, más barato te sale" (031 RF-E1). */
export const ESCALA = {
  titulo: 'Mientras más cantidad, más barato te sale.',
  bajada: 'Lo único que no cambia es la calidad.',
  /** Solo el escalón más grande: es el único "mejor precio" verificable (031 RF-E3). */
  mejorPrecio: 'Mejor precio por calco',
  nota:
    `Precios con Mercado Pago, en ${TAMANOS_POR_MAYOR}. Pagando por transferencia, ${TRANSFER_PCT}% menos. ` +
    `El envío se calcula en el checkout: gratis desde ${formatPrice(shipping.freeShippingThresholdNational)} a todo el país ` +
    `(${formatPrice(shipping.freeShippingThresholdRosario)} en Rosario).`,
  holografico: 'Holográfico'
};

/** "¿Necesitás más de 1.000?" (031 RF-K1). */
export const PEDIDOS_GRANDES = {
  titulo: `¿Necesitás más de ${num(ESCALA_MAX)} calcos?`,
  bajada: 'Contanos qué necesitás y te armamos una propuesta.',
  ctaPresupuesto: 'Pedir presupuesto',
  ctaWhatsapp: 'Hablar por WhatsApp'
};

// ─── Contenido de la landing (spec 031 §7.7, spec 034) ──────────────────────

/**
 * Usos por RUBRO (spec 034, D-11): lo pide el pedido del 17/10/2026 y conecta
 * con el anuncio por rubro. Son sugerencias de uso, sin fotos: no hay fotos
 * reales de calcos aplicadas en negocios (N-6) y la regla es no poner otras.
 * `id` es estable (analytics y prerender).
 */
export const USOS = {
  titulo: 'Un detalle chico que hace que tu marca aparezca en todas partes.',
  items: [
    { id: 'gastronomia', icono: '🍔', t: 'Gastronomía', d: 'En las bolsas y cajas del delivery, en los vasos y en el mostrador.' },
    { id: 'tiendas', icono: '🛍️', t: 'Tiendas', d: 'En las bolsas, en las cajas de regalo y como sorpresa en cada compra.' },
    { id: 'ecommerce', icono: '📦', t: 'Ecommerce', d: 'Para cerrar las cajas de envío y que tu marca llegue antes de abrir el paquete.' },
    { id: 'gimnasios', icono: '💪', t: 'Gimnasios', d: 'En botellas, bolsos y en el kit de bienvenida de cada socio.' },
    { id: 'eventos', icono: '🎉', t: 'Eventos', d: 'En souvenirs, kits y regalos de casamientos, cumpleaños y empresas.' },
    { id: 'emprendimientos', icono: '✨', t: 'Emprendimientos', d: 'Tu logo en cada producto que vendés, desde la primera tanda.' }
  ]
};

/** Materiales (031 RF-M1/M2): de `MATERIALES` de personalizados, para que no digan otra cosa. */
export const MATERIALES_NEGOCIO = {
  titulo: 'Materiales',
  bajada: `Todos en ${TAMANOS_POR_MAYOR}, desde ${ESCALA_MIN} calcos.`,
  items: MATERIALES.map((m) => ({
    id: m.id,
    label: m.label,
    descripcion: m.descripcion,
    recomendado: m.id === MATERIALES[0].id,
    nota:
      m.id === MATERIAL_HOLOGRAFICO_ID
        ? `Va en pedidos desde ${ESCALA_MIN} calcos, en ${TAMANOS_POR_MAYOR}.`
        : m.id === 'dtf-uv'
        ? 'Mismo precio que el vinilo blanco.'
        : null
  }))
};

/**
 * Preguntas de negocio (031 RF-F1). Cada respuesta sale de un dato del config
 * o de una decisión de Mariano ya tomada; `id` estable para `faq_open`.
 *
 * NO están (y no se agregan sin su OK): beneficio por recompra (N-4), si se
 * ajustan logos (N-5), reparto por defecto entre diseños (N-9).
 */
export const PREGUNTAS = {
  titulo: 'Preguntas de negocios',
  items: [
    {
      id: 'minimo',
      q: '¿Cuál es el pedido mínimo?',
      a: `Para el precio por cantidad, ${ESCALA_MIN} calcos. Si necesitás menos, en Personalizados las hacés desde una.`
    },
    {
      id: 'varios-disenos',
      q: '¿Puedo pedir varios diseños en el mismo pedido?',
      a: 'Sí. Elegís "Varios diseños", nos decís cuántas querés de cada uno y, si no, lo coordinamos por WhatsApp antes de producir.'
    },
    {
      id: 'tamanos',
      q: '¿En qué tamaños?',
      a: `Por cantidad, en ${TAMANOS_POR_MAYOR}. El de 9 cm se pide suelto, desde una calco.`
    },
    {
      id: 'materiales',
      q: '¿Qué material me conviene?',
      a: MATERIALES.map((m) => `${m.label}: ${m.descripcion}`).join(' ') + ' El DTF UV sale lo mismo que el vinilo blanco.'
    },
    {
      id: 'agua-sol',
      q: '¿Aguantan el agua y el sol?',
      a: 'Sí, están pensadas para uso cotidiano y exposición normal al sol.'
    },
    {
      id: 'archivo',
      q: '¿Cómo les mando mi logo?',
      a:
        `Lo subís en el cotizador (${formatosLegibles()}, hasta ${ARCHIVO.pesoMaximoMB} MB) o lo mandás por WhatsApp después de pagar. ` +
        'Si tenés el vectorial (AI, SVG o PDF), mejor: el corte sale más preciso.'
    },
    {
      id: 'revision',
      q: '¿Y si mi archivo no sirve para imprimir?',
      a: 'Revisamos cada archivo antes de producir y, si hay algo para ajustar, te escribimos por WhatsApp antes de imprimir nada.'
    },
    {
      id: 'vista-previa',
      q: '¿Veo cómo queda antes de que lo impriman?',
      a: `Sí. Con ${shipping.produccionVolumenDesde} calcos o más te mandamos gratis una vista previa digital por WhatsApp, y producimos cuando la aprobás.`
    },
    {
      id: 'plazo',
      q: '¿Cuánto tardan?',
      a: `La producción lleva ${shipping.produccionVolumen} desde que aprobás la vista previa y se acredita el pago. Después lo despachamos o lo retirás.`
    },
    {
      id: 'envios',
      q: '¿Hacen envíos?',
      a:
        `Sí, a todo el país por Correo Argentino y en Rosario por moto. Es gratis desde ${formatPrice(shipping.freeShippingThresholdNational)} ` +
        `(${formatPrice(shipping.freeShippingThresholdRosario)} en Rosario). También podés retirar sin costo en Rosario.`
    },
    {
      id: 'factura',
      q: '¿Puedo pedir factura?',
      a: 'Sí, emitimos factura C.'
    },
    {
      id: 'transferencia',
      q: '¿Hay descuento pagando por transferencia?',
      a: `Sí, ${TRANSFER_PCT}% en todo el pedido. Lo elegís en el checkout.`
    },
    {
      id: 'mas-de-mil',
      q: `¿Hacen pedidos de más de ${num(ESCALA_MAX)}?`,
      a: 'Sí. Contanos qué necesitás con el formulario o por WhatsApp y te armamos una propuesta.'
    },
    {
      id: 'repetir',
      q: '¿Puedo volver a pedir el mismo diseño?',
      a: 'Sí. Escribinos por WhatsApp y armamos el pedido de nuevo.'
    }
  ]
};

/** El camino a la tienda en el Home B2B (031 RF-HO2, spec 034 RF-12). */
export const CAMINO_TIENDA = {
  titulo: '¿Buscás calcos para vos?',
  bajada: `${CATEGORY_COUNT} categorías de diseños, desde una calco. O hacelas con tu diseño.`,
  ctaTienda: 'Ver tienda',
  ctaPersonalizados: 'Con tu diseño, desde una'
};

/** La variante B2B del Home (spec 034, RF-10/11). Copy del pedido del 17/10/2026. */
export const HOME_B2B = {
  eyebrow: HERO.eyebrow,
  h1: 'Tu marca merece calcos que se destaquen.',
  bajada:
    'Calcos personalizados en vinilo premium para negocios, emprendimientos y eventos. ' +
    `Con tu logo o diseño, desde ${DESDE} unidades.`,
  precio: {
    principal: `${formatPrice(PRECIO_POR_CALCO_DESDE)} por calco con ${DESDE}`,
    referencia: `${formatPrice(PRECIO_POR_CALCO_MAX_VOLUMEN)} con ${num(ESCALA_MAX)}`
  },
  ctaPrimario: 'Cotizá tus calcos para negocio',
  ctaSecundario: 'Explorá la tienda'
};

// ─── /mayorista (spec 034 §7.6) ─────────────────────────────────────────────

export const MAYORISTA = {
  eyebrow: 'Por mayor',
  h1: `Calcos por mayor, desde ${ESCALA_MIN} unidades.`,
  bajada:
    `Elegí los diseños del catálogo, subí los tuyos o mezclá, en ${TAMANOS_POR_MAYOR}. ` +
    'Mientras más cantidad, menos pagás por calco.',
  condiciones: [
    { icono: '🔢', t: 'Cantidad', d: `De ${ESCALA_MIN} a ${num(ESCALA_MAX)} calcos online. Para más, te armamos un presupuesto.`, soloEscala: true },
    { icono: '📏', t: 'Tamaños', d: `${TAMANOS_POR_MAYOR}. El de 9 cm va suelto, en la tienda.` },
    { icono: '🎨', t: 'Diseños', d: 'Los elegís vos: del catálogo, propios o mezclados. Podés repetir el mismo.' },
    { icono: '👀', t: MUESTRA_GRATIS.titulo, d: `${MUESTRA_GRATIS.aclaracion}, por WhatsApp.` },
    { icono: '⚡', t: 'Producción', d: `${shipping.produccionVolumen} desde que se confirma y se abona el pedido.` },
    {
      icono: '🚚',
      t: 'Envío',
      d: `Gratis desde ${formatPrice(shipping.freeShippingThresholdNational)} a todo el país (${formatPrice(shipping.freeShippingThresholdRosario)} en Rosario). Si no, se calcula en el checkout.`
    },
    { icono: '💳', t: 'Pago', d: `Con Mercado Pago, o por transferencia con ${TRANSFER_PCT}% menos.` }
  ],
  armadorTitulo: 'Armá tu pedido',
  armadorBajada: `Tocá los diseños para sumarlos. Mínimo ${ESCALA_MIN}, máximo ${num(ESCALA_MAX)}: el precio por calco baja solo al pasar cada escalón.`,
  conTuLogo: {
    t: '¿Querés tus calcos con tu logo?',
    d: 'Para tu marca, con tu logo o tu diseño en material a elección.',
    cta: 'Calcos para negocios'
  }
};

export const SEO = {
  negocio: {
    title: `Calcos personalizados para negocios, desde ${DESDE} unidades`,
    description:
      `Calcos con tu logo para tu negocio desde ${DESDE} unidades: ${formatPrice(NEGOCIO.price)} los ${DESDE} ` +
      `y ${formatPrice(PRECIO_POR_CALCO_MAX_VOLUMEN)} por calco con ${num(ESCALA_MAX)}. Muestra gratis: vista previa digital ` +
      `antes de producir. Producción en ${shipping.produccionVolumen}.`
  },
  mayorista: {
    title: `Calcos por mayor desde ${ESCALA_MIN} unidades · precios por cantidad`,
    description:
      `Calcos por mayor: de ${ESCALA_MIN} a ${num(ESCALA_MAX)}, del catálogo o con tus diseños, en ${TAMANOS_POR_MAYOR}. ` +
      `${ESCALA_MIN} a ${formatPrice(ESCALA_6CM[0]?.total ?? NEGOCIO.price)} y ${formatPrice(PRECIO_POR_CALCO_MAX_VOLUMEN)} por calco con ${num(ESCALA_MAX)}. ` +
      `Producción en ${shipping.produccionVolumen}.`
  }
};
