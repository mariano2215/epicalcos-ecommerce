import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useMotionValue,
  useSpring,
  useTransform
} from 'framer-motion';
import {
  CALCOS,
  lugaresPara,
  CURVA_SALIDA,
  TERMO,
  ANCHO_PEGADA,
  DESTINOS_PEGADO,
  dentroDelCuerpo,
  ajustarAlCuerpo,
  anguloEnTermo,
  perspectivaPegada,
  DISENOS_INICIALES,
  MAX_PEGADAS,
  srcDiseno,
  idDiseno,
  disenoPorNumero,
  siguienteDiseno
} from '../../lib/heroTermo.js';
import { useReducedMotion } from '../../lib/motion.js';
import { trackHeroStickerStick } from '../../lib/analytics.js';
import { POPUP_JUEGO } from '../../config/popup.js';
import { porcentajeOferta } from '../../lib/popupReglas.js';
import { usePopupVersion } from '../../lib/popupEstado.js';
import { registrarPegadas, hayPremio, yaPremiado } from '../../lib/juegoTermo.js';
import { DISENOS_HERO } from '../../lib/disenosHero.js';

/**
 * Las calcos del hero del termo (spec 028). Es el ÚNICO archivo del sitio que
 * importa `framer-motion`, y `Hero` lo pide con `lazy()`.
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
 * hover); `domMax` sumaría drag y layout.
 *
 * ⚠️ EL ARRASTRE ES PROPIO, NO EL `drag` DE FRAMER MOTION (ampliación A). `drag`
 * necesita `domMax`: +14 kB gzip a este chunk. Acá el arrastre es solo con
 * mouse, sin inercia ni límites, y alcanza con eventos de puntero y los
 * `MotionValue` que ya se cargan: `.jump()` sigue al cursor sin resorte y
 * `.set()` vuelve con resorte (ver `usePuntero` y `Calco`).
 *
 * CADA CALCO SUELTA SON TRES ELEMENTOS, porque la mueven cosas que no se
 * pueden pisar:
 *   · el `div` de afuera: parallax + arrastre (x/y) y el hover (scale/rotate).
 *   · el `div` del medio: la escala al despegarla del termo (crece de su
 *     tamaño pegada al de suelta).
 *   · la `img`: la entrada (Framer Motion escribe su `transform` inline) y el
 *     loop de flotación, que es CSS sobre la propiedad `translate`: es otra
 *     propiedad, así que no choca con ese `transform`.
 * El hover va afuera y no en la `img` por el retraso de la entrada: al soltar
 * el hover, Framer Motion vuelve al estado base con la `transition` del
 * elemento, y en la `img` esa transición tiene 300-600 ms de `delay`: la calco
 * se quedaría agrandada medio segundo después de sacarle el cursor.
 *
 * PEGADAS (ampliación A): una calco pegada es OTRO elemento, en
 * `.hero-termo__pegadas`, una capa del tamaño exacto del termo con la foto del
 * termo como máscara: lo que se pasa de la silueta no se ve, como una calco
 * doblada sobre un cilindro. La suelta no se desmonta: queda oculta en su
 * lugar, y despegar es mostrarla de nuevo y moverla. Nada se guarda: recargar
 * o volver al Home las despega a todas (Q5).
 *
 * EL GIRO (ampliación B): la foto del termo NO gira. Es un cilindro liso (sin
 * manija ni logo), y un cilindro liso se ve igual en cualquier ángulo: lo que
 * gira es `.hero-termo__giro`, una capa 3D con las pegadas puestas alrededor del
 * eje (`rotateY(φ) translateZ(radio)`). La anima el CSS; acá solo se lee en qué
 * ángulo va (θ) cuando hace falta pegar una: queda en φ = α − θ, donde α es
 * dónde se la ve en la pantalla.
 *
 * MUCHAS CALCOS (ampliación D): los cuatro lugares se RECARGAN. Al pegar una,
 * su lugar trae otro diseño de Argentina (sin repetir hasta agotar los 58, y
 * nunca uno que ya se vea), con el próximo ya precargado. En el termo entran
 * 12: con la 13, la más vieja se despega sola. Un clic en una pegada la
 * despega.
 *
 * EL JUEGO (ampliación C): "Pegá 4 calcos y ganate 10% OFF". El progreso va a
 * lib/juegoTermo.js, que le avisa al popup de bienvenida cuando alguien gana.
 * Mientras alguien juega, la sección lleva `data-popup-bloqueo`: el popup ya
 * sabía no abrirse encima de algo así (lo usa el menú del celular).
 *
 * LLENO DE CALCOS (ampliación E): de 8 lugares en el celular a 16 desde 1440
 * px. Cuáles existen se decide UNA vez, con el ancho al montar
 * (`lugaresPara`): así un celular no baja las imágenes de los lugares de
 * desktop. Si la ventana se achica después, el CSS esconde los que ya no
 * entran; si se agranda, quedan los que había (menos calcos, nada roto).
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
// Vuelo al termo y vuelta a su lugar: amortiguado casi al límite, llega sin
// pasarse y sin rebotar. `restDelta`/`restSpeed` en PÍXELES: con los de
// fábrica (0,001) el resorte tardaba más de un segundo en darse por quieto
// después de haber llegado a la vista, y la calco se pegaba tarde (medido: la
// última seguía entrando 1,3 s después del clic).
const RESORTE_VUELO = { stiffness: 170, damping: 22, restDelta: 0.5, restSpeed: 10 };
// La escala va de 0,4 a 1: ahí medio "píxel" sería medio tamaño.
const RESORTE_ESCALA = { stiffness: 170, damping: 22 };
const PUNTERO_FINO = '(hover: hover) and (pointer: fine)';
// Con mouse, menos de 4 px es un clic; más, un arrastre. Con el dedo el margen
// es más ancho: un toque real siempre se mueve un poco.
const UMBRAL_ARRASTRE_PX = 4;
const UMBRAL_TOQUE_PX = 8;

const seg = (ms) => ms / 1000;

// Los retrasos de lib/heroTermo.js cuentan desde que arranca el hero, pero este
// chunk llega después (medido: 160-490 ms en local, más con red real). Sin
// compensar, toda la secuencia se corría eso y la última calco terminaba pasado
// el 1,5 s del RF-18. Se adelanta todo lo que ya pasó, con un tope: el primer
// retraso. Así el escalonado se mantiene siempre —si el chunk tarda un segundo,
// las calcos entran igual de a una, no las cuatro juntas—.
const PRIMER_RETRASO_MS = Math.min(...CALCOS.map((c) => c.entrada.retrasoMs));

/** Centro y ancho en pantalla de un elemento, con sus transforms aplicados. */
function centroDe(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, ancho: r.width };
}

