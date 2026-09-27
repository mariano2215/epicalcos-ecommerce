import { useEffect, useState } from 'react';
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useMotionValue,
  useSpring,
  useTransform
} from 'framer-motion';
import { CALCOS, CURVA_SALIDA } from '../../lib/heroTermo.js';
import { useReducedMotion } from '../../lib/motion.js';

/**
 * Las cuatro calcos del hero del termo (spec 028). Es el ÚNICO archivo del
 * sitio que importa `framer-motion`, y `Hero` lo pide con `lazy()`.
 *
 * ⚠️ POR QUÉ UN CHUNK APARTE. `Home` es eager y viaja en el chunk principal, que
 * se baja en TODAS las rutas — también en la ficha de producto a la que llega
 * la mayoría de los anuncios. Medido el 27/9/2026: `motion` sumaba 43 kB gzip a
 * ese chunk (+44 %). Acá adentro solo lo paga el Home, en paralelo con las
 * imágenes, y el texto, los botones y el termo (el LCP) no lo esperan.
 *
 * `LazyMotion strict` + `m.*` en vez de `motion.*`: `strict` hace que un
 * `motion.div` tire error en desarrollo. Es el guardarraíl para que nadie meta
 * el componente completo "de paso". `domAnimation` alcanza (animaciones y
 * hover); `domMax` sumaría drag y layout, que acá no se usan.
 *
 * CADA CALCO SON DOS ELEMENTOS, porque la mueven tres cosas que no se pueden
 * pisar:
 *   · el `div` lleva el parallax (x/y con resorte) y el hover (scale/rotate).
 *   · la `img` lleva la entrada (Framer Motion escribe su `transform` inline) y
 *     el loop de flotación, que es CSS sobre la propiedad `translate`: es otra
 *     propiedad, así que no choca con ese `transform`.
 * El hover va en el `div` y no en la `img` por el retraso de la entrada: al
 * soltar el hover, Framer Motion vuelve al estado base con la `transition` del
 * elemento, y en la `img` esa transición tiene 300-600 ms de `delay`: la calco
 * se quedaría agrandada medio segundo después de sacarle el cursor.
 *
 * @param {{ seccionRef: import('react').RefObject<HTMLElement>, entrada: boolean, inicioEntrada: number }} props
 *        `seccionRef` = la sección del hero: el parallax escucha el cursor ahí.
 *        `entrada` = false si el hero ya se mostró en esta pestaña (ver Hero.jsx).
 *        `inicioEntrada` = `performance.now()` del primer render del hero.
 */

// Los del pedido: el cursor mueve un valor y el resorte lo alcanza con inercia.
// Más rígido se vuelve "un elemento persiguiendo al cursor".
const RESORTE_CURSOR = { stiffness: 60, damping: 15 };
const RESORTE_HOVER = { type: 'spring', stiffness: 300, damping: 20 };
const PUNTERO_FINO = '(hover: hover) and (pointer: fine)';

const seg = (ms) => ms / 1000;

// Los retrasos de lib/heroTermo.js cuentan desde que arranca el hero, pero este
// chunk llega después (medido: 160-490 ms en local, más con red real). Sin
// compensar, toda la secuencia se corría eso y la última calco terminaba pasado
// el 1,5 s del RF-18. Se adelanta todo lo que ya pasó, con un tope: el primer
// retraso. Así el escalonado se mantiene siempre —si el chunk tarda un segundo,
// las calcos entran igual de a una, no las cuatro juntas—.
const PRIMER_RETRASO_MS = Math.min(...CALCOS.map((c) => c.entrada.retrasoMs));

