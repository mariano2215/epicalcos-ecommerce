import { isSectionHidden } from '../config/site.js';
import {
  isMayoristaPromoActive,
  PROMO_MAYORISTA_100,
  WHOLESALE_QTY,
  WHOLESALE_DISCOUNT,
  IMPRIMIBLE_PRINCIPAL
} from '../config/pricing.js';
import { formatPrice } from '../lib/formato.js';

/**
 * Catálogo de categorías de EPICALCOS, en orden alfabético por nombre.
 * El `slug` coincide con la carpeta en frontend/public/stickers/<slug>/ y con
 * el manifest frontend/public/data/<slug>.json generado por scripts/build-catalog.mjs.
 * El conteo y la imagen de portada (cover) se leen en runtime de /data/catalog.json.
 *
 * El array de abajo lo ESCRIBE scripts/import-catalogo-completo.mjs entre sus
 * marcas: el slug, el nombre y el emoji salen del mapa CARPETAS de ese script.
 * Editarlo a mano acá se pierde en el próximo import — cambialo allá.
 */
export const CATEGORIES = [
  // <<< CATEGORIES: generado por scripts/import-catalogo-completo.mjs >>>
  { slug: 'aesthetic', name: 'Aesthetic', emoji: '🎨' },
  { slug: 'animales', name: 'Animales', emoji: '🐾' },
  { slug: 'anime', name: 'Anime', emoji: '🌸' },
  { slug: 'arcoiris', name: 'Arcoíris', emoji: '🌈' },
  { slug: 'argentina', name: 'Argentina', emoji: '🇦🇷' },
  { slug: 'bob-esponja', name: 'Bob Esponja', emoji: '🧽' },
  { slug: 'boca-juniors', name: 'Boca Juniors', emoji: '💙' },
  { slug: 'breaking-bad', name: 'Breaking Bad', emoji: '🧪' },
  { slug: 'bts', name: 'BTS', emoji: '💜' },
  { slug: 'caras-sonrientes', name: 'Caras Sonrientes', emoji: '😊' },
  { slug: 'cartoon-network', name: 'Cartoon Network', emoji: '📺' },
  { slug: 'clubes-rosario', name: 'Clubes de Rosario', emoji: '🏟️' },
  { slug: 'coca-cola-pepsi', name: 'Coca-Cola y Pepsi', emoji: '🥤' },
  { slug: 'comida-y-bebida', name: 'Comida y Bebida', emoji: '🍔' },
  { slug: 'corazones', name: 'Corazones', emoji: '❤️' },
  { slug: 'disney', name: 'Disney', emoji: '🏰' },
  { slug: 'escudos-futbol', name: 'Escudos de Fútbol', emoji: '🛡️' },
  { slug: 'feminismo', name: 'Feminismo', emoji: '♀️' },
  { slug: 'flores', name: 'Flores', emoji: '🌸' },
  { slug: 'formula-1', name: 'Fórmula 1', emoji: '🏁' },
  { slug: 'frases', name: 'Frases', emoji: '✍️' },
  { slug: 'friends', name: 'Friends', emoji: '🛋️' },
  { slug: 'gamer', name: 'Gamer', emoji: '🎮' },
  { slug: 'greys-anatomy', name: 'Grey\'s Anatomy', emoji: '🩺' },
  { slug: 'harry-potter', name: 'Harry Potter', emoji: '⚡' },
  { slug: 'harry-styles', name: 'Harry Styles', emoji: '🎤' },
  { slug: 'hockey', name: 'Hockey', emoji: '🏑' },
  { slug: 'lilo-y-stitch', name: 'Lilo y Stitch', emoji: '💙' },
  { slug: 'los-simpsons', name: 'Los Simpsons', emoji: '🍩' },
  { slug: 'mandalas', name: 'Mandalas', emoji: '🌀' },
  { slug: 'maradona', name: 'Maradona', emoji: '🙌' },
  { slug: 'marcas', name: 'Marcas', emoji: '™️' },
  { slug: 'mariposas', name: 'Mariposas', emoji: '🦋' },
  { slug: 'marvel', name: 'Marvel', emoji: '🦸' },
  { slug: 'memes', name: 'Memes', emoji: '😂' },
  { slug: 'messi', name: 'Messi', emoji: '🐐' },
  { slug: 'musica-latina', name: 'Música Latina', emoji: '🎶' },
  { slug: 'naturaleza', name: 'Naturaleza', emoji: '🌿' },
  { slug: 'nba', name: 'NBA', emoji: '🏀' },
  { slug: 'newells-old-boys', name: 'Newell\'s Old Boys', emoji: '🔴' },
  { slug: 'nike', name: 'Nike', emoji: '✔️' },
  { slug: 'pop-internacional', name: 'Pop Internacional', emoji: '🎵' },
  { slug: 'racing', name: 'Racing', emoji: '🩵' },
  { slug: 'rick-y-morty', name: 'Rick y Morty', emoji: '🛸' },
  { slug: 'river-plate', name: 'River Plate', emoji: '🤍' },
  { slug: 'rock-internacional', name: 'Rock Internacional', emoji: '🎸' },
  { slug: 'rock-nacional', name: 'Rock Nacional', emoji: '🎸' },
  { slug: 'rosa', name: 'Rosa', emoji: '🩷' },
  { slug: 'rosario-central', name: 'Rosario Central', emoji: '💛' },
  { slug: 'santa-cruz', name: 'Santa Cruz', emoji: '🛹' },
  { slug: 'scaloneta', name: 'Scaloneta', emoji: '🏆' },
  { slug: 'shaka-good-vibes', name: 'Shaka Good Vibes', emoji: '🤙' },
  { slug: 'starbucks', name: 'Starbucks', emoji: '☕' },
  { slug: 'stranger-things', name: 'Stranger Things', emoji: '🔦' },
  { slug: 'taylor-swift', name: 'Taylor Swift', emoji: '🩷' },
  { slug: 'the-office', name: 'The Office', emoji: '📎' },
  { slug: 'universo', name: 'Universo', emoji: '🌌' },
  { slug: 'van-life', name: 'Van Life', emoji: '🚐' },
  { slug: 'vans', name: 'Vans', emoji: '👟' },
  { slug: 'viajes', name: 'Viajes', emoji: '✈️' },
  { slug: 'vsco', name: 'VSCO', emoji: '📷' },
  // <<< fin CATEGORIES >>>
];

