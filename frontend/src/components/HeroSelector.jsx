import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HERO_SELECTOR, TIPOS } from '../config/selectorCompra.js';
import { trackSelectorCompra, trackCustomStickerClick, trackWholesaleClick } from '../lib/analytics.js';

/**
 * El hero del Home desde el 5/10/2026 (spec 031, enmienda E-1): arranca con UNA
 * pregunta —¿cómo querés comprar?— y dos botones grandes, POR MENOR y POR
 * MAYOR. Al elegir uno aparecen sus dos destinos.
 *
 * Reemplaza al hero del termo (spec 028), que Mariano eligió sacar entero.
 * `Hero.jsx` y las calcos animadas quedan en el repo sin montar (criterio del
 * proyecto: no se borra), así que Framer Motion ya no baja en el Home.
 *
 * Es texto y botones: el LCP es el H1, que no espera ninguna imagen ni ningún
 * chunk. El fondo es `.hero-gradient`, el mismo degradado de siempre, sin las
 * capas animadas (malla y aurora) que necesitaban pausarse fuera de pantalla.
 *
 * ACCESIBILIDAD: los dos botones son `aria-pressed` (un interruptor de dos
 * posiciones) y controlan la lista de destinos, que se anuncia al aparecer.
 * Targets de 96 px de alto: es lo primero que se toca en el celular.
 *
 * La elección se recuerda en `sessionStorage`: el que entra a la tienda y
 * vuelve con "atrás" encuentra sus dos opciones abiertas. En el navegador de
 * Instagram (sin storage) simplemente arranca cerrado.
 */
const CLAVE = 'epicalcos.selectorCompra';

function leerTipo() {
  try {
    const v = sessionStorage.getItem(CLAVE);
    return TIPOS.some((t) => t.id === v) ? v : null;
  } catch {
    return null;
  }
}

function guardarTipo(v) {
  try {
    sessionStorage.setItem(CLAVE, v);
  } catch {
    /* sin storage: el selector anda igual, solo no se recuerda */
  }
}

/** Los eventos de siempre, para no cortar las series que ya se leen en GA4. */
function trackDestino(id) {
  if (id === 'personalizados') trackCustomStickerClick('hero');
  if (id === 'negocio' || id === 'mayorista') trackWholesaleClick(`hero_${id}`);
}

export default function HeroSelector() {
  const [tipo, setTipo] = useState(leerTipo);
  const activo = TIPOS.find((t) => t.id === tipo) || null;
  const [inicioH1, resaltadoH1] = HERO_SELECTOR.h1;

  const elegir = (id) => {
    setTipo(id);
    guardarTipo(id);
    trackSelectorCompra({ paso: 'tipo', opcion: id });
  };

  return (
    <section className="hero-gradient relative">
      <div className="container-app relative pt-10 pb-12 sm:pt-14 md:pt-20 md:pb-20 text-center">
        <h1 className="font-display font-black text-[2rem] sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-balance max-w-3xl mx-auto">
          {inicioH1} <span className="gradient-text">{resaltadoH1}</span>
        </h1>
        <p id="selector-pregunta" className="mt-4 text-white/85 text-lg md:text-xl font-semibold">
          {HERO_SELECTOR.pregunta}
        </p>

        <div role="group" aria-labelledby="selector-pregunta" className="mt-6 grid grid-cols-2 gap-3 max-w-2xl mx-auto">
          {TIPOS.map((t) => {
            const elegido = tipo === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={elegido}
                aria-controls="selector-destinos"
                onClick={() => elegir(t.id)}
                className={`rounded-2xl border-2 px-3 py-4 sm:p-6 min-h-[96px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  elegido ? 'border-transparent text-white' : 'border-white/25 bg-black/35 hover:border-white/60'
                }`}
                style={elegido ? { background: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)' } : undefined}
              >
                <span className="block font-display font-black text-xl sm:text-3xl uppercase tracking-wide">{t.label}</span>
                <span className={`block text-xs sm:text-sm mt-1.5 ${elegido ? 'text-white/90' : 'text-white/65'}`}>
                  {t.detalle[0]}
                  <br />
                  {t.detalle[1]}
                </span>
              </button>
            );
          })}
        </div>

        {/* `aria-live`: al elegir, el lector de pantalla anuncia los dos
            destinos que aparecen. Vacío hasta que se elige. */}
        <div id="selector-destinos" aria-live="polite" className="max-w-2xl mx-auto">
          {activo && (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {activo.destinos.map((d) => (
                <li key={d.id}>
                  <Link
                    to={d.to}
                    onClick={() => {
                      trackSelectorCompra({ paso: 'destino', opcion: d.id });
                      trackDestino(d.id);
                    }}
                    className="card-glass card-glass-hover flex items-center justify-between gap-3 p-4 sm:p-5 text-left min-h-[76px] h-full"
                  >
                    <span className="min-w-0">
                      <span className="block font-display font-extrabold text-lg leading-tight uppercase">{d.label}</span>
                      <span className="block text-sm text-white/65 mt-1 leading-snug">{d.texto}</span>
                    </span>
                    <span aria-hidden className="text-2xl shrink-0">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
