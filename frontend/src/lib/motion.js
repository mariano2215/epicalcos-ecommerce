import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Devuelve `true` si el usuario pidió reducir el movimiento
 * (prefers-reduced-motion). Lo usamos para apagar animaciones costosas.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SISTEMA DE MOTION (spec 024)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Los tokens de motion, en milisegundos.
 *
 * ⚠️ ESTO ES UN ESPEJO. Los mismos números están declarados como custom
 * properties en `src/styles/index.css` (`--motion-*`), y **ese** es el lado que
 * usa el navegador para animar. Este objeto existe solo para el JS que necesita
 * SABER cuánto dura algo:
 *
 *   · `useMontajeAnimado` desmonta el drawer DESPUÉS de que su salida termina.
 *     Sin el número, o desmonta antes (y la salida no se ve) o lo deja montado.
 *   · `useFlash` devuelve el botón a su estado normal cuando la confirmación
 *     cumplió su tiempo.
 *
 * La alternativa era leerlos con `getComputedStyle` en cada interacción: eso es
 * un reflow por toque, en el camino de compra, en un celular.
 *
 * Como todo espejo de este repo, tiene su test de paridad: `motion.test.js` LEE
 * `index.css` y falla si alguien cambia un lado y no el otro. Es el mismo
 * criterio que protege los precios (CLAUDE.md regla 11), aplicado a algo mucho
 * menos grave — pero que se desincroniza igual de fácil.
 */
export const MOTION = {
  /** Presión de un botón. Tiene que sentirse instantánea. */
  fast: 140,
  /** Hover, color, sombra. */
  quick: 200,
  /** Entrada de un panel, un modal, el drawer. */
  normal: 320,
  /** Reveal al scrollear, entradas de sección. */
  slow: 520,
  /** El techo. Nada del sitio debería pasar de acá. */
  lento: 800,
  /** Separación entre hermanos de una grilla. */
  stagger: 60,
  /** Tope del escalonado: ver el `min()` de `.motion-stagger` en el CSS. */
  staggerMax: 480,
  /** Cuánto dura el reveal. */
  reveal: 420,
  /** El translateY de las entradas, en px. */
  distance: 20
};

/**
 * Cuánto dura la confirmación "✓" de un botón de agregar.
 *
 * NO es un token del CSS: no hay ninguna animación de 1.100 ms: es el tiempo que
 * el botón se queda mostrando el resultado. Se eligió ~1 s porque es lo que
 * tarda el ojo en volver al botón después de mirar el contador del carrito, y
 * porque es la mitad de lo que dura el toast (2.200 ms): el aviso chico se apaga
 * antes que el grande, no al revés.
 */
export const FLASH_MS = 1100;

/**
 * El delay de stagger para el elemento `i` de una lista, topeado.
 *
 * El tope no es decorativo: en `/categorias` hay 61 cards. Con 60 ms por
 * elemento y sin límite, la última entraría 3,6 segundos después de la primera —
 * se lee como que la página se colgó. A partir del octavo el ritmo ya se
 * percibió y lo único que suma es espera.
 *
 * Mismo cálculo que el `min()` de `.motion-stagger` en el CSS; acá se usa para
 * los componentes que ya pasan un `delay` numérico a `<Reveal>`.
 */
export function staggerDelay(index, paso = MOTION.stagger, tope = MOTION.staggerMax) {
  if (!Number.isFinite(index) || index <= 0) return 0;
  return Math.min(index * paso, tope);
}

/**
 * El `style` que declara el índice para `.motion-stagger`.
 *
 * Se pasa como `style={varStagger(i)}` y el CSS hace el resto. Devolver el
 * objeto desde acá evita que cada componente escriba la custom property con un
 * nombre distinto.
 */
export function varStagger(index) {
  return { '--i': index };
}

