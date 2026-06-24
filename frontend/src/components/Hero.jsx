import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackSearch } from '../lib/analytics.js';

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
      <div className="container-app pt-20 pb-28 md:pt-28 md:pb-36 text-center">
        <span className="badge badge-soft mb-6">🔥 Calcos premium · Resistentes al agua y al sol</span>

        <h1 className="font-display font-black text-4xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
          Elegí tus calcos, <br />
          <span style={{
            backgroundImage: 'linear-gradient(135deg,#FF1B8D 0%,#FF5A1F 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent'
          }}>uno por uno</span>
        </h1>

        <p className="mt-5 max-w-2xl mx-auto text-white/70 text-lg">
          Miles de diseños en 38 categorías. Elegís cada calco, su tamaño (4, 6 o 9 cm) y la cantidad.
          Desde 10 calcos, 10% off. Pagá online con Mercado Pago.
        </p>

        {/* Search card */}
        <form onSubmit={onSearch} className="mt-10 card-glass max-w-2xl mx-auto p-3 flex items-center gap-2">
          <span className="pl-3 text-white/50" aria-hidden>🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscá una categoría: anime, fútbol, memes…"
            className="flex-1 bg-transparent outline-none px-2 py-3 text-white placeholder:text-white/40"
            aria-label="Buscar categorías"
          />
          <button type="submit" className="btn-primary !py-3 !px-5">Buscar</button>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {quickTags.map((t) => (
            <button
              key={t.slug}
              onClick={() => navigate(`/categoria/${t.slug}`)}
              className="btn-ghost !text-white/70 border border-white/10 hover:border-white/20"
            >
              #{t.label}
            </button>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate('/categorias')} className="btn-primary">Ver categorías →</button>
          <button onClick={() => navigate('/personalizados')} className="btn-secondary">
            Personalizados
          </button>
        </div>
      </div>
    </section>
  );
}
