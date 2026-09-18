import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import StickerField from './StickerField.jsx';
import BuscadorCalcos from './BuscadorCalcos.jsx';
import { isSectionHidden } from '../config/site.js';
import { trackCustomStickerClick } from '../lib/analytics.js';
import { useExperiment } from '../lib/experiments.js';
import { useReducedMotion } from '../lib/motion.js';
import { FRASES_SALUDO, DURACION_FRASE_MS, ENTRADA_FINAL_MS } from '../lib/heroSaludo.js';
import {
  TITULARES,
  CTA_PRINCIPAL,
  TITULAR_POR_DEFECTO,
  CTA_POR_DEFECTO
} from '../lib/heroVariantes.js';

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
 * entender qué se vendía.
 *
 * Ahora: figura y fondo. La figura es el H1. El fondo es el degradado con las
 * calcos, bajado a 8 piezas y menos opacidad justamente para que sea fondo.
 * Debajo, una línea de subtítulo y exactamente DOS caminos — el catálogo y los
 * personalizados—, que son las dos únicas cosas que alguien puede querer hacer
 * al llegar.
 *
 * Lo que se fue no se perdió, se mudó a donde se lee:
 *   · la promo / el envío gratis → la barra superior y `OfertaPrincipal`
 *   · los badges de confianza    → `Beneficios` y `MetricasConfianza`
 *   · el buscador                → su propia sección, cuatro veces más grande
 *
 * ⚠️ SEO: el H1 pasó a ser el titular grande. Antes era un H1 chico y aparte
 * ("Calcos y stickers personalizados") porque el titular grande rotaba 5 frases
 * y no podía ser un heading; sin titular rotante esa razón ya no existe.
 * Desde la spec 015 el titular es una variante de experimento, así que el
 * término del negocio ya no puede darse por sentado en el H1: la regla pasó a
 * ser que **cada variante** lo diga en el H1 o en el subtítulo, y hay un test
 * que lo exige (`heroVariantes.test.js`). El `title`, la meta description y el
 * JSON-LD son la señal fuerte y NO entran al experimento (`lib/seo.js` intacto).
 *
 * ⚠️ `eagerFirst` se mantiene: la primera calco del campo sigue siendo la única
 * imagen arriba del fold de todo el Home y es la que define el LCP.
 *
 * ⚠️ ACÁ CORREN DOS EXPERIMENTOS (spec 015): el titular y el texto del botón
 * principal. Lo ÚNICO que cambia entre variantes es eso — el CTA secundario, el
 * fondo, el espaciado y el `StickerField` son idénticos en las cuatro celdas.
 * Un elemento que cambia "de paso" es una segunda variable y arruina el test.
 *
 * La asignación de `useExperiment` es sincrónica (localStorage + hash), así que
 * la variante ya está en el primer render: no hay parpadeo que tapar y no hace
 * falta ningún script anti-flicker en el <head>.
 *
 * `conBuscador` es el tercer experimento y NO se resuelve acá: lo decide `Home`,
 * que es quien tiene que apagar la sección `BuscadorSeccion` en el mismo
 * movimiento. Si cada componente leyera la variante por su cuenta, nada
 * impediría que los dos dijeran que sí y quedaran dos buscadores apilados.
 * Ver `ubicacionBuscador` en lib/heroVariantes.js.
 *
 * ── MOVIMIENTO (spec 024) ─────────────────────────────────────────────────────
 *
 * El degradado del fondo se mueve (`.hero-malla`), arriba del H1 hay un saludo
 * que pasa unas frases, y el contenido entra escalonado. Todo es CSS: acá solo
 * se decide SI se reproduce la entrada y se pausa el fondo cuando no se ve.
 *
 * ⚠️ El saludo NO es el titular rotante que se sacó en la spec 014: es más chico
 * que el H1, da una sola vuelta (≤ 5 s) y se queda quieto. El H1, el subtítulo y
 * los botones —las variables de los experimentos— no cambian, y todo lo nuevo
 * es idéntico en las cuatro celdas. Los retrasos de la entrada van por ROL y no
 * por posición justamente para eso (ver el bloque del hero en index.css).
 *
 * ⚠️ El H1 y el subtítulo nunca arrancan invisibles: solo suben. Un fade-in
 * correría el LCP.
 *
 * @param {{ conBuscador?: boolean }} props
 */

// Fuera del componente: vive lo que vive la pestaña, no lo que vive el Home.
// Volver al Home navegando dentro del sitio desmonta y remonta el Hero; sin
// esto, cada vuelta repetiría la bienvenida y demoraría los botones de nuevo.
// Recargar la página reinicia el módulo, y ahí sí vuelve a saludar.
let heroYaSeMostro = false;