/**
 * `true` a partir del segundo render.
 *
 * Sirve para no repetir una animación de entrada cuando el componente se vuelve
 * a renderizar por un motivo que no tiene nada que ver (en el hero, por ejemplo,
 * cuando se resuelve una variante de experimento).
 */
export function useMountedFlag() {
  const montado = useRef(false);
  useEffect(() => {
    montado.current = true;
  }, []);
  return montado;
}

/**
 * Un booleano que se prende al llamar a `disparar()` y se apaga solo.
 *
 * Es la confirmación de "agregado ✓" del botón "+" de la grilla. Dos cosas que
 * parecen detalle y no lo son:
 *
 *   · Toques repetidos REINICIAN el timer en vez de apilarlo. Quien toca "+"
 *     cinco veces seguidas ve el "✓" una vez, no cinco parpadeos.
 *   · El timer se limpia al desmontar. Sin eso, navegar mientras el "✓" está
 *     prendido deja un setState apuntando a un componente que ya no existe.
 */
export function useFlash(ms = FLASH_MS) {
  const [activo, setActivo] = useState(false);
  const timer = useRef(null);

  const disparar = useCallback(() => {
    setActivo(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setActivo(false), ms);
  }, [ms]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [activo, disparar];
}

/**
 * `true` durante un instante cada vez que `valor` cambia. El pulso del contador
 * del carrito.
 *
 * ⚠️ NO pulsa en el primer render, y eso es el punto: el carrito se restaura de
 * `localStorage` al montar la app, así que el contador "cambia" de undefined a 3
 * en cada carga de página. Sin la guarda, el header le anunciaría a la persona
 * que acaba de agregar algo cada vez que abre el sitio — un aviso que no
 * corresponde a ninguna acción suya es peor que ningún aviso.
 */
export function usePulseOnChange(valor, ms = MOTION.normal) {
  const [pulsando, setPulsando] = useState(false);
  const previo = useRef(valor);
  const timer = useRef(null);

  useEffect(() => {
    if (previo.current === valor) return undefined;
    previo.current = valor;
    setPulsando(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPulsando(false), ms);
    return undefined;
  }, [valor, ms]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return pulsando;
}

/**
 * Montaje con salida animada, para el drawer y los modales.
 *
 * El problema que resuelve: un `if (!abierto) return null` no puede animar el
 * cierre — cuando React llega a esa línea el nodo ya no está. Este hook mantiene
 * el contenido montado durante la salida y recién después lo suelta.
 *
 * Devuelve `{ montado, saliendo }`:
 *   · `montado`  — si hay que renderizar algo
 *   · `saliendo` — si lo que se renderiza tiene que estar corriendo su salida
 *
 * ⚠️ Con `prefers-reduced-motion` el desmontaje es INMEDIATO. Si no, el drawer
 * se quedaría 320 ms en pantalla sin animación —un panel congelado— que es peor
 * que el cierre seco de antes.
 *
 * ⚠️ El timer se limpia siempre. Un drawer que se reabre antes de terminar de
 * cerrarse no puede quedar con un desmontaje pendiente apuntándole.
 */
export function useMontajeAnimado(abierto, ms = MOTION.normal) {
  const reducido = useReducedMotion();
  const [montado, setMontado] = useState(abierto);
  const [saliendo, setSaliendo] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);

    if (abierto) {
      setMontado(true);
      setSaliendo(false);
      return undefined;
    }

    // Ya estaba cerrado: nada que desmontar (y nada que animar).
    if (!montado) return undefined;

    if (reducido) {
      setMontado(false);
      setSaliendo(false);
      return undefined;
    }

    setSaliendo(true);
    timer.current = setTimeout(() => {
      setMontado(false);
      setSaliendo(false);
    }, ms);
    return undefined;
    // `montado` a propósito fuera de las deps: entra solo para leerse en el
    // guard de arriba. Incluirlo re-dispararía el efecto al desmontar y
    // cancelaría la salida a la mitad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, reducido, ms]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { montado, saliendo };
}