/**
 * Llama a `listo` cuando terminan de animarse los dos valores. Terminan en
 * momentos distintos, así que se espera al último; y si ninguno se estaba
 * animando (ya estaba ahí, o movimiento reducido), se llama de una. El
 * `setTimeout` es la red: si una animación se corta sin avisar, la calco se
 * pega igual.
 */
function alLlegar(mx, my, listo) {
  let pendientes = [mx, my].filter((v) => v.isAnimating());
  if (!pendientes.length) return listo();
  let hecho = false;
  const quitar = [];
  const fin = () => {
    if (hecho) return;
    hecho = true;
    quitar.forEach((q) => q());
    clearTimeout(red);
    listo();
  };
  for (const v of pendientes) {
    quitar.push(
      v.on('animationComplete', () => {
        pendientes = pendientes.filter((p) => p !== v);
        if (!pendientes.length) fin();
      })
    );
  }
  const red = setTimeout(fin, 1500);
  return undefined;
}

/**
 * Clic, toque y arrastre sobre una calco, sin librería.
 *
 * MOUSE: al apretar, escucha en `window` (no en la calco): si el cursor sale
 * rápido de la calco, el arrastre no se pierde, y la calco pegada puede
 * pasarle el arrastre a la suelta aunque se desmonte en el medio. Además, como
 * el botón se apretó sobre la calco y se suelta sobre otra cosa, el `click`
 * cae en el ancestro común y no en lo de abajo: soltar una calco encima de
 * "VER CALCOS" no navega (RF-A9). `preventDefault` evita que el navegador
 * seleccione texto de la página mientras se arrastra.
 *
 * DEDO: solo toque (Q4). `touch-action` queda como está, así que si el dedo se
 * mueve el navegador scrollea y manda `pointercancel`: no cuenta como toque y
 * la página baja normal (RF-A10).
 */
