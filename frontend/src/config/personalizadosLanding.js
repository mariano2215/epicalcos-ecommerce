/**
 * Todo el texto de /personalizados — "Hacelo calco" (spec 023).
 *
 * UNA sola fuente para dos lectores: la página React y el HTML estático que se
 * genera en el build para los buscadores (`lib/personalizadosEstatico.js`). Si el
 * copy viviera en los componentes, el HTML que lee Google y la página que ve el
 * cliente terminarían diciendo cosas distintas — y eso es cloaking.
 *
 * ⚠️ ESTE MÓDULO CORRE EN NODE (lo importa `scripts/prerender.mjs`): nada de
 * `import.meta.env`, `window`, JSX ni imports de `lib/analytics.js` o
 * `services/`. Mismo criterio que `config/site.js` con el sitemap.
 *
 * ⚠️ NINGÚN número se escribe a mano: precios, plazos, topes y formatos salen de
 * la configuración. Hay test que lo verifica (`personalizadosLanding.test.js`).
 *
 * ⚠️ LO QUE NO SE DICE (Mariano, 14/9/2026 — requirements §12):
 *   - No se manda boceto antes de imprimir, y NO se menciona (ni para negarlo).
 *   - No hay más fotos reales que la del testimonio, y NO se menciona: una
 *     sección sin fotos no se monta, sin "próximamente" ni placeholders.
 *   - "¿Tu archivo no está perfecto?" no vuelve (ya se había sacado el
 *     15/8/2026 porque sembraba la duda justo al subir). Tampoco la frase "no
 *     hace falta que tu archivo esté perfecto": es el mismo mensaje.
 * El test tiene una guarda con esas palabras.
 *
 * Ortografía RAE (P-11): con pronombre pegado, sin tilde — "hacelo",
 * "convertila", "llevala", "hacela". Sí "subí", "hacé".
 */
import { shipping } from './site.js';
import { SIZES, NEGOCIO, DEFAULT_SIZE } from './pricing.js';
import { ARCHIVO, CANTIDAD, PACK_HOLOGRAFICO, formatosLegibles, recomendacionPx, getTamano } from './personalizados.js';
import { brandStats } from './brandStats.js';
import { USOS_POR_TAMANO } from '../lib/usosPorTamano.js';
import { formatPrice } from '../lib/formato.js';

/** El claim. Vive en un solo lugar: cambiarlo es esta línea. */
export const CLAIM = 'HACELO CALCO.';

/** El tamaño que se marca "Más elegido": el mismo que el catálogo usa por defecto. */
export const TAMANO_MAS_ELEGIDO = DEFAULT_SIZE;

const tamanoNegocio = getTamano(NEGOCIO.size)?.label || NEGOCIO.size;
const plazo = shipping.production; // '2 a 3 días hábiles'
const plazoCorto = plazo.replace(' hábiles', ''); // '2 a 3 días'

/** Oferta de Negocio escrita UNA vez (la usan el configurador, Precios y la FAQ). */
export const OFERTA_NEGOCIO = `${NEGOCIO.qty} calcos de tu diseño en ${tamanoNegocio} por ${formatPrice(NEGOCIO.price)}`;

// ─── SEO ──────────────────────────────────────────────────────────────────────

export const SEO = {
  /** `useSeo` le agrega " | EPICALCOS". */
  title: 'Stickers y Calcos Personalizados con tu Diseño',
  description: `Creá calcos personalizadas con tu foto, logo, mascota, ilustración o diseño. Vinilo premium, resistentes al agua y producción en ${plazo}.`,
  /** El único H1 de la página. El claim se ve más grande, pero no es un heading. */
  h1: 'Calcos personalizadas con tu propio diseño',
  /** JPG y no WebP: WhatsApp e Instagram no siempre muestran un OG en WebP. */
  imagen: '/meta/personalizados.jpg',
  /** Imagen real para el `Product` del JSON-LD (la del testimonio). */
  imagenProducto: '/testimonials/logo-1.webp'
};

// ─── Hero y configurador ──────────────────────────────────────────────────────

