import { Link } from 'react-router-dom';
import Reveal from './Reveal.jsx';
import { isSectionHidden } from '../config/site.js';
import { trackCustomStickerClick, trackWholesaleClick } from '../lib/analytics.js';

/**
 * Bifurcación por intención, apenas termina el buscador.
 *
 * El Home arrancaba directo con catálogo, y el que venía a mandar su logo o a
 * comprar para su negocio tenía que deducir solo que existía una página para
 * eso. Estas tres tarjetas separan las tres intenciones reales de compra.
 *
 * ⚠️ LAS TRES CARDS SON IDÉNTICAS EN ESTRUCTURA: mismo padding, mismo orden
 * (icono → título → texto → CTA), misma altura, mismo lugar del CTA. Lo único
 * que cambia es el contenido y el color del velo. Tres cards con estructuras
 * distintas se leen como tres tipos de cosa distintos, y la persona tiene que
 * volver a aprender a leer cada una.
 *
 * Respeta HIDDEN_SECTIONS: si una sección se despublica desde config/site.js,
 * su tarjeta desaparece y la grilla se reacomoda sin dejar huecos.
 */
const OPCIONES = [
  {
    slug: 'categorias',
    to: '/categorias',
    emoji: '✨',
    title: 'Personalizar mis cosas',
    text: 'Termo, mate, notebook, botella y todo lo que uses todos los días.',
    cta: 'Ver diseños',
    accent: 'from-fuchsia-500 to-pink-500'
  },
  {
    slug: 'personalizados',
    to: '/personalizados',
    emoji: '🎨',
    title: 'Hacer mis propias calcos',
    text: 'Subí tu logo, tu ilustración, una foto o el diseño que quieras.',
    cta: 'Personalizar',
    accent: 'from-violet-500 to-indigo-500',
    track: () => trackCustomStickerClick('intent_selector')
  },
  {
    slug: 'negocio',
    to: '/negocio',
    emoji: '🏪',
    title: 'Comprar para mi negocio',
    text: 'Packaging, productos, eventos y compras por cantidad.',
    cta: 'Ver opciones',
    accent: 'from-sky-400 to-blue-600',
    track: () => trackWholesaleClick('intent_selector')
  }
];

export default function IntentSelector() {
  const opciones = OPCIONES.filter((o) => !isSectionHidden(o.slug));
  if (opciones.length === 0) return null;

  return (
    <section className="seccion">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">¿Qué querés hacer?</h2>
        </div>

        <div className={`grid gap-3 ${opciones.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {opciones.map((o, i) => (
            <Reveal key={o.slug} delay={i * 80} className="h-full">
              <Link
                to={o.to}
                onClick={o.track}
                className="card-glass card-glass-hover p-6 flex flex-col h-full relative overflow-hidden group"
              >
                <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${o.accent}`} />
                <div className="relative flex-1">
                  <div className="text-4xl mb-3" aria-hidden>{o.emoji}</div>
                  <div className="font-display font-extrabold text-xl leading-tight">{o.title}</div>
                  <p className="text-sm text-white/65 mt-2 leading-snug">{o.text}</p>
                </div>
                <span className="relative mt-5 inline-flex items-center gap-1 text-sm font-bold text-white group-hover:text-brand-fuchsia transition-colors">
                  {o.cta} <span aria-hidden>→</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
