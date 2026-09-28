/**
 * El hero del termo (spec 028): copy, assets y cómo se mueve cada calco.
 *
 * Vive acá y no en los componentes por el mismo motivo que `heroVariantes.js`:
 * los tests corren en `environment: node`, y lo que hay que cuidar de este hero
 * —que ninguna calco se mueva igual que otra, que la entrada no se estire, que
 * el H1 diga "calcos"— se verifica con datos, sin renderizar React.
 *
 * LA JERARQUÍA DEL MOVIMIENTO (el punto 13 del pedido, y el que más fácil se
 * pierde copiando y pegando una calco):
 *
 *   termo    → entra creciendo y queda QUIETO. Es el ancla: transmite estabilidad.
 *   calco 1  → flota lento (15 px, 4 s).
 *   calco 2  → inclinada 8° y flota apenas (8 px, 5 s).
 *   calco 3  → entra desde la derecha girando y queda quieta.
 *   calco 4  → la del parallax fuerte: sigue al cursor hasta 25 px.
 *
 * Las otras tres también siguen al cursor, pero 3-7 px y cada una distinto:
 * la diferencia de intensidad es lo que da la sensación de profundidad.
 * `heroTermo.test.js` verifica que no haya dos calcos con la misma "firma".
 *
 * Los loops los corre el CSS (`.hero-calco__img--flota`, con `translate`), no
 * Framer Motion: así los ejecuta el compositor, se pausan con el hero fuera de
 * pantalla y "reducir movimiento" los apaga solo. Ver `design.md` §1.3.
 */

export const COPY_HERO = {
  // Partido en dos porque el hero resalta la segunda mitad con `gradient-text`.
  // Mayúsculas por CSS (los h1 las llevan siempre): se escribe normal y con tildes.
  h1: ['Tu termo está', 'pidiendo calcos.'],
  bajada: 'Dale personalidad a lo que usás todos los días.',
  ctaPrincipal: 'Ver calcos',
  ctaSecundario: 'Hacer los míos'
};

/**
 * El termo va LISO a propósito: es el que "está pidiendo calcos", y las cuatro
 * de alrededor son las que le faltan. Foto provista por Mariano, recortada y sin
 * el fondo blanco. Desde la ampliación B, además, SIN MANIJA NI LOGO (editada:
 * la silueta derecha es el espejo de la izquierda y el cuerpo, una columna de
 * color pareja): un cilindro liso girando se ve igual en cualquier ángulo, así
 * que el giro se hace girando solo las calcos pegadas (ver HeroCalcos.jsx). Una
 * manija o un logo quietos delatarían el truco.
 *
 * Las medidas son las del archivo, para que el navegador reserve la proporción
 * antes de bajarlo; el CSS también las usa para el radio del giro.
 */
export const TERMO = {
  src: '/images/hero/termo.webp',
  ancho: 142,
  alto: 512,
  alt: 'Termo liso, listo para personalizar con calcos',
  // Dónde se puede pegar una calco, en fracciones de la caja del termo. Medido
  // sobre ESTE archivo: arriba del 30 % está la tapa de acero y el aro negro,
  // abajo del 89 % la base.
  // ⚠️ Si se cambia la foto, se vuelve a medir: con otro termo estos números
  // pegan calcos en la tapa.
  cuerpo: { x0: 0.04, x1: 0.96, y0: 0.3, y1: 0.89 }
};

/** Ancho de una calco pegada, como fracción del ancho del termo. */
export const ANCHO_PEGADA = 0.46;

/**
 * Dónde cae cada calco cuando se la pega con un clic o un toque, en fracciones
 * de la caja del termo, y con qué inclinación. Todas al FRENTE (fx 0,5): el
 * termo gira, así que cada una queda en otro ángulo según cuándo se pegó; lo que
 * las separa es la altura (lo verifica el test).
 */
export const DESTINOS_PEGADO = {
  1: { fx: 0.5, fy: 0.38, rot: -8 },
  3: { fx: 0.5, fy: 0.56, rot: 6 },
  2: { fx: 0.5, fy: 0.7, rot: 8 },
  4: { fx: 0.5, fy: 0.83, rot: -5 }
};

/**
 * El giro (ampliación B). `PERSPECTIVA_PX` es la `perspective` de
 * `.hero-termo__pegadas` en index.css: si se cambia una, se cambia la otra.
 * `GIRO_MAX_GRADOS`: una calco soltada casi en el borde se pega a 75° y no a
 * 90°, donde quedaría de canto y no se vería.
 */
export const PERSPECTIVA_PX = 700;
export const GIRO_MAX_GRADOS = 75;

/**
 * ¿En qué ángulo del cilindro cae un punto de la pantalla? `x` y la caja del
 * termo en píxeles; 0° es el frente, positivo hacia la derecha.
 *
 * Con perspectiva, un punto del cilindro a `a` grados se ve en
 *   x = radio · sen(a) · p / (p − radio · cos(a))
 * (el frente está más cerca y se ve más ancho). Esa cuenta no se invierte con
 * un `asin`: se busca el ángulo por bisección. Entre ±75° es creciente (lo es
 * mientras cos(a) > radio / p, o sea hasta ~85°), así que la búsqueda es segura.
 * La primera versión usaba un factor fijo de perspectiva y en los bordes pegaba
 * las calcos 10° más adentro de donde se las soltaba.
 */