function usePuntero({ alIniciar, alMover, alSoltar, alClic, alTocar }) {
  const toque = useRef(null);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    alTocar?.();
    if (e.pointerType !== 'mouse') {
      toque.current = { x: e.clientX, y: e.clientY };
      return;
    }
    e.preventDefault();
    const inicio = { clientX: e.clientX, clientY: e.clientY };
    let arrastrando = false;
    const mover = (ev) => {
      if (!arrastrando) {
        if (Math.hypot(ev.clientX - inicio.clientX, ev.clientY - inicio.clientY) < UMBRAL_ARRASTRE_PX) return;
        arrastrando = true;
        alIniciar(inicio, ev);
      }
      alMover(ev);
    };
    const terminar = (ev) => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', terminar);
      window.removeEventListener('pointercancel', terminar);
      if (arrastrando) alSoltar(ev);
      else if (ev.type === 'pointerup') alClic('clic');
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', terminar);
    window.addEventListener('pointercancel', terminar);
  };

  const onPointerUp = (e) => {
    const t = toque.current;
    toque.current = null;
    if (e.pointerType === 'mouse' || !t) return;
    if (Math.hypot(e.clientX - t.x, e.clientY - t.y) < UMBRAL_TOQUE_PX) alClic('toque');
  };
  const onPointerCancel = () => {
    toque.current = null;
  };

  return { onPointerDown, onPointerUp, onPointerCancel };
}

