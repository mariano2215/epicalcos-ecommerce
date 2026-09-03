/**
 * Swatches SVG del configurador. Nada de placeholder gris: cada opción se
 * representa con la forma que la identifica.
 *
 * ─── TODOS DIBUJAN SOBRE EL MISMO LIENZO ──────────────────────────────────────
 * `LIENZO` es el lado del viewBox Y el lado que ocupa el <svg> en pantalla, y
 * coincide con la caja que le da PasoSelector (w-11 h-11 = 44 px).
 *
 * POR QUÉ IMPORTA: antes el SVG medía 56 px dentro de esa caja de 44, que tiene
 * `overflow-hidden`. Los 6 px que sobraban de cada lado se recortaban, así que
 * el swatch de 9 cm —el más grande— aparecía CORTADO, y las tres cards del paso
 * 1 se veían desparejas sin que hubiera nada mal en la card. Cualquier swatch
 * nuevo tiene que dibujarse dentro de `LIENZO` o vuelve a pasar lo mismo.
 */

const LIENZO = 44;
const CENTRO = LIENZO / 2;
/** Lado máximo de una figura: deja 3 px de aire contra el borde de la caja. */
const MAX_FIGURA = LIENZO - 6;

const TRAZO = '#FF1B8D';
const RELLENO = 'rgba(255,27,141,0.14)';

const lienzo = { width: LIENZO, height: LIENZO, viewBox: `0 0 ${LIENZO} ${LIENZO}`, 'aria-hidden': true };

/** Centra una figura cuadrada de lado `lado` dentro del lienzo. */
const centrar = (lado) => (LIENZO - lado) / 2;

/**
 * Tamaño: cuadrado PROPORCIONAL a los cm reales, para poder compararlos de un
 * vistazo — es la misma idea que la guía de tamaños de la ficha de producto
 * (`components/SizeGuide.jsx`), y por eso la escala se ancla al tamaño más
 * grande de la lista y no a un máximo inventado: el de 9 cm ocupa todo el
 * cuadro y los otros dos se leen contra él.
 *
 * NO lleva el número adentro. Lo tenía, con la tipografía fija en 11 px: en el
 * cuadrado de 4 cm el dígito ocupaba casi todo el interior y en el de 9 cm
 * nadaba, y encima estaba dibujado 3 px más abajo del centro real de la figura.
 * El número ya está escrito al lado, en el título de la card ("4 cm").
 */
const CM_MAXIMO = 9;

function TamanoSwatch({ id }) {
  const cm = parseFloat(id) || 6;
  // Proporción REAL contra el tamaño más grande, igual que SizeGuide (4 : 6 : 9).
  // El piso del 35 % es sólo una red por si algún día entra un tamaño diminuto:
  // con la lista de hoy no se activa nunca (4/9 = 0,44). Estuvo en 55 % un rato
  // y era peor el remedio — aplastaba justo la diferencia entre 4 y 6 cm, que es
  // lo único que este dibujo tiene para decir.
  const lado = MAX_FIGURA * Math.max(0.35, Math.min(1, cm / CM_MAXIMO));
  const off = centrar(lado);
  return (
    <svg {...lienzo}>
      <rect
        x={off}
        y={off}
        width={lado}
        height={lado}
        rx={Math.max(3, lado * 0.16)}
        fill={RELLENO}
        stroke={TRAZO}
        strokeWidth="2"
      />
    </svg>
  );
}

/**
 * Corte: la forma del troquel.
 *
 * Las tres figuras ocupan el MISMO cuadro (`MAX_FIGURA`), aunque sean un
 * cuadrado, un círculo y una silueta libre: si cada una se dibujara con su
 * propio tamaño, la fila de cards se ve despareja aunque las cards midan igual.
 */
function CorteSwatch({ id }) {
  if (id === 'cuadrado') {
    const off = centrar(MAX_FIGURA);
    return (
      <svg {...lienzo}>
        <rect
          x={off}
          y={off}
          width={MAX_FIGURA}
          height={MAX_FIGURA}
          rx={4}
          fill={RELLENO}
          stroke={TRAZO}
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (id === 'circulo') {
    return (
      <svg {...lienzo}>
        <circle
          cx={CENTRO}
          cy={CENTRO}
          r={MAX_FIGURA / 2}
          fill={RELLENO}
          stroke={TRAZO}
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (id === 'kiss-cut') {
    const off = centrar(MAX_FIGURA);
    return (
      <svg {...lienzo}>
        <rect
          x={off}
          y={off}
          width={MAX_FIGURA}
          height={MAX_FIGURA}
          rx={4}
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <circle cx={CENTRO} cy={CENTRO} r={MAX_FIGURA / 3.2} fill={RELLENO} stroke={TRAZO} strokeWidth="2" />
      </svg>
    );
  }

  // Silueta: contorno libre con troquel punteado. El path está redibujado para
  // llenar el mismo cuadro de 38 px que el cuadrado y el círculo (antes iba de
  // 10 a 48 sobre un lienzo de 56, o sea que además se salía).
  return (
    <svg {...lienzo}>
      <path
        d="M22 3 C 32 3, 39 12, 37 20 C 42 24, 38 37, 29 36 C 26 41, 16 40, 15 33 C 6 31, 6 18, 15 17 C 15 8, 18 3, 22 3 Z"
        fill={RELLENO}
        stroke={TRAZO}
        strokeWidth="2"
        strokeDasharray="3 2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Swatch({ kind, id }) {
  if (kind === 'tamano') return <TamanoSwatch id={id} />;
  if (kind === 'corte') return <CorteSwatch id={id} />;
  return null;
}

/** Imagen (data-URI) de la línea personalizada para la miniatura del carrito (se serializa a localStorage). */
export function customImageDataUri() {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>` +
    `<rect width='200' height='200' rx='24' fill='#FF1B8D'/>` +
    `<text x='50%' y='54%' font-size='72' text-anchor='middle' dominant-baseline='middle'>✏️</text>` +
    `</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
