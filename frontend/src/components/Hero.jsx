import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackSearch } from '../lib/analytics.js';
import StickerField from './StickerField.jsx';
import RotatingHeadline from './RotatingHeadline.jsx';

const quickTags = [
  { label: 'Anime', slug: 'anime' },
  { label: 'Fútbol', slug: 'futbol' },
  { label: 'Memes', slug: 'memes' },
  { label: 'Disney', slug: 'disney' },
  { label: 'Pokémon', slug: 'pokemon' }
];

export default function Hero() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const onSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (term) trackSearch(term);
    const params = new URLSearchParams();
    if (term) params.set('q', term);
    navigate(`/categorias${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <section className="hero-gradient relative">
      <div className="hero-aurora" aria-hidden="true" />
      <StickerField count={14} opacity={0.34} />

      <div className="container-app pt-8 pb-8 md:pt-10 md:pb-10 text-center relative z-10">
        <span className="badge badge-soft mb-3 hidden sm:inline-flex">🔥 Calcos premium · Resistentes al agua y al sol</span>

        <h1 className="font-display font-black text-2xl md:text-4xl lg:text-5xl leading-[1.05] tracking-tight">
          <RotatingHeadline />
        </h1>

        <p className="mt-2 max-w-2xl mx-auto text-white/70 text-sm md:text-base hidden sm:block">
          Miles de diseños en 99 categorías. Elegís cada calco, su tamaño (4, 6 o 9 cm) y la cantidad. Desde 10 calcos, 10% off.
        </p>

        {/* Search card */}
        <form onSubmit={onSearch} className="mt-3 card-glass max-w-md mx-auto p-1 flex items-center gap-1">
          <span className="pl-2 text-white/50 text-sm" aria-hidden>🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscá una categoría…"
            className="flex-1 min-w-0 bg-transparent outline-none px-1.5 py-1.5 text-sm text-white placeholder:text-white/40"
            aria-label="Buscar categorías"
          />
          <button type="submit" className="btn-primary shrink-0 !py-1.5 !px-3 !text-xs">Buscar</button>
        </form>

        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {quickTags.map((t) => (
            <button
              key={t.slug}
              onClick={() => navigate(`/categoria/${t.slug}`)}
              className="btn-ghost !text-white/60 !text-xs !py-1 !px-2.5 border border-white/10 hover:border-white/20"
            >
              #{t.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