export default function HeroCalcos({ seccionRef, entrada, inicioEntrada }) {
  const reducido = useReducedMotion();
  const [conMouse] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(PUNTERO_FINO)?.matches
  );
  const [adelantoMs] = useState(() =>
    Math.max(0, Math.min(performance.now() - (inicioEntrada ?? performance.now()), PRIMER_RETRASO_MS))
  );

  // Las pegadas, de la más vieja a la más nueva: { id, diseno, fy, phi, rot,
  // rotDesde, r, saliendo }. Solo en memoria (Q5).
  const [pegadas, setPegadas] = useState([]);
  const ultimoId = useRef(0);
  // La capa de pegadas mide exactamente lo que el termo: es la referencia para
  // saber dónde cayó una calco y a dónde tiene que volar.
  const capaRef = useRef(null);

  // Los lugares que entran en esta pantalla (ampliación E).
  const [activas] = useState(() => lugaresPara(typeof window === 'undefined' ? 0 : window.innerWidth));

  // Qué diseño muestra cada lugar y cuál sigue (ya precargado). La "bolsa" de
  // usados vive en un ref: elegir el próximo no tiene que re-renderizar.
  const usados = useRef(null);
  const [lugares, setLugares] = useState(() => {
    const iniciales = activas.map((c) => DISENOS_INICIALES[c.slot]);
    usados.current = new Set(iniciales);
    const visibles = new Set(iniciales);
    const inicial = {};
    for (const c of activas) {
      const { n, usados: u } = siguienteDiseno({ visibles, usados: usados.current, disenos: DISENOS_HERO });
      usados.current = u;
      visibles.add(n);
      inicial[c.slot] = { actual: DISENOS_INICIALES[c.slot], siguiente: n };
    }
    return inicial;
  });
  // Precarga: la próxima de cada lugar ya está bajada cuando le toque entrar
  // (una por lugar, nunca las 58: RNF-D1). Una sola vez por diseño: el efecto
  // corre con cada recarga y, sin el registro, volvía a pedir todas.
  // Arranca recién con el primer toque a una calco (RNF-E2): con 16 lugares,
  // precargar de entrada eran 16 imágenes más para quien no juega. Del toque a
  // que el lugar se recarga pasa el vuelo al termo (~0,6 s): alcanza.
  const [jugo, setJugo] = useState(false);
  const precargadas = useRef(new Set());
  useEffect(() => {
    if (!jugo) return;
    for (const { siguiente } of Object.values(lugares)) {
      if (precargadas.current.has(siguiente)) continue;
      precargadas.current.add(siguiente);
      const img = new Image();
      img.decoding = 'async';
      img.src = srcDiseno(siguiente);
    }
  }, [lugares, jugo]);

  // Pegadas con clic o toque: cada una a la próxima altura (ampliación E).
  const destinos = useRef(0);
  const siguienteDestino = () => DESTINOS_PEGADO[destinos.current++ % DESTINOS_PEGADO.length];

  const giroRef = useRef(null);

  // En qué ángulo va el giro, leído de la animación CSS (sin JS por cuadro).
  // Sin animación (movimiento reducido) o sin soporte, el termo está en 0°.
  const anguloGiro = () => {
    const anim = giroRef.current?.getAnimations?.()[0];
    const t = Number(anim?.currentTime);
    const dur = Number(anim?.effect?.getTiming?.().duration);
    if (!Number.isFinite(t) || !(dur > 0)) return 0;
    return ((t % dur) / dur) * 360;
  };

  // `pegar` se llama al terminar un vuelo, ~0,6 s después del clic: con el
  // estado de ese render podría no ver una calco pegada en el medio (y repetir
  // un diseño a la vista o contar mal el tope). Lee siempre lo último.
  const pegadasRef = useRef(pegadas);
  pegadasRef.current = pegadas;
  const lugaresRef = useRef(lugares);
  lugaresRef.current = lugares;

  const pegar = (slot, datos, metodo) => {
    const pegadas = pegadasRef.current;
    const lugares = lugaresRef.current;
    const diseno = lugares[slot].actual;
    ultimoId.current += 1;
    const nueva = { ...datos, id: ultimoId.current, diseno, saliendo: false };
    const activas = pegadas.filter((p) => !p.saliendo);
    // Con la 13, la más vieja se despega sola (RF-D4).
    const sobran = Math.max(0, activas.length + 1 - MAX_PEGADAS);
    const vanASalir = new Set(activas.slice(0, sobran).map((p) => p.id));
    setPegadas((ps) => [...ps.map((p) => (vanASalir.has(p.id) ? { ...p, saliendo: true } : p)), nueva]);
    trackHeroStickerStick({ slot, metodo, pegadas: activas.length + 1 - sobran, diseno: idDiseno(diseno) });

    // El lugar se recarga: entra la que estaba esperando y se elige la próxima,
    // que no puede ser ninguna de las que se ven.
    const visibles = new Set([
      ...Object.values(lugares).flatMap((l) => [l.actual, l.siguiente]),
      ...activas.map((p) => p.diseno),
      diseno
    ]);
    const { n, usados: u } = siguienteDiseno({ visibles, usados: usados.current, disenos: DISENOS_HERO });
    usados.current = u;
    setLugares((ls) => ({ ...ls, [slot]: { actual: ls[slot].siguiente, siguiente: n } }));
  };
  // Clic en una pegada: se va con una animación y recién ahí se borra.
  const despegar = (id) => setPegadas((ps) => ps.map((p) => (p.id === id ? { ...p, saliendo: true } : p)));
  const borrar = (id) => setPegadas((ps) => ps.filter((p) => p.id !== id));

  // ── El juego (ampliación C) ────────────────────────────────────────────────
  usePopupVersion(); // si deja el mail en el popup, la pista deja de prometer
  const premio = hayPremio();
  const pct = porcentajeOferta();
  const cantidad = pegadas.filter((p) => !p.saliendo).length;
  const [gano, setGano] = useState(() => yaPremiado());
  useEffect(() => {
    if (registrarPegadas(cantidad)) setGano(true);
  }, [cantidad]);

  // "Está jugando": con cada toque, la sección lleva `data-popup-bloqueo` por
  // `jugandoMs`. El popup no se abre solo mientras exista (usePopupDisparo).
  const bloqueo = useRef(null);
  const tocar = () => {
    setJugo(true);
    const el = seccionRef.current;
    if (!el) return;
    el.dataset.popupBloqueo = '';
    clearTimeout(bloqueo.current);
    bloqueo.current = setTimeout(() => {
      delete el.dataset.popupBloqueo;
    }, POPUP_JUEGO.jugandoMs);
  };
  // Mientras se arrastra, el termo deja de girar: se puede apuntar.
  const arrastrar = (si) => {
    const el = seccionRef.current;
    if (!el) return;
    if (si) el.dataset.arrastrando = '';
    else delete el.dataset.arrastrando;
  };
  useEffect(() => {
    const el = seccionRef.current;
    return () => {
      clearTimeout(bloqueo.current);
      if (!el) return;
      delete el.dataset.popupBloqueo;
      delete el.dataset.arrastrando;
    };
  }, [seccionRef]);

  // La pista vive en Hero.jsx (así su lugar está reservado desde el primer
  // cuadro); el texto lo pone el juego, porque depende del progreso.
  const [pistaEl, setPistaEl] = useState(null);
  useEffect(() => {
    setPistaEl(seccionRef.current?.querySelector('.hero-termo__pista') ?? null);
  }, [seccionRef]);
  let pista = null;
  if (premio || gano) {
    pista = gano ? (
      <span className="hero-termo__pista-texto">🎉 ¡Listo! Tu {pct}% OFF te espera</span>
    ) : (
      <>
        {/* "Pegá 4", no "las 4": desde la ampliación E hay más de cuatro a la vista. */}
        <span className="hero-termo__pista-texto">🎁 Pegá {POPUP_JUEGO.piezas} calcos y ganate {pct}% OFF</span>
        <span className="hero-termo__contador">
          {cantidad}/{POPUP_JUEGO.piezas}
        </span>
      </>
    );
  } else if (cantidad === 0) {
    pista = (
      <>
        <span className="hero-termo__pista-mouse">Arrastrá una calco al termo</span>
        <span className="hero-termo__pista-toque">Tocá una calco para pegarla</span>
      </>
    );
  }

  // UN par de valores para todas las calcos: la posición del cursor normalizada
  // a [-0,5, 0,5]. Cada calco la multiplica por su intensidad. Dos resortes y no
  // uno por calco: la profundidad ya sale de las intensidades distintas, y cada
  // resorte es trabajo por cuadro en el hilo principal (con 16 calcos, 32).
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
          las animaciones de transform (la calco 3 ya no viaja desde la derecha,
          el apretón al pegar no se ve) y conserva las de opacidad. */}
      <MotionConfig reducedMotion="user">
        <div
          ref={capaRef}
          className="hero-termo__pegadas"
          aria-hidden="true"
          style={{ WebkitMaskImage: `url(${TERMO.src})`, maskImage: `url(${TERMO.src})` }}
        >
          <div ref={giroRef} className="hero-termo__giro">
            {pegadas.map((p) => (
              <CalcoPegada key={p.id} datos={p} onDespegar={despegar} onSalio={borrar} onTocar={tocar} />
            ))}
          </div>
        </div>
        {pistaEl && pista && createPortal(pista, pistaEl)}
        <div className="hero-calcos" aria-hidden="true">
          {activas.map((calco) => (
            <Calco
              key={calco.slot}
              calco={calco}
              suaveX={suaveX}
              suaveY={suaveY}
              entrada={entrada}
              adelantoMs={adelantoMs}
              reducido={reducido}
              conMouse={conMouse}
              diseno={lugares[calco.slot].actual}
              capaRef={capaRef}
              onPegar={pegar}
              anguloGiro={anguloGiro}
              onTocar={tocar}
              onArrastre={arrastrar}
              onDestino={siguienteDestino}
            />
          ))}
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}

