import { DEFAULT_SIZE } from './pricing.js';

/**
 * Landings por CASO DE USO, para el tráfico de anuncios.
 *
 * POR QUÉ ESTAS Y NO LAS DEL PLAN: el plan proponía también
 * /calcos-personalizadas, /calcos-para-negocios y /pack-100-calcos — pero esas
 * páginas YA EXISTEN (/personalizados, /negocio, /mayorista). Crear gemelas
 * habría generado contenido duplicado y dos páginas que mantener por cada
 * intención. Para esas, las URLs bonitas del anuncio son REDIRECTS 301 (ver
 * netlify.toml y public/_redirects): el anuncio usa la URL linda y el cliente
 * cae en la página real.
 *
 * Estas tres sí son contenido nuevo: "calcos para termo" no es una categoría de
 * diseño (cualquier diseño sirve), es un caso de uso, y no había ninguna página
 * que respondiera "¿cuál me conviene para esto?". El catálogo tiene 99
 * categorías temáticas y ninguna de uso.
 *
 * Cada landing continúa la promesa del anuncio (message match, §41) y responde
 * la objeción propia de ese uso: qué tamaño, si aguanta el lavado, si aguanta
 * la intemperie.
 *
 * ⚠️ Las categorías de `categorias` tienen que existir en /data/catalog.json.
 */
export const LANDINGS = [
  {
    slug: 'calcos-termo',
    emoji: '🧉',
    h1: 'Calcos para termo',
    promesa: 'Resisten el agua, el sol y el manoseo de todos los días. Elegís el diseño y te lo mandamos a casa.',
    // El tamaño es la duda #1 de cada uso, y la respuesta cambia según el objeto.
    tamanoRecomendado: DEFAULT_SIZE,
    tamanoPorQue: 'Es el que mejor entra en la panza de un termo estándar sin quedar chico ni deformarse en la curva.',
    categorias: ['argentina', 'futbol', 'buenas-vibras', 'cute', 'memes', 'naturaleza-flores'],
    /** Testimonio que habla de ESTE uso (índice en data/testimonials.js). */
    testimonio: 2,
    beneficios: [
      { icon: '💧', t: 'Aguanta el agua', d: 'Lavás el termo y el calco sigue igual. Vinilo premium, no papel.' },
      { icon: '☀️', t: 'Aguanta el sol', d: 'Mate en la plaza todo el día sin que se desvaiga.' },
      { icon: '🎨', t: 'Se despega sin marcar', d: 'Si te cansaste del diseño, sale sin dejar pegote.' }
    ],
    faq: [
      {
        q: '¿Se despega cuando lavo el termo?',
        a: 'No. Es vinilo premium con adhesivo resistente al agua: lo podés lavar a mano sin problema. Lo que no recomendamos es el lavavajillas, que combina agua muy caliente con detergente fuerte.'
      },
      {
        q: '¿Qué tamaño le va mejor a un termo?',
        a: 'El de 6 cm. Es el que mejor entra en la panza de un termo estándar sin quedar chico ni deformarse en la curva. Si tu termo es de 1 litro o más, el de 9 cm también queda bien.'
      },
      {
        q: '¿Puedo poner varios?',
        a: 'Sí, y es lo que más nos piden. Desde 10 calcos tenés 10% off pagando por transferencia bancaria, y podés mezclar diseños y tamaños como quieras.'
      }
    ]
  },
  {
    slug: 'calcos-notebook',
    emoji: '💻',
    h1: 'Calcos para notebook',
    promesa: 'Personalizá tu compu con los diseños que te representan. Corte preciso, colores vivos y se despegan sin dejar marca.',
    tamanoRecomendado: DEFAULT_SIZE,
    tamanoPorQue: 'Entran varios en la tapa sin taparse entre sí. Si querés uno solo bien protagonista, andá al de 9 cm.',
    categorias: ['gamer', 'anime', 'memes', 'musica', 'disenos-aesthetic', 'space'],
    testimonio: 0,
    beneficios: [
      { icon: '🎯', t: 'Corte preciso', d: 'Troquelado al contorno del diseño, sin borde blanco feo.' },
      { icon: '🧼', t: 'Sale sin marcar', d: 'Cambiás de idea o vendés la notebook y se despega limpio.' },
      { icon: '🧩', t: 'Combinalos', d: 'Varios de 6 cm arman una tapa completa sin superponerse.' }
    ],
    faq: [
      {
        q: '¿Deja pegamento al sacarlo?',
        a: 'No. Se despega limpio de superficies lisas como la tapa de una notebook. Si estuvo mucho tiempo, tirá despacio y desde una esquina.'
      },
      {
        q: '¿Cuántos entran en una tapa?',
        a: 'En una notebook de 14" entran cómodos entre 6 y 10 calcos de 6 cm, según cómo los distribuyas. Desde 10 calcos tenés 10% off pagando por transferencia.'
      },
      {
        q: '¿Se arruinan con el calor de la notebook?',
        a: 'No. La tapa no llega a las temperaturas que afectarían al vinilo, y es el mismo material que usamos para autos, que están al sol todo el día.'
      }
    ]
  },
  {
    slug: 'calcos-auto',
    emoji: '🚗',
    h1: 'Calcos para auto y moto',
    promesa: 'Vinilo pensado para la intemperie: sol, lluvia y lavados. El mismo que usamos para vidrieras.',
    tamanoRecomendado: '9cm',
    tamanoPorQue: 'A la distancia desde la que se mira un auto, los de 4 y 6 cm se pierden. El de 9 cm se lee.',
    categorias: ['autos-y-motos', 'argentina', 'futbol', 'marcas', 'disenos-falopa', 'weed-creepy'],
    testimonio: 1,
    beneficios: [
      { icon: '🌧️', t: 'Aguanta la intemperie', d: 'Sol directo y lluvia. Es el material que usamos para vidrieras.' },
      { icon: '🧽', t: 'Aguanta el lavado', d: 'Lavadero a mano sin drama.' },
      { icon: '📏', t: 'Tamaño que se lee', d: 'El de 9 cm se distingue desde la vereda.' }
    ],
    faq: [
      {
        q: '¿Aguanta el lavadero?',
        a: 'A mano sí, sin problema. Con hidrolavadora conviene no apuntarle directo y de cerca al borde del calco: a esa presión se puede levantar cualquier vinilo.'
      },
      {
        q: '¿Va en el vidrio o en la chapa?',
        a: 'En los dos. En el vidrio se ve más parejo y se despega más fácil; en la chapa aguanta igual, solo que conviene que la superficie esté bien limpia y seca antes de pegarlo.'
      },
      {
        q: '¿Qué tamaño conviene para un auto?',
        a: 'El de 9 cm. A la distancia desde la que se mira un auto, los de 4 y 6 cm se pierden. Para el casco de una moto, el de 6 cm queda bien.'
      }
    ]
  }
];

/** La landing de ese slug, o null. */
export const getLanding = (slug) => LANDINGS.find((l) => l.slug === slug) || null;

/** Slugs para el sitemap y para las rutas. */
export const LANDING_SLUGS = LANDINGS.map((l) => l.slug);
