export const categories = [
  { slug: 'todas', name: 'Todas' },
  { slug: 'anime', name: 'Anime' },
  { slug: 'futbol', name: 'Fútbol' },
  { slug: 'series', name: 'Series y Películas' },
  { slug: 'personalizadas', name: 'Personalizadas' },
  { slug: 'polaroids', name: 'Polaroids' },
  { slug: 'vinilos', name: 'Vinilos' },
  { slug: 'stickers', name: 'Stickers' },
  { slug: 'marcas', name: 'Marcas' },
  { slug: 'autos-motos', name: 'Autos y Motos' },
  { slug: 'memes', name: 'Memes y Frases' }
];

const ph = (label, color) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stop-color='${color}'/>
          <stop offset='1' stop-color='#111'/>
        </linearGradient>
      </defs>
      <rect width='600' height='600' fill='url(#g)'/>
      <text x='50%' y='52%' font-family='Montserrat,Arial' font-size='44' font-weight='900' fill='white' text-anchor='middle' letter-spacing='-1'>${label}</text>
    </svg>`
  )}`;

export const products = [
  {
    id: 'pack-anime-x10',
    name: 'Pack Anime x10',
    category: 'anime',
    categoryLabel: 'Anime',
    price: 8000,
    image: ph('PACK ANIME', '#FF1B8D'),
    description:
      'Pack de 10 calcos de anime en vinilo premium resistente al agua y al sol. Ideal para termo, notebook, auto o bici.',
    stock: 50,
    tags: ['anime', 'stickers', 'vinilo'],
    featured: true,
    badge: 'Más vendido'
  },
  {
    id: 'pack-futbol-x10',
    name: 'Pack Fútbol Argentino x10',
    category: 'futbol',
    categoryLabel: 'Fútbol',
    price: 8000,
    image: ph('FÚTBOL AR', '#3A86FF'),
    description:
      'Pack de 10 calcos de fútbol argentino para termo, notebook, auto o bici. Vinilo premium.',
    stock: 50,
    tags: ['fútbol', 'argentina', 'stickers'],
    featured: true,
    badge: 'Top'
  },
  {
    id: 'pack-series-peliculas-x10',
    name: 'Pack Series y Películas x10',
    category: 'series',
    categoryLabel: 'Series y Películas',
    price: 8000,
    image: ph('SERIES', '#8B5CF6'),
    description:
      'Pack de 10 calcos inspiradas en series, películas y cultura pop. Diseños premium.',
    stock: 50,
    tags: ['series', 'películas', 'cultura pop'],
    featured: true
  },
  {
    id: 'calcos-personalizadas-x20',
    name: 'Calcos Personalizadas x20',
    category: 'personalizadas',
    categoryLabel: 'Personalizadas',
    price: 15000,
    image: ph('PERSONALIZADAS', '#FF5A1F'),
    description:
      'Pack de 20 calcos personalizadas con tu logo, frase, diseño o referencia. Coordinamos el diseño después de la compra.',
    stock: 30,
    tags: ['personalizadas', 'emprendimientos', 'logos'],
    featured: true,
    badge: 'Personalizable'
  },
  {
    id: 'fotos-polaroid-x10',
    name: 'Fotos Polaroid x10',
    category: 'polaroids',
    categoryLabel: 'Polaroids',
    price: 7500,
    image: ph('POLAROID', '#FFD84D'),
    description:
      'Pack de 10 fotos estilo Polaroid, ideales para regalar o decorar. Impresión premium.',
    stock: 40,
    tags: ['polaroid', 'fotos', 'regalos'],
    featured: false
  },
  {
    id: 'vinilo-decorativo-personalizado',
    name: 'Vinilo Decorativo Personalizado',
    category: 'vinilos',
    categoryLabel: 'Vinilos',
    price: 12000,
    image: ph('VINILO', '#FF4DCA'),
    description:
      'Vinilo decorativo personalizado para paredes, vidrieras, autos o espacios comerciales.',
    stock: 20,
    tags: ['vinilos', 'decoración', 'personalizado'],
    featured: false,
    badge: 'Nuevo'
  },
  {
    id: 'pack-termo-mate-x10',
    name: 'Pack Termo y Mate x10',
    category: 'stickers',
    categoryLabel: 'Stickers',
    price: 8000,
    image: ph('TERMO+MATE', '#35D07F'),
    description:
      'Pack ideal para personalizar termo, mate, botellas y objetos de uso diario.',
    stock: 60,
    tags: ['termo', 'mate', 'stickers'],
    featured: true
  },
  {
    id: 'pack-marcas-logos-x10',
    name: 'Pack Marcas y Logos x10',
    category: 'marcas',
    categoryLabel: 'Marcas',
    price: 8000,
    image: ph('MARCAS', '#3A86FF'),
    description: 'Pack de calcos de marcas, logos y diseños urbanos.',
    stock: 50,
    tags: ['marcas', 'logos', 'urbano'],
    featured: false
  },
  {
    id: 'pack-autos-motos-x10',
    name: 'Pack Autos y Motos x10',
    category: 'autos-motos',
    categoryLabel: 'Autos y Motos',
    price: 8000,
    image: ph('AUTOS+MOTOS', '#FF5A1F'),
    description: 'Pack de stickers para fanáticos de autos, motos y fierros.',
    stock: 45,
    tags: ['autos', 'motos', 'stickers'],
    featured: false
  },
  {
    id: 'pack-memes-frases-x10',
    name: 'Pack Memes y Frases x10',
    category: 'memes',
    categoryLabel: 'Memes y Frases',
    price: 8000,
    image: ph('MEMES', '#FFD84D'),
    description: 'Pack de calcos con frases, memes y diseños divertidos.',
    stock: 50,
    tags: ['memes', 'frases', 'humor'],
    featured: false
  },

  // ─── TEST PRODUCT ──────────────────────────────────────────────────────────
  // Producto creado únicamente para validar la integración con Mercado Pago
  // gastando lo mínimo (10 ARS). BORRAR después de terminar las pruebas.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'test-mp-10-ars',
    name: 'Calco de prueba',
    category: 'stickers',
    categoryLabel: 'Stickers',
    price: 10,
    image: ph('TEST $10', '#555555'),
    description:
      'Producto de prueba para validar la integración con Mercado Pago. No es un producto a la venta — se usa solo para confirmar el flujo de pago end-to-end con el monto mínimo.',
    stock: 999,
    tags: ['test', 'integración'],
    featured: false,
    badge: 'TEST'
  }
];

export const getProductById = (id) => products.find((p) => p.id === id);
export const getFeaturedProducts = () => products.filter((p) => p.featured);
export const getProductsByCategory = (slug) =>
  slug === 'todas' || !slug ? products : products.filter((p) => p.category === slug);
