/**
 * El selector con el que arranca el Home (spec 031, enmienda E-1, 5/10/2026).
 *
 * Pedido de Mariano: "Que el HERO arranque con un SELECTOR: POR MENOR / POR
 * MAYOR. Si es por menor: TIENDA / PERSONALIZADOS. Si es por mayor: PARA MI
 * NEGOCIO / COMPRAR MUCHAS EN CANTIDAD." Reemplaza al hero del termo (spec
 * 028), que eligió sacar entero.
 *
 * Por qué dos preguntas y no cuatro botones de una: la primera decisión del
 * que entra es CÓMO compra (una calco o cien), y recién después QUÉ. Cuatro
 * botones juntos mezclan las dos preguntas y el de negocio se pierde entre los
 * del catálogo.
 *
 * ⚠️ Ni un precio ni una cantidad a mano: salen de config/pricing.js (espejado
 * en el servidor) y de la lista de categorías. Lo verifica `selectorCompra.test.js`.
 * Una opción cuya sección esté en HIDDEN_SECTIONS no se muestra.
 */
import { SIZES, NEGOCIO, WHOLESALE_QTY } from './pricing.js';
import { isSectionHidden } from './site.js';
import { formatPrice } from '../lib/formato.js';
import { CATEGORY_COUNT } from '../data/catalogStats.js';

const PRECIO_SUELTA_MINIMO = Math.min(...SIZES.map((s) => s.price));
const PRECIO_POR_MAYOR = Math.round(NEGOCIO.price / NEGOCIO.qty);

export const HERO_SELECTOR = {
  // Partido en dos: el hero resalta la segunda mitad con `gradient-text`. El H1
  // dice "calcos" (piso de SEO de la spec 015).
  h1: ['Calcos para vos', 'o para tu negocio.'],
  pregunta: '¿Cómo querés comprar?'
};

/**
 * `seccion` = el slug de HIDDEN_SECTIONS que apaga la opción.
 * `to` de Personalizados: la card de "Diseño propio" de /categorias (pedido de
 * Mariano), no el configurador directo.
 */
const TODOS = [
  {
    id: 'menor',
    label: 'Por menor',
    detalle: ['Desde 1 calco', `desde ${formatPrice(PRECIO_SUELTA_MINIMO)} c/u`],
    destinos: [
      {
        id: 'tienda',
        label: 'Tienda',
        texto: `${CATEGORY_COUNT} categorías de diseños listos para elegir`,
        to: '/categorias'
      },
      {
        id: 'personalizados',
        label: 'Personalizados',
        texto: 'Tu foto, tu dibujo o tu logo, desde 1 calco',
        to: '/categorias#diseno-propio',
        seccion: 'personalizados'
      }
    ]
  },
  {
    id: 'mayor',
    label: 'Por mayor',
    detalle: [`Desde ${NEGOCIO.qty} calcos`, `${formatPrice(PRECIO_POR_MAYOR)} c/u`],
    destinos: [
      {
        id: 'negocio',
        label: 'Para mi negocio',
        texto: 'Calcos con tu logo para tus pedidos, tu packaging o tus productos',
        to: '/negocio',
        seccion: 'negocio'
      },
      {
        id: 'mayorista',
        label: 'Comprar muchas en cantidad',
        texto: `Packs desde ${WHOLESALE_QTY} calcos, del catálogo o con tus diseños`,
        to: '/mayorista',
        seccion: 'mayorista'
      }
    ]
  }
];

export const TIPOS = TODOS.map((t) => ({
  ...t,
  destinos: t.destinos.filter((d) => !d.seccion || !isSectionHidden(d.seccion))
}));
