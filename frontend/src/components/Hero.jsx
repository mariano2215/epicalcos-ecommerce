import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BuscadorCalcos from './BuscadorCalcos.jsx';
import { isSectionHidden } from '../config/site.js';
import { trackCustomStickerClick } from '../lib/analytics.js';
import { useReducedMotion } from '../lib/motion.js';
import { COPY_HERO, TERMO } from '../lib/heroTermo.js';

// Las calcos traen Framer Motion: van en su propio chunk para que el chunk
// principal (el de TODAS las rutas) no lo cargue. Ver HeroCalcos.jsx.
const HeroCalcos = lazy(() => import('./hero/HeroCalcos.jsx'));

/**
 * El hero: UNA idea, un elemento dominante, dos salidas.
 *
 * QUÉ HABÍA ACÁ HASTA EL 4/9/2026, todo junto y arriba del fold: un badge de
 * "calcos premium", una card de promo (o de envío gratis) con precio y CTA
 * propios, un titular que rotaba entre 5 frases con animación permanente, un H1
 * distinto y más chico que ese titular, un párrafo de propuesta, una tira de 4
 * badges de confianza, un buscador y 14 calcos flotando de fondo. Ocho
 * elementos compitiendo: ninguno ganaba, y en un celular de 375 px la persona
 * que venía de un anuncio de Instagram tenía que decidir qué mirar antes de
 * entender qué se vendía (spec 014).
 *
 * DESDE LA SPEC 028: el elemento dominante es un TERMO, y el titular le habla a
 * él ("Tu termo está pidiendo calcos."). El hero anterior decía "calcos" pero no
 * mostraba ningún objeto con calcos hasta Antes/Después, varias pantallas más
 * abajo. El termo va liso a propósito —es el que "pide calcos"— y alrededor,
 * cuatro calcos llegan de a una y cada una se mueve distinto
 * (ver lib/heroTermo.js). Abajo del texto, los mismos dos caminos de siempre:
 * el catálogo y los personalizados.
 *
 * Lo que se fue del hero con la spec 028, y por qué:
 *   · las 8 calcos flotantes de fondo (`StickerField`): con las 4 nuevas eran
 *     12 cosas moviéndose, y el pedido era "sin verse sobrecargado".
 *   · el saludo ("Bienvenido" → "Estás en casa", spec 024): una segunda línea
 *     animada arriba de un titular que ahora tiene que leerse de inmediato.
 *   · los experimentos `hero_titular` y `hero_cta`: el H1 y el botón ya no son
 *     variantes. Están apagados en lib/experiments.js, y prenderlos de nuevo NO
 *     hace nada — este componente ya no los lee.
 *
 * ⚠️ SEO: el H1 es el titular grande y tiene que decir "calcos" (piso de la
 * spec 015; lo verifica `heroTermo.test.js`). El `title`, la meta description y
 * el JSON-LD son la señal fuerte y viven en `lib/seo.js`.
 *
 * ⚠️ LCP: el termo pasa a ser el candidato a LCP del Home (antes lo era la
 * primera calco flotante). Por eso va acá y no adentro del chunk diferido, con
 * `fetchpriority="high"`, y su entrada solo lo agranda: NUNCA arranca en
 * opacidad 0. Chrome no cuenta como candidato a un elemento invisible, y un
 * fade-in correría el LCP lo que dure la animación. Mismo motivo por el que el
 * H1 y la bajada suben pero no aparecen.
 *
 * `conBuscador` lo decide `Home` (experimento `hero_buscador`, apagado desde la
 * spec 028). Se sigue respetando: si alguien lo prende, `Home` apaga la sección
 * del buscador y la Home no puede quedarse sin ninguno. Ver `ubicacionBuscador`
 * en lib/heroVariantes.js.
 *
 * ── MOVIMIENTO ────────────────────────────────────────────────────────────────
 *
 * Tres capas, cada una con lo más barato que alcanza:
 *   · el fondo (malla y aurora, spec 024): CSS, se pausa fuera de pantalla.
 *   · el texto, los botones y el termo: CSS (`.hero-pieza`, `.hero-termo`). No
 *     esperan a ningún JS extra.
 *   · las calcos: Framer Motion, en un chunk aparte (entrada, parallax y hover).
 * Acá solo se decide SI se reproduce la entrada y se pausa lo que no se ve.
 *
 * @param {{ conBuscador?: boolean }} props
 */

// Fuera del componente: vive lo que vive la pestaña, no lo que vive el Home.
// Volver al Home navegando dentro del sitio desmonta y remonta el Hero; sin
// esto, cada vuelta repetiría la entrada y demoraría los botones de nuevo.
// Recargar la página reinicia el módulo, y ahí sí vuelve a entrar.
let heroYaSeMostro = false;

/**
 * Si el chunk de las calcos no llega (red cortada a mitad de carga), `lazy()`
 * rechaza y el error sube hasta el primer límite que encuentre. Sin éste, ese
 * límite es la raíz: se caería la Home entera por cuatro calcos decorativas.
 */