export function anguloEnTermo(x, { left, width }) {
  const radio = width / 2;
  const p = PERSPECTIVA_PX;
  const proyeccion = (grados) => {
    const a = (grados * Math.PI) / 180;
    return (radio * Math.sin(a) * p) / (p - radio * Math.cos(a));
  };
  const objetivo = x - (left + radio);
  let bajo = -GIRO_MAX_GRADOS;
  let alto = GIRO_MAX_GRADOS;
  if (objetivo <= proyeccion(bajo)) return bajo;
  if (objetivo >= proyeccion(alto)) return alto;
  for (let i = 0; i < 30; i++) {
    const medio = (bajo + alto) / 2;
    if (proyeccion(medio) < objetivo) bajo = medio;
    else alto = medio;
  }
  return (bajo + alto) / 2;
}

/**
 * Lo que la perspectiva le hace a una calco pegada a `grados` del frente: se ve
 * `escala` veces más grande (está más cerca de quien mira) y, como la
 * perspectiva agranda desde el centro de la caja, también se corre en vertical
 * alejándose del centro. `alturaCss` es el `top` (fracción de la caja) que hay
 * que darle para que se VEA a la altura `fyPantalla`: sin esto, al pegarla
 * saltaba hasta 8 px hacia arriba o hacia abajo.
 */
export function perspectivaPegada(fyPantalla, grados, anchoCaja) {
  const radio = anchoCaja / 2;
  const escala = PERSPECTIVA_PX / (PERSPECTIVA_PX - radio * Math.cos((grados * Math.PI) / 180));
  return { escala, alturaCss: 0.5 + (fyPantalla - 0.5) / escala };
}

/** ¿El punto (en fracciones de la caja del termo) cae sobre el cuerpo? */
export function dentroDelCuerpo(fx, fy) {
  const { x0, x1, y0, y1 } = TERMO.cuerpo;
  return fx >= x0 && fx <= x1 && fy >= y0 && fy <= y1;
}

// Cuánto se mete para adentro una calco soltada en el borde del cuerpo. La
// máscara ya recorta lo que se sale de la silueta, pero soltada justo en el
// borde quedaría casi toda recortada: parecería que no se pegó.
const MARGEN_PEGADO = { x: 0.12, y: 0.04 };

/** Lleva hacia adentro del cuerpo un punto soltado cerca del borde. */
export function ajustarAlCuerpo(fx, fy) {
  const { x0, x1, y0, y1 } = TERMO.cuerpo;
  const entre = (v, min, max) => Math.min(Math.max(v, min), max);
  return {
    fx: entre(fx, x0 + MARGEN_PEGADO.x, x1 - MARGEN_PEGADO.x),
    fy: entre(fy, y0 + MARGEN_PEGADO.y, y1 - MARGEN_PEGADO.y)
  };
}

/** La curva del pedido: sale rápido y frena largo. Sin sobrepaso, sin rebote. */
export const CURVA_SALIDA = [0.22, 1, 0.36, 1];

/**
 * Cada calco del catálogo, copiada a `/images/hero/` (si mañana se renombra el
 * diseño en el catálogo, el hero no se queda sin calco).
 *
 * `capa`: 'detras' pasa por detrás del termo; 'delante', por delante.
 * `entrada`: estados de Framer Motion (`desde` → `hasta`) y sus tiempos.
 *   `rotacionMs` es opcional: la calco 2 termina de girar después de aparecer.
 * `loop`: flotación vertical en CSS, o `null` si la calco queda quieta.
 *   `duracionMs` es el ciclo completo (sube y vuelve), como el `y: [0, -15, 0]`
 *   de 4 s del pedido; el CSS lo corre en dos mitades con `alternate`.
 * `parallaxPx`: recorrido total con el cursor de punta a punta de la pantalla.
 */
export const CALCOS = [
  {
    slot: 1,
    src: '/images/hero/calco-1.webp', // mate
    ancho: 320,
    alto: 320,
    capa: 'delante',
    entrada: {
      desde: { opacity: 0, scale: 0.8 },
      hasta: { opacity: 1, scale: 1 },
      duracionMs: 500,
      retrasoMs: 300
    },
    loop: { amplitudPx: 15, duracionMs: 4000 },
    parallaxPx: 4
  },
  {
    slot: 2,
    src: '/images/hero/calco-2.webp', // Ruta 40
    ancho: 320,
    alto: 320,
    capa: 'detras',
    entrada: {
      desde: { opacity: 0, scale: 0.8, rotate: 0 },
      hasta: { opacity: 1, scale: 1, rotate: 8 },
      duracionMs: 600,
      rotacionMs: 800,
      retrasoMs: 500
    },
    loop: { amplitudPx: 8, duracionMs: 5000 },
    parallaxPx: 7
  },
  {
    slot: 3,
    src: '/images/hero/calco-3.webp', // carpincho
    ancho: 320,
    alto: 456,
    capa: 'delante',
    entrada: {
      // 250 px: en un celular arranca fuera de la pantalla; en desktop entra
      // desde el costado mientras aparece. El `overflow: hidden` del hero la
      // recorta mientras viaja, así que nunca genera scroll horizontal.
      desde: { opacity: 0, x: 250, rotate: 20 },
      hasta: { opacity: 1, x: 0, rotate: -6 },
      duracionMs: 1000,
      retrasoMs: 400
    },
    loop: null,
    parallaxPx: 3
  },
  {
    slot: 4,
    src: '/images/hero/calco-4.webp', // Pumas
    ancho: 320,
    alto: 320,
    capa: 'delante',
    entrada: {
      desde: { opacity: 0, scale: 0.8, rotate: -10 },
      hasta: { opacity: 1, scale: 1, rotate: -10 },
      duracionMs: 800,
      retrasoMs: 600
    },
    loop: null,
    parallaxPx: 25
  }
];

/** Cuándo termina de entrar la última calco, en ms desde que arranca la entrada. */
export function duracionEntradaMs(calcos = CALCOS) {
  return Math.max(
    ...calcos.map(({ entrada: e }) => e.retrasoMs + Math.max(e.duracionMs, e.rotacionMs ?? 0))
  );
}
