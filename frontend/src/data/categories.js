/**
 * Catálogo de categorías de EPICALCOS.
 * El `slug` coincide con la carpeta en frontend/public/stickers/<slug>/ y con
 * el manifest frontend/public/data/<slug>.json generado por scripts/build-catalog.mjs.
 * El conteo y la imagen de portada (cover) se leen en runtime de /data/catalog.json.
 */
export const CATEGORIES = [
  { slug: 'anime', name: 'Anime', emoji: '🌸' },
  { slug: 'argentina', name: 'Argentina', emoji: '🇦🇷' },
  { slug: 'autos-y-motos', name: 'Autos y Motos', emoji: '🏎️' },
  { slug: 'bob-esponja', name: 'Bob Esponja', emoji: '🧽' },
  { slug: 'buenas-vibras', name: 'Buenas Vibras', emoji: '✨' },
  { slug: 'calcos-especiales', name: 'Calcos Especiales', emoji: '💎' },
  { slug: 'calcos-xl', name: 'Calcos XL', emoji: '🔳' },
  { slug: 'campeones', name: 'Campeones', emoji: '🏆' },
  { slug: 'cats', name: 'Gatitos', emoji: '🐱' },
  { slug: 'ciencia', name: 'Ciencia', emoji: '🔬' },
  { slug: 'cute', name: 'Cute', emoji: '🥰' },
  { slug: 'deportes', name: 'Deportes', emoji: '⚽' },
  { slug: 'digimon', name: 'Digimon', emoji: '🦖' },
  { slug: 'disney', name: 'Disney', emoji: '🏰' },
  { slug: 'dragon-ball', name: 'Dragon Ball', emoji: '🐉' },
  { slug: 'futbol', name: 'Fútbol', emoji: '⚽' },
  { slug: 'gamer', name: 'Gamer', emoji: '🎮' },
  { slug: 'girl-power', name: 'Girl Power', emoji: '💪' },
  { slug: 'halloween', name: 'Halloween', emoji: '🎃' },
  { slug: 'harry-potter', name: 'Harry Potter', emoji: '⚡' },
  { slug: 'homedeco', name: 'Home Deco', emoji: '🏠' },
  { slug: 'infantil', name: 'Infantil', emoji: '🧸' },
  { slug: 'los-simpsons', name: 'Los Simpsons', emoji: '🍩' },
  { slug: 'marcas', name: 'Marcas', emoji: '™️' },
  { slug: 'memes', name: 'Memes', emoji: '😂' },
  { slug: 'musica', name: 'Música', emoji: '🎵' },
  { slug: 'naruto', name: 'Naruto', emoji: '🍥' },
  { slug: 'nba', name: 'NBA', emoji: '🏀' },
  { slug: 'pokemon', name: 'Pokémon', emoji: '⚡' },
  { slug: 'pride', name: 'Pride', emoji: '🏳️‍🌈' },
  { slug: 'rap-reggaeton', name: 'Rap & Reggaetón', emoji: '🎤' },
  { slug: 'rick-and-morty', name: 'Rick and Morty', emoji: '🛸' },
  { slug: 'series-peliculas', name: 'Series y Películas', emoji: '🎬' },
  { slug: 'space', name: 'Espacio', emoji: '🚀' },
  { slug: 'star-wars', name: 'Star Wars', emoji: '✨' },
  { slug: 'superheroes', name: 'Superhéroes', emoji: '🦸' },
  { slug: 'viajes', name: 'Viajes', emoji: '✈️' },
  { slug: 'weed-creepy', name: 'Weed & Creepy', emoji: '🌿' }
];

const BY_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]));

export const getCategory = (slug) => BY_SLUG[slug];
export const categoryName = (slug) => BY_SLUG[slug]?.name ?? slug;

/**
 * Secciones "especiales" que viven fuera del catálogo de imágenes y aparecen
 * como cards propias en la página de Categorías y en el Home.
 */
export const SPECIALS = [
  {
    slug: 'personalizados',
    to: '/personalizados',
    name: 'Personalizados',
    emoji: '🎨',
    blurb: 'Tus propios diseños, mínimo 10 · 10% off',
    accent: 'from-fuchsia-500 to-pink-500'
  },
  {
    slug: 'mayorista',
    to: '/mayorista',
    name: 'Pack Mayorista x100',
    emoji: '📦',
    blurb: 'Armá 100 calcos · 25% off',
    accent: 'from-amber-400 to-orange-500'
  },
  {
    slug: 'negocio',
    to: '/negocio',
    name: 'Negocio',
    emoji: '🏪',
    blurb: '100 calcos de tu logo en 6 cm · $40.000',
    accent: 'from-sky-400 to-blue-600'
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
    blurb: 'x10 fotos · $10.000',
    accent: 'from-emerald-400 to-teal-500'
  }
];