export default function Hero({ conBuscador = false }) {
  const personalizadosVisible = !isSectionHidden('personalizados');
  const heroRef = useRef(null);
  const reducedMotion = useReducedMotion();

  // El initializer solo LEE la bandera; la escritura va en el effect. Si la
  // escribiera acá, el doble render de React.StrictMode (activo en main.jsx) se
  // comería la entrada en desarrollo y nunca se vería.
  const [entrada] = useState(() => !heroYaSeMostro && !reducedMotion);
  useEffect(() => {
    heroYaSeMostro = true;
  }, []);

  // El fondo no corre cuando el hero está fuera de pantalla. Es un atributo y
  // no una clase a propósito: React reescribe `className` cuando cambia el
  // string del prop, y una clase puesta a mano podría desaparecer en un
  // re-render. Un `data-*` que React no maneja no lo toca nunca.
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

  const varianteTitular = useExperiment('hero_titular');
  const varianteCta = useExperiment('hero_cta');

  // El `??` no es decorativo: `useExperiment` devuelve null si el experimento
  // no está declarado (por ejemplo, si alguien lo borra de EXPERIMENTS sin
  // tocar este archivo). El hero no puede quedarse sin titular ni sin botón.
  const titular = TITULARES[varianteTitular] ?? TITULARES[TITULAR_POR_DEFECTO];
  const textoCta = CTA_PRINCIPAL[varianteCta] ?? CTA_PRINCIPAL[CTA_POR_DEFECTO];
  const [inicioH1, resaltadoH1] = titular.h1;

  return (
    <section
      ref={heroRef}
      className={`hero-gradient hero-gradient--vivo relative${entrada ? ' hero--entrada' : ''}`}
    >
      <div className="hero-malla" aria-hidden="true">
        <span className="hero-malla__mancha hero-malla__mancha--naranja" />
        <span className="hero-malla__mancha hero-malla__mancha--fucsia" />
        <span className="hero-malla__mancha hero-malla__mancha--rosa" />
        <span className="hero-malla__mancha hero-malla__mancha--violeta" />
        <span className="hero-malla__mancha hero-malla__mancha--azul" />
      </div>
      <div className="hero-aurora" aria-hidden="true" />
      <StickerField count={8} opacity={0.22} eagerFirst />

      <div className="container-app pt-16 pb-14 md:pt-28 md:pb-24 text-center relative z-10">
        {/* `aria-hidden`: las cuatro frases están en el DOM a la vez y un lector
            de pantalla las leería seguidas (o, con aria-live, anunciaría cada
            cambio). Es un saludo; el contenido es el H1. */}
        <p
          className="hero-saludo"
          aria-hidden="true"
          style={{ '--saludo-dur': `${DURACION_FRASE_MS}ms`, '--saludo-entrada': `${ENTRADA_FINAL_MS}ms` }}
        >
          {FRASES_SALUDO.map((frase, i) => (
            <span
              key={frase}
              className={`hero-saludo__frase${i === FRASES_SALUDO.length - 1 ? ' hero-saludo__frase--final' : ''}`}
              style={{ '--i': i }}
            >
              {frase}
            </span>
          ))}
        </p>

        <h1 className="hero-pieza hero-pieza--titular font-display font-black text-[2rem] leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl max-w-4xl mx-auto">
          {inicioH1} <span className="gradient-text">{resaltadoH1}</span>
        </h1>

        <p className="hero-pieza hero-pieza--subtitulo mt-5 max-w-xl mx-auto text-white/75 text-base md:text-lg leading-snug">
          {titular.subtitulo}
        </p>

        {/* Variante `en_hero`: el buscador va ARRIBA de los CTA, no abajo.
            Abajo quedaría a un par de píxeles de donde ya está hoy (la sección
            que sigue) y el test no mediría nada. Acá sí cambia la jerarquía:
            buscar pasa a ser lo primero que se puede hacer, y los dos CTA bajan
            — que es exactamente el costo que este experimento viene a pesar. */}
        {conBuscador && (
          <BuscadorCalcos
            className="hero-pieza hero-pieza--aparece hero-pieza--buscador mt-8 max-w-2xl mx-auto buscador--sobre-hero"
            size="lg"
            chips
            origen="hero"
          />
        )}

        <div className="hero-pieza hero-pieza--aparece hero-pieza--botones mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/categorias" className="btn-primary w-full sm:w-auto">
            {textoCta}
          </Link>
          {personalizadosVisible && (
            <Link
              to="/personalizados"
              onClick={() => trackCustomStickerClick('hero')}
              className="btn-secondary w-full sm:w-auto"
            >
              Hacer mis propias calcos
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
