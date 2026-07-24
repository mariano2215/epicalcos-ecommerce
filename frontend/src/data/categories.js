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
  { slug: 'weed-creepy', name: 'Weed & Creepy', emoji: '🌿' },
  // --- Lote "Stickers CATALOGO" (importado 2026-06-27) ---
  { slug: 'caras-sonrientes', name: 'Caras Sonrientes', emoji: '😊' },
  { slug: 'comida-y-bebida', name: 'Comida y Bebida', emoji: '🍔' },
  { slug: 'deportes-autos', name: 'Deportes - Autos', emoji: '🏁' },
  { slug: 'deportes-nba', name: 'Deportes - NBA', emoji: '🏀' },
  { slug: 'disenos-aesthetic', name: 'Diseños - Aesthetic', emoji: '🎨' },
  { slug: 'disenos-falopa', name: 'Diseños - Falopa', emoji: '🍄' },
  { slug: 'disenos-muerte', name: 'Diseños - Muerte', emoji: '💀' },
  { slug: 'disenos-shaka', name: 'Diseños - Shaka', emoji: '🤙' },
  { slug: 'disenos-universo', name: 'Diseños - Universo', emoji: '🌌' },
  { slug: 'disenos-videojuegos', name: 'Diseños - Videojuegos', emoji: '🕹️' },
  { slug: 'disenos-vsco', name: 'Diseños - VSCO', emoji: '📷' },
  { slug: 'escritura-frases', name: 'Escritura - Frases', emoji: '✍️' },
  { slug: 'feminismo', name: 'Feminismo', emoji: '♀️' },
  { slug: 'futbol-boca', name: 'Futbol - Boca', emoji: '💙' },
  { slug: 'futbol-dioses-futbol', name: 'Futbol - Dioses Futbol', emoji: '🐐' },
  { slug: 'futbol-escudos', name: 'Futbol - Escudos', emoji: '🛡️' },
  { slug: 'futbol-jugadores', name: 'Futbol - Jugadores', emoji: '⚽' },
  { slug: 'futbol-maradona', name: 'Futbol - Maradona', emoji: '🙌' },
  { slug: 'futbol-messi', name: 'Futbol - Messi', emoji: '🐐' },
  { slug: 'futbol-nob', name: 'Futbol - NOB', emoji: '🔴' },
  { slug: 'futbol-racing', name: 'Futbol - Racing', emoji: '🩵' },
  { slug: 'futbol-river', name: 'Futbol - River', emoji: '🤍' },
  { slug: 'futbol-rosario-central', name: 'Futbol - Rosario Central', emoji: '💛' },
  { slug: 'futbol-scaloneta', name: 'Futbol - Scaloneta', emoji: '🏆' },
  { slug: 'futbol-scaloneta-qatar', name: 'Futbol - Scaloneta Qatar', emoji: '🏆' },
  { slug: 'marcas-coca-cola-pepsi', name: 'Marcas - Coca Cola Pepsi', emoji: '🥤' },
  { slug: 'marcas-nike', name: 'Marcas - Nike', emoji: '✔️' },
  { slug: 'marcas-santa-cruz', name: 'Marcas - Santa Cruz', emoji: '🛹' },
  { slug: 'marcas-starbucks', name: 'Marcas - Starbucks', emoji: '☕' },
  { slug: 'marcas-vans', name: 'Marcas - Vans', emoji: '👟' },
  { slug: 'musica-bts', name: 'Musica - BTS', emoji: '💜' },
  { slug: 'musica-harry-styles', name: 'Musica - Harry Styles', emoji: '🎤' },
  { slug: 'musica-latinoamerica', name: 'Musica - Latinoamerica', emoji: '🎶' },
  { slug: 'musica-pop-internacional', name: 'Musica - Pop Internacional', emoji: '🎵' },
  { slug: 'musica-rock-internacional', name: 'Musica - Rock Internacional', emoji: '🎸' },
  { slug: 'musica-rock-nacional', name: 'Musica - Rock Nacional', emoji: '🎸' },
  { slug: 'musica-taylor-swift', name: 'Musica - Taylor Swift', emoji: '🩷' },
  { slug: 'naturaleza', name: 'Naturaleza', emoji: '🌿' },
  { slug: 'naturaleza-agua', name: 'Naturaleza - Agua', emoji: '💧' },
  { slug: 'naturaleza-arcoiris', name: 'Naturaleza - Arcoiris', emoji: '🌈' },
  { slug: 'naturaleza-corazones', name: 'Naturaleza - Corazones', emoji: '❤️' },
  { slug: 'naturaleza-flores', name: 'Naturaleza - Flores', emoji: '🌸' },
  { slug: 'naturaleza-mandalas', name: 'Naturaleza - Mandalas', emoji: '🌀' },
  { slug: 'naturaleza-mariposas', name: 'Naturaleza - Mariposas', emoji: '🦋' },
  { slug: 'travel-travel', name: 'Travel - Travel', emoji: '🌍' },
  { slug: 'travel-van-life', name: 'Travel - Van Life', emoji: '🚐' },
  { slug: 'tv-anime', name: 'TV - Anime', emoji: '🎌' },
  { slug: 'tv-bob-esponja', name: 'TV - Bob Esponja', emoji: '🧽' },
  { slug: 'tv-breaking-bad', name: 'TV - Breaking Bad', emoji: '🧪' },
  { slug: 'tv-cartoon-network', name: 'TV - Cartoon Network', emoji: '📺' },
  { slug: 'tv-disney', name: 'TV - Disney', emoji: '🏰' },
  { slug: 'tv-friends', name: 'TV - Friends', emoji: '🛋️' },
  { slug: 'tv-gossip-girl', name: 'TV - Gossip Girl', emoji: '👑' },
  { slug: 'tv-greys-anatomy', name: 'TV - Greys Anatomy', emoji: '🩺' },
  { slug: 'tv-harry-potter', name: 'TV - Harry Potter', emoji: '🧙' },
  { slug: 'tv-los-simpsons', name: 'TV - Los Simpsons', emoji: '🍩' },
  { slug: 'tv-marvel', name: 'TV - Marvel', emoji: '🦸' },
  { slug: 'tv-nickelodeon', name: 'TV - Nickelodeon', emoji: '🟠' },
  { slug: 'tv-padrinos-magicos', name: 'TV - Padrinos Magicos', emoji: '🪄' },
  { slug: 'tv-rick-y-morty', name: 'TV - Rick y Morty', emoji: '🛸' },
  { slug: 'tv-series', name: 'TV - Series', emoji: '🎬' },
  { slug: 'tv-varios', name: 'TV - Varios', emoji: '📺' },
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
    blurb: 'Armá 100 calcos · 50% off',
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
    blurb: 'x10 fotos · desde $9.000',
    accent: 'from-emerald-400 to-teal-500'
  }
];
