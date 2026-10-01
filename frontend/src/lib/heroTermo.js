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
 *   calco 3  → entra desde la derecha girando.
 *   calco 4  → la del parallax fuerte: sigue al cursor hasta 25 px.
 *
 * Las demás también siguen al cursor, pero 2-12 px y cada una distinto: la
 * diferencia de intensidad es lo que da la sensación de profundidad.
 * `heroTermo.test.js` verifica que no haya dos calcos con la misma "firma".
 *
 * Desde la ampliación E (el hero "lleno de calcos") son hasta 16 y TODAS
 * flotan, también la 3 y la 4, que antes quedaban quietas: con una sola quieta
 * entre quince que se mueven, parecía trabada.
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
 * Dónde cae una calco cuando se la pega con un clic o un toque, en fracciones
 * de la caja del termo, y con qué inclinación. Todas al FRENTE (fx 0,5): el
 * termo gira, así que cada una queda en otro ángulo según cuándo se pegó; lo que
 * las separa es la altura (lo verifica el test).
 *
 * Se usan EN ORDEN, una pegada tras otra (ampliación E), y no uno por lugar:
 * con 16 lugares y cuatro alturas, dos lugares con el mismo destino pegados
 * seguidos caían uno encima del otro. En orden, dos seguidas nunca comparten
 * altura, venga de donde venga cada una.
 */
export const DESTINOS_PEGADO = [
  { fx: 0.5, fy: 0.38, rot: -8 },
  { fx: 0.5, fy: 0.7, rot: 8 },
  { fx: 0.5, fy: 0.56, rot: 6 },
  { fx: 0.5, fy: 0.83, rot: -5 }
];

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
 * Los LUGARES de calcos sueltas y cómo se mueve cada uno. Qué diseño muestra
 * cada lugar lo decide el juego (ampliación D): arrancan con
 * `DISENOS_INICIALES` y se recargan de `DISENOS_HERO` cada vez que se pega uno.
 *
 * `capa`: 'detras' pasa por detrás del termo; 'delante', por delante.
 * `desdeAncho`: el ancho de pantalla desde el que existe el lugar (ampliación
 *   E). Es el MISMO corte que el `@media` que lo ubica en index.css: debajo de
 *   ese ancho no hay dónde ponerlo sin tapar el texto o salirse de la pantalla.
 *   Quien no lo usa, no baja su imagen (RNF-E1).
 * `entrada`: estados de Framer Motion (`desde` → `hasta`) y sus tiempos.
 *   `rotacionMs` es opcional: la calco 2 termina de girar después de aparecer.
 * `loop`: flotación vertical en CSS.
 *   `duracionMs` es el ciclo completo (sube y vuelve), como el `y: [0, -15, 0]`
 *   de 4 s del pedido; el CSS lo corre en dos mitades con `alternate`.
 * `parallaxPx`: recorrido total con el cursor de punta a punta de la pantalla.
 */

/**
 * Las de la ampliación E entran todas igual —aparecen creciendo y girando hasta
 * su inclinación, 550 ms— y lo que las distingue es todo lo demás: inclinación,
 * retraso, flotación y parallax. Cuatro personalidades bastaban para cuatro
 * calcos; para dieciséis, lo que da variedad es que ninguna flote al mismo ritmo.
 */
const lugarExtra = (slot, desdeAncho, rot, retrasoMs, amplitudPx, cicloMs, parallaxPx) => ({
  slot,
  capa: 'delante',
  desdeAncho,
  entrada: {
    // Gira 10° hacia su inclinación, alternando el sentido: todas en el mismo
    // sentido se leía como una sola animación repetida.
    desde: { opacity: 0, scale: 0.6, rotate: rot + (slot % 2 ? -10 : 10) },
    hasta: { opacity: 1, scale: 1, rotate: rot },
    duracionMs: 550,
    retrasoMs
  },
  loop: { amplitudPx, duracionMs: cicloMs },
  parallaxPx
});

export const CALCOS = [
  {
    slot: 1,
    capa: 'delante',
    desdeAncho: 0,
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
    capa: 'detras',
    desdeAncho: 0,
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
    capa: 'delante',
    desdeAncho: 0,
    entrada: {
      // 250 px: en un celular arranca fuera de la pantalla; en desktop entra
      // desde el costado mientras aparece. El `overflow: hidden` del hero la
      // recorta mientras viaja, así que nunca genera scroll horizontal.
      desde: { opacity: 0, x: 250, rotate: 20 },
      hasta: { opacity: 1, x: 0, rotate: -6 },
      duracionMs: 1000,
      retrasoMs: 400
    },
    // Hasta la ampliación E quedaba quieta; ahora flota apenas (RF-E3).
    loop: { amplitudPx: 5, duracionMs: 5600 },
    parallaxPx: 3
  },
  {
    slot: 4,
    capa: 'delante',
    desdeAncho: 0,
    entrada: {
      desde: { opacity: 0, scale: 0.8, rotate: -10 },
      hasta: { opacity: 1, scale: 1, rotate: -10 },
      duracionMs: 800,
      retrasoMs: 600
    },
    loop: { amplitudPx: 6, duracionMs: 4800 },
    parallaxPx: 25
  },
  // ── Ampliación E: el hero lleno de calcos ──────────────────────────────────
  //         slot  desde  rot  retraso  flota  ciclo  parallax
  // Celular (con las cuatro de arriba, 8): alrededor del termo.
  lugarExtra(5,     0,   -12,   350,    12,   4400,   5),
  lugarExtra(6,     0,    10,   450,    10,   5200,   9),
  lugarExtra(7,     0,     8,   550,    14,   3600,   6),
  lugarExtra(8,     0,    -9,   650,     9,   4200,  11),
  // Tablet (10): más lejos del termo, arriba de la escena.
  lugarExtra(9,   768,    14,   700,    11,   3800,   8),
  lugarExtra(10,  768,    -7,   750,    13,   5000,   2),
  // Desde 1024 (12): a los costados del titular.
  lugarExtra(11, 1024,   -15,   800,    16,   5400,  10),
  lugarExtra(12, 1024,    12,   850,    10,   4600,  12),
  // Desde 1280 (14): los costados de la escena, lejos del termo.
  lugarExtra(13, 1280,     6,   880,    12,   3400, 3.5),
  lugarExtra(14, 1280,   -11,   910,    14,   5800, 5.5),
  // Desde 1440 (16): la columna de afuera, a la altura del titular.
  lugarExtra(15, 1440,     9,   930,     9,   6000, 2.5),
  lugarExtra(16, 1440,    -6,   950,    11,   3200, 4.5)
];