export const HERO = {
  claim: CLAIM,
  h1: SEO.h1,
  bajada: 'Tu mascota. Tu logo. Una foto. Tu dibujo. Eso que solamente vos entendés.',
  texto: 'Subí tu imagen y la convertimos en una calco premium, lista para pegar donde quieras.'
};

export const SUBIDA = {
  titulo: 'Subí tu diseño',
  arrastrar: 'Arrastrá tu imagen acá',
  o: 'o',
  boton: 'Elegir archivo',
  /** Tranquiliza sin plantear el problema (ver el aviso de arriba). Política publicada. */
  revision: 'Lo revisamos antes de producirlo.',
  sumarOtro: 'Sumar otro diseño',
  cargado: '✓ Diseño cargado'
};

export const CTA = {
  subir: 'Subir mi diseño',
  crear: 'Crear mi calco',
  esperando: 'Subiendo tu diseño…',
  revisar: 'Revisá tus diseños',
  agregar: 'Agregar al carrito',
  agregado: '✓ Tu calco está en el carrito',
  comoFunciona: 'Ver cómo funciona'
};

export const VISTAS = [
  { id: 'original', label: 'Original' },
  { id: 'calco', label: 'Vista calco' },
  { id: 'termo', label: 'En un termo' }
];

/** Rótulo de la vista calco: es un dibujo aproximado, no una prueba de producción. */
export const ROTULO_VISTA = 'Vista aproximada';

export const TAMANO = {
  titulo: 'Elegí el tamaño',
  masElegido: 'Más elegido'
};

/** Copy del selector de material (enmienda 22/9/2026, spec 023 §7.9). */
export const MATERIAL_COPY = {
  titulo: 'Elegí el material'
};

export const CANTIDAD_COPY = {
  titulo: '¿Cuántas querés?',
  atajos: [1, 5, 10, 25, 50, 100].filter((n) => n >= CANTIDAD.min && n <= CANTIDAD.max),
  // Vinilo Holográfico (enmienda 26/9/2026): pack de 100 en total, sin cantidad
  // que elegir. `n` sale de PACK_HOLOGRAFICO.qty (vía la cotización), no de acá.
  packHolografico: (n) => `Pack de ${n} calcos holográficas.`,
  packHolograficoReparto: (disenos) =>
    `Se reparten entre tus ${disenos} diseños. ¿Querés más de uno que de otro? Contanos en “${OPCIONES.titulo}”.`,
  packHolograficoEtiqueta: 'Pack holográfico',
  // Un diseño en 6 cm que se cobra como Promo Negocio: con más de 100 copias
  // son varios packs + las sueltas que sobren (fix 26/9/2026). Se dice acá
  // para que "Total · 237 calcos" no se lea como un 3x2 con un % raro.
  etiquetaNegocio: (packs, sueltas) =>
    `${packs > 1 ? `${packs} packs ` : ''}Promo Negocio${sueltas > 0 ? ` + ${sueltas} sueltas` : ''}`
};

export const OPCIONES = {
  titulo: 'Más opciones',
  corte: 'Corte',
  instrucciones: '¿Algo que tengamos que saber?',
  placeholder: 'Colores exactos, qué parte va sin fondo, referencias de otro calco tuyo.'
};

export const NEGOCIO_COPY = {
  titulo: '¿Son para tu negocio?',
  texto: `Con la Promo Negocio te llevás ${OFERTA_NEGOCIO}.`,
  link: 'Ver opciones para empresas →',
  to: '/negocio'
};

// ─── Secciones ────────────────────────────────────────────────────────────────

/**
 * Barra de confianza. CUATRO y no cinco: en mobile va en 2×2, y un quinto
 * elemento queda huérfano en su propia fila. "Vinilo premium" y "resistente al
 * agua" van juntos porque son la misma promesa (el material).
 */
export const CONFIANZA = [
  { valor: brandStats.calcosVendidas.value, label: brandStats.calcosVendidas.label },
  { valor: brandStats.clientes.value, label: brandStats.clientes.label },
  { valor: plazoCorto, label: 'de producción' },
  { valor: 'Vinilo premium', label: 'resistente al agua' }
];

export const TESTIMONIO = {
  titulo: 'Así queda puesta.'
};

