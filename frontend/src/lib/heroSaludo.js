/**
 * El saludo del hero del Home (spec 024): una línea chica, arriba del titular,
 * que pasa unas frases de bienvenida una sola vez y se queda quieta en la última.
 *
 * ⚠️ NO ES EL TITULAR ROTANTE QUE SE SACÓ EL 4/9/2026 (spec 014). Aquel era el
 * elemento más grande del hero, rotaba 5 frases sin parar y competía con todo.
 * Éste es más chico y más apagado que el H1, da UNA vuelta y se aparta. El H1 no
 * se toca: es la variable de `hero_titular` y tiene que decir "calcos" en cada
 * variante (spec 015, `heroVariantes.test.js`).
 *
 * ⚠️ EL TOPE DE 5 SEGUNDOS (WCAG 2.2.2). Un contenido que cambia solo, dura más
 * de 5 s y convive con otro contenido necesita un botón de pausa. Terminando en
 * ≤ 5 s no hace falta, y el test lo exige: agregar una frase obliga a acortar
 * `DURACION_FRASE_MS`, o el test se pone rojo.
 *
 * ⚠️ 24 CARACTERES POR FRASE, como máximo. Es lo que entra en una línea a 375 px
 * con la tipografía y el espaciado del saludo. Una frase que parte en dos
 * líneas agranda la caja del saludo y empuja al titular hacia abajo.
 *
 * Las frases se escriben normal y con tildes: las mayúsculas las pone el CSS,
 * como en el resto de los títulos del sitio. La ÚLTIMA es la que queda quieta, y
 * la única que ve quien vuelve al Home navegando o tiene "reducir movimiento".
 *
 * Vive acá y no adentro de `Hero.jsx` por lo mismo que `heroVariantes.js`: los
 * tests corren en node y no tienen por qué arrastrar React para leer 4 strings.
 */
export const FRASES_SALUDO = [
  'Bienvenido',
  'Qué bueno verte por acá',
  'Tus cosas, a tu manera',
  'Estás en casa'
];

/** Cuánto está en pantalla cada frase de paso (entra, queda, sale). */
export const DURACION_FRASE_MS = 1500;

/** Cuánto tarda la última en entrar. Después ya no se mueve. */
export const ENTRADA_FINAL_MS = 500;

/** Máximo de caracteres por frase: una línea a 375 px. */
export const MAX_CARACTERES_FRASE = 24;

/** Desde que se pinta el hero hasta que el saludo queda quieto. */
export function duracionSaludoMs(frases = FRASES_SALUDO) {
  return (frases.length - 1) * DURACION_FRASE_MS + ENTRADA_FINAL_MS;
}
