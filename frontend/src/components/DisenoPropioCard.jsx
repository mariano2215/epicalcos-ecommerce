import { Link, useLocation } from 'react-router-dom';
import { SPECIALS } from '../data/categories.js';
import { trackCustomStickerClick } from '../lib/analytics.js';

/**
 * "Diseño propio" en /categorias (spec 031, enmienda E-1): la puerta a los
 * personalizados, grande y arriba de todo.
 *
 * Mariano, 5/10/2026: el botón PERSONALIZADOS del selector del Home lleva a
 * /categorias, "en donde dice diseño propio", y "esa card hacerla más
 * visible". Hasta ese día /categorias no tenía ninguna: el que quería sus
 * propias calcos tenía que adivinar que la página existía. Ocupa todo el ancho
 * —una card de categoría más se perdería entre las 72— y va antes del
 * buscador, que es lo primero que se ve.
 *
 * `id="diseno-propio"`: lo apunta el selector del Home. Al llegar por ese link
 * (`#diseno-propio`) la card se marca con un borde, para que se vea a dónde
 * llevó el botón. NO renombrar el id.
 *
 * El texto de precio sale de SPECIALS (data/categories.js), el mismo blurb que
 * ya usa el Home: si cambia el precio de la calco, cambia acá solo. Si la
 * sección está despublicada (HIDDEN_SECTIONS), SPECIALS no la trae y la card no
 * se monta.
 */
export default function DisenoPropioCard() {
  const { hash } = useLocation();
  const personalizados = SPECIALS.find((s) => s.slug === 'personalizados');
  if (!personalizados) return null;
  const destacada = hash === '#diseno-propio';

  return (
    <section
      id="diseno-propio"
      aria-labelledby="diseno-propio-titulo"
      className={`scroll-mt-28 mb-6 rounded-3xl p-[2px] transition-shadow ${
        destacada ? 'shadow-[0_0_0_4px_rgba(255,255,255,0.35)]' : ''
      }`}
      style={{ background: 'linear-gradient(135deg,#FF1B8D,#8B5CF6,#3A86FF)' }}
    >
      <div className="rounded-[calc(1.5rem-2px)] bg-[#161616] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <span className="text-5xl sm:text-6xl leading-none" aria-hidden>
          {personalizados.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <span className="badge badge-hot">Diseño propio</span>
          <h2 id="diseno-propio-titulo" className="font-display font-extrabold text-2xl sm:text-3xl mt-2 leading-tight">
            Hacé calcos con tu propia imagen
          </h2>
          <p className="text-white/70 mt-1.5 text-sm sm:text-base">
            Tu foto, tu dibujo o tu logo. {personalizados.blurb}.
          </p>
        </div>
        <Link
          to={personalizados.to}
          onClick={() => trackCustomStickerClick('categorias_diseno_propio')}
          className="btn-primary min-h-[48px] w-full sm:w-auto shrink-0"
        >
          Hacer mis calcos
        </Link>
      </div>
    </section>
  );
}