export const EDITORIAL = {
  titulo: 'Si es importante para vos, podemos convertirlo en calco.',
  bajada: 'No tiene que existir en nuestro catálogo.',
  lista: ['Tu mascota', 'Una foto', 'Tu emprendimiento', 'Un dibujo', 'Una frase', 'Un recuerdo', 'Tu logo', 'Una idea'],
  cierre: CLAIM,
  cta: CTA.subir
};

export const BENEFICIOS = {
  titulo: 'Hechas para durar. Y para ser tuyas.',
  items: [
    { icon: '✂️', titulo: 'Corte prolijo', texto: 'Seguimos la forma de tu diseño, o lo cortamos en cuadrado o círculo.' },
    { icon: '✨', titulo: 'Vinilo premium', texto: 'Buena adherencia, colores definidos y terminación pareja.' },
    { icon: '💧', titulo: 'Resistentes al agua', texto: 'Para termo, mate, botella y objetos de uso diario.' },
    { icon: '☀️', titulo: 'Resistentes al sol', texto: 'Pensadas para acompañarte mucho tiempo.' }
  ]
};

export const PROCESO = {
  id: 'como-funciona',
  titulo: 'De tu archivo a tus manos.',
  pasos: [
    { icon: '📤', titulo: 'Subí', texto: 'Subís tu diseño desde el celular o la compu.' },
    { icon: '🔍', titulo: 'Revisamos', texto: 'Verificamos que tu archivo pueda producirse bien.' },
    { icon: '🖨️', titulo: 'Producimos', texto: `Con el pago confirmado, imprimimos y cortamos tus calcos en ${plazo}.` },
    {
      icon: '📦',
      titulo: 'Recibís',
      texto: `Te llegan listas para usar: ${shipping.deliveryRosario} en Rosario, ${shipping.deliveryInterior} al resto del país.`
    }
  ]
};

export const PRECIOS = {
  titulo: 'Precios claros, desde una calco.',
  // "Sin mínimo" dejó de ser verdad para el holográfico (enmienda 26/9/2026).
  bajada: `Sin mínimo de compra: el precio es por calco y depende del tamaño. El Vinilo Holográfico va en packs de ${PACK_HOLOGRAFICO.qty}.`,
  /** Solo se muestra si el 3x2 está vivo (lo decide la página, no este módulo). */
  promo: 'Con el 3x2, cada 3 calcos la más barata te sale gratis.',
  cantidadesEjemplo: [10, 25, 50, 100]
};

export const FAQ_TITULO = 'Lo que suelen preguntar';

const usoLinea = (id) => {
  const t = getTamano(id);
  const u = USOS_POR_TAMANO[id];
  if (!t || !u) return null;
  const extra = id === TAMANO_MAS_ELEGIDO ? ' — el más elegido' : '';
  return `${t.label}: ${u.para.join(', ')}${extra}.`;
};

const tamanoMayor = SIZES[SIZES.length - 1];

/**
 * FAQ propia. Las respuestas salen de reglas que ya están publicadas en el sitio.
 *
 * Esperando respuesta de Mariano (P-4) y por eso NO están: "¿Tengo que quitar el
 * fondo de la imagen?" y "¿Pueden hacer una calco de mi mascota?" — no se sabe
 * qué pasa con el fondo de una foto en corte silueta, y no se promete.
 */
