import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackSearch } from '../lib/analytics.js';

const quickTags = ['Anime', 'Fútbol', 'Series', 'Personalizadas', 'Polaroids'];

export default function Hero() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const onSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (term) trackSearch(term);
    const params = new URLSearchParams();
    if (term) params.set('q', term);
    navigate(`/productos${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <section className="hero-gradient relative">
      <div className="container-app pt-20 pb-28 md:pt-28 md:pb-36 text-center">
        <span className="badge badge-soft mb-6">🔥 Stickers premium · Resistentes al agua y al sol</span>

        <h1 className="font-display font-black text-4xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
          Calcos premium para <br />
          <span style={{
            backgroundImage: 'linear-gradient(135deg,#FF1B8D 0%,#FF5A1F 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent'
          }}>personalizar</span> lo que quieras
        </h1>

        <p className="mt-5 max-w-2xl mx-auto text-white/70 text-lg">
          Stickers resistentes al agua y al sol, packs temáticos, diseños personalizados y producción
          propia en Rosario. Pagá online con Mercado Pago.
        </p>

        {/* Search card */}
        <form onSubmit={onSearch} className="mt-10 card-glass max-w-2xl mx-auto p-3 flex items-center gap-2">
          <span className="pl-3 text-white/50" aria-hidden>🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscá tus calcos favoritas..."
            className="flex-1 bg-transparent outline-none px-2 py-3 text-white placeholder:text-white/40"
            aria-label="Buscar productos"
          />
          <button type="submit" className="btn-primary !py-3 !px-5">Buscar</button>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {quickTags.map((t) => (
            <button
              key={t}
              onClick={() => navigate(`/productos?q=${encodeURIComponent(t)}`)}
              className="btn-ghost !text-white/70 border border-white/10 hover:border-white/20"
            >
              #{t}
            </button>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate('/productos')} className="btn-primary">Ver productos →</button>
          <button onClick={() => navigate('/productos?cat=personalizadas')} className="btn-secondary">
            Personalizados
          </button>
        </div>
      </div>
    </section>
  );
}