export default function HeroCalcos({ seccionRef, entrada, inicioEntrada }) {
  const reducido = useReducedMotion();
  const [adelantoMs] = useState(() =>
    Math.max(0, Math.min(performance.now() - (inicioEntrada ?? performance.now()), PRIMER_RETRASO_MS))
  );

  // UN par de valores para las cuatro calcos: la posición del cursor normalizada
  // a [-0,5, 0,5]. Cada calco la multiplica por su intensidad. Dos resortes y no
  // ocho: la profundidad ya sale de las intensidades distintas, y cada resorte
  // es trabajo por cuadro en el hilo principal.
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const suaveX = useSpring(cursorX, RESORTE_CURSOR);
  const suaveY = useSpring(cursorY, RESORTE_CURSOR);

  useEffect(() => {
    const el = seccionRef.current;
    // El criterio es el PUNTERO, no el ancho: una tablet con mouse tiene
    // parallax; un celular nunca (con el dedo, "seguir al cursor" es seguir el
    // scroll, y se siente como un error).
    if (!el || reducido || !window.matchMedia?.(PUNTERO_FINO)?.matches) return undefined;
    const mover = (e) => {
      if (e.pointerType !== 'mouse') return;
      cursorX.set(e.clientX / window.innerWidth - 0.5);
      cursorY.set(e.clientY / window.innerHeight - 0.5);
    };
    // Al salir del hero, las calcos vuelven al reposo con el mismo resorte.
    const soltar = () => {
      cursorX.set(0);
      cursorY.set(0);
    };
    el.addEventListener('pointermove', mover, { passive: true });
    el.addEventListener('pointerleave', soltar);
    return () => {
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerleave', soltar);
      soltar();
    };
  }, [seccionRef, reducido, cursorX, cursorY]);

  return (
    <LazyMotion features={domAnimation} strict>
      {/* reducedMotion="user": con "reducir movimiento", Framer Motion saltea
          las animaciones de transform (la calco 3 ya no viaja desde la derecha)
          y conserva las de opacidad. Queda un fundido en el lugar final. */}
      <MotionConfig reducedMotion="user">
        <div className="hero-calcos" aria-hidden="true">
          {CALCOS.map((calco) => (
            <Calco
              key={calco.slot}
              calco={calco}
              suaveX={suaveX}
              suaveY={suaveY}
              entrada={entrada}
              adelantoMs={adelantoMs}
              reducido={reducido}
            />
          ))}
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}

function Calco({ calco, suaveX, suaveY, entrada, adelantoMs, reducido }) {
  const [falta, setFalta] = useState(false);
  const x = useTransform(suaveX, (v) => v * calco.parallaxPx);
  const y = useTransform(suaveY, (v) => v * calco.parallaxPx);

  const { desde, hasta, duracionMs, rotacionMs } = calco.entrada;
  const retrasoMs = calco.entrada.retrasoMs - adelantoMs;
  const transicion = {
    duration: seg(duracionMs),
    delay: seg(retrasoMs),
    ease: CURVA_SALIDA,
    ...(rotacionMs && { rotate: { duration: seg(rotacionMs), delay: seg(retrasoMs), ease: CURVA_SALIDA } })
  };

  // El loop arranca cuando termina la entrada: si no, la calco aparecería ya a
  // mitad de camino. Quien vuelve al Home (sin entrada) lo ve flotar de una.
  // La duración va partida en dos porque el CSS usa `alternate` (ida y vuelta).
  const estiloLoop = calco.loop && {
    '--flota': `${-calco.loop.amplitudPx}px`,
    '--flota-dur': `${calco.loop.duracionMs / 2}ms`,
    '--flota-retraso': entrada ? `${retrasoMs + duracionMs}ms` : '0ms'
  };

  return (
    <m.div
      className={`hero-calco hero-calco--${calco.slot} hero-calco--${calco.capa}`}
      style={{ x, y, visibility: falta ? 'hidden' : undefined }}
      whileHover={reducido ? undefined : { scale: 1.08, rotate: 2 }}
      transition={RESORTE_HOVER}
    >
      <m.img
        src={calco.src}
        alt=""
        width={calco.ancho}
        height={calco.alto}
        decoding="async"
        draggable={false}
        className={`hero-calco__img${calco.loop ? ' hero-calco__img--flota' : ''}`}
        style={estiloLoop || undefined}
        initial={entrada ? desde : false}
        animate={hasta}
        transition={transicion}
        // Sin la imagen no queda el ícono de imagen rota: la calco no se ve y
        // las otras siguen igual. La caja de la escena no cambia (RNF-7).
        onError={() => setFalta(true)}
      />
    </m.div>
  );
}