class SinCalcosSiFalla extends Component {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  render() {
    return this.state.fallo ? null : this.props.children;
  }
}

export default function Hero({ conBuscador = false }) {
  const personalizadosVisible = !isSectionHidden('personalizados');
  const heroRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [termoFalta, setTermoFalta] = useState(false);

  // El initializer solo LEE la bandera; la escritura va en el effect. Si la
  // escribiera acá, el doble render de React.StrictMode (activo en main.jsx) se
  // comería la entrada en desarrollo y nunca se vería.
  const [entrada] = useState(() => !heroYaSeMostro && !reducedMotion);
  // Cuándo arrancó la entrada. Las calcos llegan en otro chunk, un poco después:
  // con esto cuentan sus retrasos desde acá y no desde que terminan de bajar.
  const [inicioEntrada] = useState(() => performance.now());
  useEffect(() => {
    heroYaSeMostro = true;
  }, []);

  // Con el hero fuera de pantalla, el fondo y la flotación de las calcos no
  // corren. Es un atributo y no una clase a propósito: React reescribe
  // `className` cuando cambia el string del prop, y una clase puesta a mano
  // podría desaparecer en un re-render. Un `data-*` que React no maneja no lo
  // toca nunca.
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) delete el.dataset.pausado;
      else el.dataset.pausado = '';
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const [inicioH1, resaltadoH1] = COPY_HERO.h1;

  return (
    <section
      ref={heroRef}
      className={`hero-gradient hero-gradient--vivo hero-termo relative${entrada ? ' hero--entrada' : ''}`}
    >
      <div className="hero-malla" aria-hidden="true">
        <span className="hero-malla__mancha hero-malla__mancha--naranja" />
        <span className="hero-malla__mancha hero-malla__mancha--fucsia" />
        <span className="hero-malla__mancha hero-malla__mancha--rosa" />
        <span className="hero-malla__mancha hero-malla__mancha--violeta" />
        <span className="hero-malla__mancha hero-malla__mancha--azul" />
      </div>
      <div className="hero-aurora" aria-hidden="true" />

      <div className="container-app hero-termo__grilla">
        <h1 className="hero-pieza hero-pieza--titular font-display font-black text-[2rem] leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl max-w-4xl mx-auto">
          {inicioH1} <span className="gradient-text">{resaltadoH1}</span>
        </h1>

        <p className="hero-pieza hero-pieza--subtitulo mt-4 max-w-xl mx-auto text-white/80 text-base md:text-lg leading-snug">
          {COPY_HERO.bajada}
        </p>

        {/* Variante `en_hero` de `hero_buscador` (apagado): el buscador va
            ARRIBA de los botones. Ver el comentario de cabecera. */}
        {conBuscador && (
          <BuscadorCalcos
            className="hero-pieza hero-pieza--aparece hero-pieza--buscador mt-7 w-full max-w-2xl mx-auto buscador--sobre-hero"
            size="lg"
            chips
            origen="hero"
          />
        )}

        {/* `uppercase` acá y no en `.btn-*`: esas clases las usa todo el sitio. */}
        <div className="hero-pieza hero-pieza--aparece hero-pieza--botones mt-7 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/categorias" className="btn-primary w-full sm:w-auto uppercase tracking-wide">
            {COPY_HERO.ctaPrincipal}
          </Link>
          {personalizadosVisible && (
            <Link
              to="/personalizados"
              onClick={() => trackCustomStickerClick('hero')}
              className="btn-secondary w-full sm:w-auto uppercase tracking-wide"
            >
              {COPY_HERO.ctaSecundario}
            </Link>
          )}
        </div>

        {/* La escena tiene un tamaño fijo por CSS que no depende de ninguna
            imagen: cargar el termo o las calcos no mueve nada (sin CLS). Las
            calcos se posicionan adentro de ella, y la escena está DEBAJO de
            los botones en el flujo: ninguna calco puede tapar el texto. */}
        <div className="hero-termo__escena" style={{ '--proporcion-termo': TERMO.ancho / TERMO.alto }}>
          <img
            src={TERMO.src}
            alt={TERMO.alt}
            width={TERMO.ancho}
            height={TERMO.alto}
            // Minúscula a propósito: React 18 no conoce `fetchPriority` y avisa
            // por consola; el atributo en minúscula pasa tal cual al HTML.
            fetchpriority="high"
            className={`hero-termo__producto${termoFalta ? ' hero-termo__producto--falta' : ''}`}
            onError={() => setTermoFalta(true)}
          />
          <SinCalcosSiFalla>
            <Suspense fallback={null}>
              <HeroCalcos seccionRef={heroRef} entrada={entrada} inicioEntrada={inicioEntrada} />
            </Suspense>
          </SinCalcosSiFalla>
        </div>
      </div>
    </section>
  );
}