function Calco({
  calco,
  suaveX,
  suaveY,
  entrada,
  adelantoMs,
  reducido,
  conMouse,
  diseno,
  capaRef,
  onPegar,
  anguloGiro,
  onTocar,
  onArrastre,
  onDestino
}) {
  const { slot } = calco;
  const [falta, setFalta] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const imgRef = useRef(null);
  const sesion = useRef(null);
  const volando = useRef(false);

  // El arrastre y la escala son resortes: `.jump()` los mueve sin animación
  // (seguir al cursor) y `.set()` con resorte (volver, volar).
  const arrastreX = useSpring(0, RESORTE_VUELO);
  const arrastreY = useSpring(0, RESORTE_VUELO);
  const escala = useSpring(1, RESORTE_ESCALA);

  // Mientras se arrastra o vuela, el parallax se congela: si no, la calco se
  // corre del cursor hasta 12 px (la 4) a medida que el cursor cruza la
  // pantalla. Es un ref y no estado: congelar no tiene que re-renderizar.
  const congelado = useRef(null);
  const px = useTransform(suaveX, (v) => v * calco.parallaxPx);
  const py = useTransform(suaveY, (v) => v * calco.parallaxPx);
  const x = useTransform([px, arrastreX], ([p, a]) => (congelado.current ? congelado.current.x : p) + a);
  const y = useTransform([py, arrastreY], ([p, a]) => (congelado.current ? congelado.current.y : p) + a);

  const congelar = () => {
    if (!congelado.current) congelado.current = { x: px.get(), y: py.get() };
  };
  // Lo que se movió el cursor mientras el parallax estaba congelado se pasa al
  // arrastre, así la calco no salta al descongelar; después el resorte la lleva.
  const descongelar = () => {
    const c = congelado.current;
    if (!c) return;
    congelado.current = null;
    arrastreX.jump(arrastreX.get() + c.x - px.get());
    arrastreY.jump(arrastreY.get() + c.y - py.get());
  };
  const llevar = (valor, destino) => (reducido ? valor.jump(destino) : valor.set(destino));
  const volverACasa = () => {
    descongelar();
    llevar(arrastreX, 0);
    llevar(arrastreY, 0);
    llevar(escala, 1);
  };

  // Se pega donde se la VE: a la altura `fy` (fracción de la caja, en pantalla)
  // y, alrededor del eje, en el ángulo α en que cae su centro (ampliación B).
  // Como el termo va girando en θ, en el sistema que gira queda en φ = α − θ, y
  // desde ahí da la vuelta. `alfa` se pasa cuando ya se sabe (el vuelo va al
  // frente): medirla recién movida no sirve, porque Framer Motion la dibuja en
  // su lugar nuevo recién en el cuadro siguiente (con movimiento reducido el
  // vuelo es un salto y se medía la calco todavía en su lugar de origen).
  // `r`: cuánto más grande es suelta que pegada, con la perspectiva incluida.
  // La pegada arranca de ese tamaño y se achica: no hay salto de un elemento
  // al otro.
  const pegarEn = (fy, rot, metodo, alfaDada) => {
    const capa = capaRef.current.getBoundingClientRect();
    const c = centroDe(imgRef.current);
    const alfa = alfaDada ?? anguloEnTermo(c.x, capa);
    const { escala, alturaCss } = perspectivaPegada(fy, alfa, capa.width);
    onPegar(
      slot,
      {
        fy: alturaCss,
        phi: alfa - anguloGiro(),
        rot,
        rotDesde: calco.entrada.hasta.rotate ?? 0,
        r: c.ancho / (ANCHO_PEGADA * capa.width * escala)
      },
      metodo
    );
  };

  // Recarga (ampliación D): pegada la anterior, el lugar trae otro diseño. La
  // calco vuelve a su lugar de una —el cambio de imagen hace que no se vea el
  // salto— y la nueva entra con la animación de entrada del lugar. El primer
  // diseño de cada lugar es el de la entrada de la página.
  const disenoInicial = useRef(diseno);
  const recargada = diseno !== disenoInicial.current;
  useEffect(() => {
    if (!recargada) return;
    volando.current = false;
    congelado.current = null;
    arrastreX.jump(0);
    arrastreY.jump(0);
    escala.jump(1);
    setFalta(false);
  }, [diseno, recargada, arrastreX, arrastreY, escala]);

  const iniciarArrastre = (inicio) => {
    congelar();
    sesion.current = { cx: inicio.clientX, cy: inicio.clientY, ax: arrastreX.get(), ay: arrastreY.get() };
    setArrastrando(true);
    onArrastre(true);
  };
  const seguir = (e) => {
    const s = sesion.current;
    if (!s) return;
    arrastreX.jump(s.ax + e.clientX - s.cx);
    arrastreY.jump(s.ay + e.clientY - s.cy);
  };
  const soltar = () => {
    const s = sesion.current;
    sesion.current = null;
    setArrastrando(false);
    onArrastre(false);
    if (!s || !capaRef.current) return volverACasa();
    // Cuenta el centro de la calco, no el cursor: es lo que se ve.
    const capa = capaRef.current.getBoundingClientRect();
    const c = centroDe(imgRef.current);
    const fx = (c.x - capa.left) / capa.width;
    const fy = (c.y - capa.top) / capa.height;
    if (!dentroDelCuerpo(fx, fy)) return volverACasa();
    return pegarEn(ajustarAlCuerpo(fx, fy).fy, calco.entrada.hasta.rotate ?? 0, 'arrastre');
  };
  const volar = (metodo) => {
    if (volando.current || !capaRef.current || !imgRef.current) return;
    volando.current = true;
    congelar();
    const capa = capaRef.current.getBoundingClientRect();
    const c = centroDe(imgRef.current);
    const d = onDestino();
    llevar(arrastreX, arrastreX.get() + capa.left + d.fx * capa.width - c.x);
    llevar(arrastreY, arrastreY.get() + capa.top + d.fy * capa.height - c.y);
    alLlegar(arrastreX, arrastreY, () => pegarEn(d.fy, d.rot, metodo, 0));
  };

  const puntero = usePuntero({
    alIniciar: (inicio) => iniciarArrastre(inicio),
    alMover: seguir,
    alSoltar: soltar,
    alClic: volar,
    alTocar: onTocar
  });

  const { desde, hasta, duracionMs, rotacionMs } = calco.entrada;
  // Una recargada entra de una: el retraso es el de la entrada de la página.
  const retrasoMs = recargada ? 0 : calco.entrada.retrasoMs - adelantoMs;
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
    '--flota-retraso': entrada || recargada ? `${retrasoMs + duracionMs}ms` : '0ms'
  };

  return (
    <m.div
      className={`hero-calco hero-calco--${slot} hero-calco--${calco.capa}`}
      data-arrastrando={arrastrando ? '' : undefined}
      style={{ x, y, visibility: falta ? 'hidden' : undefined }}
      // Hover solo con mouse: con el dedo se "pega" después del toque.
      whileHover={conMouse && !reducido ? { scale: 1.08, rotate: 2 } : undefined}
      transition={RESORTE_HOVER}
      {...puntero}
    >
      <m.div className="hero-calco__escala" style={{ scale: escala }}>
        <m.img
          // El diseño es la `key`: uno nuevo es otra imagen y vuelve a entrar.
          key={diseno}
          ref={imgRef}
          src={srcDiseno(diseno)}
          alt=""
          width={disenoPorNumero(diseno, DISENOS_HERO)?.ancho}
          height={disenoPorNumero(diseno, DISENOS_HERO)?.alto}
          decoding="async"
          draggable={false}
          className={`hero-calco__img${calco.loop ? ' hero-calco__img--flota' : ''}`}
          style={estiloLoop || undefined}
          initial={entrada || recargada ? desde : false}
          animate={hasta}
          transition={transicion}
          // Sin la imagen no queda el ícono de imagen rota: la calco no se ve y
          // las otras siguen igual. La caja de la escena no cambia (RNF-7).
          onError={() => setFalta(true)}
        />
      </m.div>
    </m.div>
  );
}

