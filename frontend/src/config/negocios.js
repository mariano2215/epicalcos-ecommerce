/**
 * Copy y datos de las páginas de NEGOCIO (spec 031) — una sola fuente, como
 * `config/personalizadosLanding.js` para /personalizados: así el día que haya
 * HTML prerenderizado (Fase 4) sale de los mismos textos que la página React.
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
 *
 * Este archivo crece por fase: la escala, los usos y las preguntas de negocio
 * se suman cuando se usan (Fases 2 y 3), para no publicar datos muertos.
 */
import { NEGOCIO, priceForSize } from './pricing.js';
import { shipping } from './site.js';
import { formatosLegibles } from './personalizados.js';
import { formatPrice } from '../lib/formato.js';
import { MARCAS } from '../data/marcas.js';

/** Desde cuántas calcos es un pedido de negocio. */
export const DESDE = NEGOCIO.qty;

/**
 * El precio por calco más bajo que se cobra HOY desde 100 (Promo Negocio y el
 * pack de 100: $52.999 / 100). Cuando entre la escala de la spec 032 esto pasa
 * a leer su escalón más barato.
 */
export const PRECIO_POR_CALCO_DESDE = Math.round(NEGOCIO.price / NEGOCIO.qty);

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
      // "Cuantas más pedís, más barato" recién es verdad con la escala de la
      // spec 032: hasta entonces el precio por calco es el mismo desde 100.
      d: `Desde ${DESDE} calcos, con uno o varios diseños.`
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

/** Mensajes precargados de WhatsApp por contexto (RF-W2; el resto en la Fase 2). */
export const WHATSAPP = {
  negocio: 'Hola EPICALCOS. Estoy buscando calcos personalizados para mi negocio.',
  /** El botón Cotizar del header: puede tocarlo cualquiera, de cualquier página. */
  cotizar: 'Hola EPICALCOS. Quiero cotizar calcos.'
};

export const SEO = {
  negocio: {
    title: `Calcos personalizados para negocios, desde ${DESDE} unidades`,
    description:
      `Calcos con tu logo para tu negocio desde ${DESDE} unidades: ${formatPrice(NEGOCIO.price)} los ${DESDE} ` +
      `(${formatPrice(PRECIO_POR_CALCO_DESDE)} por calco). Muestra gratis: vista previa digital antes de producir. ` +
      `Producción en ${shipping.produccionVolumen} y envíos a todo el país.`
  }
};