const BY_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]));

export const getCategory = (slug) => BY_SLUG[slug];
export const categoryName = (slug) => BY_SLUG[slug]?.name ?? slug;

/**
 * Secciones "especiales" que viven fuera del catálogo de imágenes y aparecen
 * como cards propias en la página de Categorías y en el Home.
 */
const ALL_SPECIALS = [
  {
    slug: 'personalizados',
    to: '/personalizados',
    name: 'Personalizados',
    emoji: '🎨',
    blurb: 'Tu diseño, sin mínimo · desde $1.200',
    accent: 'from-fuchsia-500 to-pink-500'
  },
  {
    slug: 'mayorista',
    to: '/mayorista',
    name: `Pack Mayorista x${WHOLESALE_QTY}`,
    emoji: '📦',
    // Mientras corre la promo el blurb anuncia el precio fijo; después vuelve el
    // 50% off. Cantidad, precio y % salen de config/pricing.js.
    blurb: isMayoristaPromoActive()
      ? `${PROMO_MAYORISTA_100.qty} calcos a ${formatPrice(PROMO_MAYORISTA_100.price)} · 4 y 6 cm`
      : `Armá ${WHOLESALE_QTY} calcos · ${Math.round(WHOLESALE_DISCOUNT * 100)}% off`,
    accent: 'from-amber-400 to-orange-500'
  },
  {
    slug: 'negocio',
    to: '/negocio',
    name: 'Negocio',
    emoji: '🏪',
    blurb: '100 calcos de tu logo en 6 cm · $39.999',
    accent: 'from-sky-400 to-blue-600'
  },
  {
    slug: 'archivos-imprimibles',
    to: '/archivos-imprimibles',
    name: 'Archivos imprimibles',
    emoji: '🖨️',
    // Producto digital: el gancho es que no hay envío ni espera. El precio sale
    // de pricing.js para que no quede desfasado si lo cambiás allá.
    blurb: `Diseños digitales por mail · $${IMPRIMIBLE_PRINCIPAL.price.toLocaleString('es-AR')}`,
    accent: 'from-emerald-400 to-teal-600'
  },
  {
    slug: 'tatuajes',
    to: '/tatuajes',
    name: 'Tatuajes temporales',
    emoji: '💉',
    blurb: 'Por hoja · $12.000',
    accent: 'from-violet-500 to-indigo-600'
  },
  {
    slug: 'polaroid',
    to: '/polaroid',
    name: 'Fotos Polaroid',
    emoji: '📸',
    blurb: 'x10 fotos · desde $9.000',
    accent: 'from-emerald-400 to-teal-500'
  }
];

/** Las especiales publicadas. Las despublicadas se listan en HIDDEN_SECTIONS (config/site.js). */
export const SPECIALS = ALL_SPECIALS.filter((s) => !isSectionHidden(s.slug));