/** Los lugares que existen en una pantalla de `ancho` px (ampliación E). */
export const lugaresPara = (ancho) => CALCOS.filter((c) => ancho >= c.desdeAncho);

// ─── Muchas calcos de Argentina (ampliación D) ───────────────────────────────

/**
 * Con qué diseño arranca cada lugar (número de producto de Argentina). Los
 * cuatro primeros, los de la primera versión del hero: mate, Ruta 40, carpincho
 * y Pumas. Los de la ampliación E, elegidos mirando los 58 para que no se
 * repita el tema al lado: corazón, sol, LOVE, "Fútbol mate asado" (celular);
 * Ushuaia y Branca (tablet); Aconcagua y tango; escudo "Argentina" y termo con
 * mate; Patagonia y mapa. Fijos a propósito: cada carga se ve igual (D-E2).
 */
export const DISENOS_INICIALES = {
  1: 30, 2: 57, 3: 19, 4: 54,
  5: 7, 6: 5, 7: 47, 8: 35,
  9: 49, 10: 25,
  11: 1, 12: 60,
  13: 15, 14: 40,
  15: 50, 16: 43
};

// Sin tope de pegadas desde la ampliación F (1/10/2026). Hasta ahí había un
// MAX_PEGADAS = 12 y con la 13 la más vieja se despegaba sola: a quien estaba
// llenando el termo se le iban borrando calcos que había elegido. Si se repone
// un tope, mirar antes `flotando` en `siguienteDiseno`: sin tope, con 16
// lugares los 58 diseños pueden estar todos a la vista.

/** La imagen del hero de un diseño (recortada por scripts/build-hero-argentina.py). */
export const srcDiseno = (n) => `/images/hero/argentina/${n}.webp`;
/** El id con que el diseño viaja en analytics: el del producto. */
export const idDiseno = (n) => `argentina-${n}`;
/**
 * Medidas del archivo, para `width`/`height`. La lista (`DISENOS_HERO`, de
 * lib/disenosHero.js) la pasa quien llama: este módulo también lo importa el
 * hero, que va en el chunk principal, y la lista de 58 tiene que quedarse en
 * el chunk del juego.
 */
export const disenoPorNumero = (n, disenos) => disenos.find((d) => d.n === n);

/**
 * El próximo diseño para un lugar. Al azar, sin repetir hasta que salieron
 * todos ("la bolsa"), y nunca uno que esté a la vista (en otro lugar, esperando
 * en otro lugar o pegado en el termo): dos iguales a la vez parecería un error.
 * Pura, con el azar inyectado, para testearla.
 *
 * `flotando` (ampliación F): los que están en un lugar, sueltos o esperando.
 * Sin tope en el termo, pasadas ~26 pegadas los 58 están TODOS a la vista y no
 * queda ninguno libre: ahí se puede repetir uno pegado —en el termo, entre
 * muchas, se nota poco—, pero nunca uno de `flotando`, que se vería dos veces
 * suelto. Sin este escalón, `libres` quedaba vacío y el juego se rompía al
 * desarmar `undefined`. Sin `flotando`, vale lo de siempre.
 *
 * @param {{ visibles: Set<number>, usados: Set<number>, disenos: {n: number}[], azar?: () => number, flotando?: Set<number> }} args
 * @returns {{ n: number, usados: Set<number> }}
 */
export function siguienteDiseno({ visibles, usados, disenos, azar = Math.random, flotando = visibles }) {
  let bolsa = usados;
  let libres = disenos.filter((d) => !visibles.has(d.n) && !bolsa.has(d.n));
  if (!libres.length) {
    // Salieron todos: otra vuelta, menos los que están a la vista.
    bolsa = new Set();
    libres = disenos.filter((d) => !visibles.has(d.n));
  }
  // Todos a la vista: se repite uno pegado, nunca uno flotando.
  if (!libres.length) libres = disenos.filter((d) => !flotando.has(d.n));
  // Red de seguridad: con 58 diseños y 16 lugares no pasa, pero un lugar vacío
  // rompería el hero entero.
  if (!libres.length) libres = disenos;
  const { n } = libres[Math.floor(azar() * libres.length)];
  return { n, usados: new Set([...bolsa, n]) };
}

/** Cuándo termina de entrar la última calco, en ms desde que arranca la entrada. */
export function duracionEntradaMs(calcos = CALCOS) {
  return Math.max(
    ...calcos.map(({ entrada: e }) => e.retrasoMs + Math.max(e.duracionMs, e.rotacionMs ?? 0))
  );
}