/**
 * Una calco pegada en el termo. Son dos elementos por lo mismo que la suelta:
 *   · el `div` la ubica alrededor del eje (`rotateY(φ) translateZ(radio)`, en
 *     CSS) y la esconde cuando queda del lado de atrás (`backface-visibility`),
 *     que además la deja sin clics (RF-B9).
 *   · la `img` hace el apretón: llega del tamaño que tenía suelta (`r`) y se
 *     achica contra el termo. Framer Motion le escribe su propio `transform`, y
 *     en el mismo elemento pisaría el del giro.
 * Sin flotación ni parallax (RF-A6): está pegada a un termo que no se mueve de
 * lugar, solo gira. Un clic o un toque la despega (RF-D5): se infla, se
 * desvanece y recién al terminar se borra (`onSalio`). Lo mismo cuando la
 * despega el tope de 12.
 */
function CalcoPegada({ datos, onDespegar, onSalio, onTocar }) {
  const nada = () => {};
  const puntero = usePuntero({
    alIniciar: nada,
    alMover: nada,
    alSoltar: nada,
    alClic: () => onDespegar(datos.id),
    alTocar: onTocar
  });
  const medidas = disenoPorNumero(datos.diseno, DISENOS_HERO);

  return (
    <div
      className="hero-calco-pegada"
      style={{ top: `${datos.fy * 100}%`, width: `${ANCHO_PEGADA * 100}%`, '--angulo': `${datos.phi}deg` }}
      {...(datos.saliendo ? {} : puntero)}
    >
      <m.img
        src={srcDiseno(datos.diseno)}
        alt=""
        width={medidas?.ancho}
        height={medidas?.alto}
        decoding="async"
        draggable={false}
        initial={{ scale: datos.r, rotate: datos.rotDesde }}
        animate={
          datos.saliendo
            ? { scale: 1.3, opacity: 0, rotate: datos.rot + 12 }
            : { scale: [datos.r, 0.94, 1], rotate: datos.rot }
        }
        transition={
          datos.saliendo
            ? { duration: 0.3, ease: 'easeIn' }
            : { scale: { duration: 0.4, times: [0, 0.75, 1], ease: 'easeOut' }, rotate: { duration: 0.3, ease: 'easeOut' } }
        }
        onAnimationComplete={() => {
          if (datos.saliendo) onSalio(datos.id);
        }}
      />
    </div>
  );
}
