import { Link } from 'react-router-dom';
import Reveal from './Reveal.jsx';
import { isSectionHidden } from '../config/site.js';

/**
 * Bifurcación por intención, apenas termina el hero.
 *
 * El Home arrancaba directo con catálogo ("Los más vendidos"), y el que venía a
 * mandar su logo o a comprar para su negocio tenía que deducir solo que existía
 * una página para eso. Estas tres tarjetas separan las tres intenciones reales
 * de compra en el primer scroll.
 *
 * Respeta HIDDEN_SECTIONS: si una sección se despublica desde config/site.js,
 * su tarjeta desaparece y la grilla se reacomoda sin dejar huecos.
 */
const OPCIONES = [
  {
    slug: 'categorias',
    to: '/categorias',
    emoji: '✨',
    title: 'Para mí',
    text: 'Calcos para termo, notebook, mate, botella y lo que se te ocurra.',
    cta: 'Ver diseños',
    accent: 'from-fuchsia-500 to-pink-500'
  },
  {
    slug: 'personalizados',
    to: '/personalizados',
    emoji: '🎨',
    title: 'Mis propios diseños',
    text: 'Mandanos tu logo, foto o ilustración y nosotros hacemos tus calcos.',
    cta: 'Personalizar',
    accent: 'from-violet-500 to-indigo-500'
  },
  {
    slug: 'negocio',
    to: '/negocio',
    emoji: '🏪',
    title: 'Para mi negocio',
    text: 'Calcos para packaging, productos, eventos y marcas.',
    cta: 'Calcos para negocios',
    accent: 'from-sky-400 to-blue-600'
  }
];

export default function IntentSelector() {
  const opciones = OPCIONES.filter((o) => !isSectionHidden(o.slug));
  if (opciones.length === 0) return null;

  return (
    <section className="py-10">
      <div className="container-app">
        <div className="mb-6 text-center sm:text-left">
          <span className="badge badge-soft mb-2">Empezá por acá</span>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl">¿Qué estás buscando?</h2>
        </div>

        <div className={`grid gap-3 ${opciones.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {opciones.map((o, i) => (
            <Reveal key={o.slug} delay={i * 80} className="h-full">
              <Link
                to={o.to}
                className="card-glass card-glass-hover p-6 flex flex-col h-full relative overflow-hidden group"
              >
                <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${o.accent}`} />
                <div className="relative flex-1">
                  <div className="text-4xl mb-3">{o.emoji}</div>
                  <div className="font-display font-extrabold text-xl leading-tight">{o.title}</div>
                  <p className="text-sm text-white/65 mt-2">{o.text}</p>
                </div>
                <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-bold text-white group-hover:text-brand-fuchsia transition-colors">
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