export const FAQ = [
  {
    q: '¿Qué formatos aceptan?',
    a:
      `${formatosLegibles(ARCHIVO.formatosEntrada)}, hasta ${ARCHIVO.pesoMaximoMB} MB cada uno. ` +
      'Si tenés el vectorial (SVG, AI o PDF), mejor: el corte sale más preciso. Las fotos pesadas se optimizan solas al subirlas.'
  },
  {
    q: '¿Qué pasa si mi imagen tiene baja calidad?',
    a: 'Miramos cada diseño antes de producir. Si la resolución no da o hay algo raro con el corte, te escribimos por WhatsApp para resolverlo antes de imprimir nada.'
  },
  {
    q: '¿Puedo mandar una foto de WhatsApp?',
    a:
      `Sí. Una foto que te llegó por WhatsApp suele alcanzar para los tres tamaños: para ${tamanoMayor.label} ` +
      `recomendamos al menos ${recomendacionPx(parseFloat(tamanoMayor.id))} px de lado. Si la subís y queda chica, te avisamos en el momento.`
  },
  {
    q: '¿Pueden imprimir mi logo?',
    a: `Sí, es de lo que más hacemos: marcas, locales y emprendimientos. Si necesitás muchas, la Promo Negocio te da ${OFERTA_NEGOCIO}.`
  },
  {
    q: '¿Puedo pedir varios diseños diferentes?',
    a: `Sí, hasta ${ARCHIVO.maxArchivos} en un mismo pedido. Subilos juntos y cada uno entra al carrito como su propia calco, con las copias que elijas.`
  },
  {
    q: '¿Cómo elijo el tamaño?',
    a: SIZES.map((s) => usoLinea(s.id)).filter(Boolean).join(' ')
  },
  {
    q: '¿Son resistentes al agua?',
    a: 'Sí, trabajamos con vinilo premium resistente al agua. Podés pegarlas en termo, mate, botellas y objetos de uso diario.'
  },
  {
    q: '¿Resisten el sol?',
    a: 'Sí, están pensadas para uso cotidiano y exposición normal al sol. En autos y motos también van muy bien.'
  },
  {
    q: '¿Cuánto tarda la producción?',
    a:
      `La producción lleva ${plazo} desde que se confirma el pago. En total lo recibís en ${shipping.deliveryRosario} en Rosario ` +
      `y en ${shipping.deliveryInterior} en el resto del país. Para cantidades grandes, coordinamos los tiempos por WhatsApp.`
  },
  {
    q: '¿Puedo pedir muchas unidades?',
    a: `Sí, hasta ${CANTIDAD.max.toLocaleString('es-AR')} copias de cada diseño. Si son para tu negocio, la Promo Negocio te da ${OFERTA_NEGOCIO}.`
  },
  {
    q: '¿Qué pasa después de comprar?',
    a: 'Con Mercado Pago el pago se confirma solo; con transferencia, nos mandás el comprobante por WhatsApp. Después revisamos tus archivos, los producimos y te escribimos para coordinar la entrega.'
  },
  {
    q: '¿Puedo devolverlo?',
    a: 'Como se hace con tu archivo, se cambia solo si llega con una falla de fábrica. Todo el detalle está en Cambios y devoluciones, al pie de la página.'
  }
];

export const CTA_FINAL = {
  titulo: 'Eso que tenés guardado en el celular puede convertirse en calco.',
  bajada: 'Subí tu imagen y hacela parte de tus cosas.',
  cta: 'Hacer mi calco',
  nota: `Producción en ${plazo}.`
};

// ─── Secciones con fotos (se montan solo con fotos reales: data/personalizadosFotos.js) ──

export const DE_IMAGEN_A_CALCO = {
  titulo: 'De imagen a calco.',
  bajada: 'Vos subís la imagen. Nosotros nos ocupamos del resto.',
  pasos: ['Original', 'Calco', 'Aplicada']
};

export const QUE_CONVERTIR = {
  titulo: 'Si existe como imagen, puede convertirse en calco.',
  items: [
    { id: 'mascota', emoji: '🐶', titulo: 'Tu mascota', texto: 'Llevala con vos a todos lados.' },
    { id: 'foto', emoji: '📸', titulo: 'Una foto', texto: 'Convertí un recuerdo en algo que podés pegar donde quieras.' },
    { id: 'dibujo', emoji: '🎨', titulo: 'Tu dibujo', texto: 'Ilustraciones, diseños, personajes o arte propio.' },
    { id: 'logo', emoji: '🏪', titulo: 'Tu logo', texto: 'Para packaging, productos, eventos o tu negocio.' }
  ]
};

export const GALERIA = {
  titulo: 'Así quedaron los de ellos.',
  bajada: 'Fotos de clientes y de nuestros pedidos. Ni un render.',
  /** Una "galería" de una o dos fotos no es una galería. */
  minimo: 4
};

export const CALIDAD = {
  titulo: 'No imprimimos simplemente una imagen. Hacemos una calco.',
  bullets: ['Vinilo premium', 'Impresión definida', 'Corte prolijo', 'Buena adherencia', 'Resistentes al agua', 'Resistentes al sol']
};
