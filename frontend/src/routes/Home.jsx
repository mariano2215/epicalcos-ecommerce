import { Link, useNavigate } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import Benefits from '../components/Benefits.jsx';
import HowToBuy from '../components/HowToBuy.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import FAQ from '../components/FAQ.jsx';
import { categories, getFeaturedProducts } from '../data/products.js';
import { useSeo } from '../lib/seo.js';

export default function Home() {
  const navigate = useNavigate();
  const featured = getFeaturedProducts();

  useSeo({
    title: undefined, // usa el default
    description: undefined
  });

  return (
    <>
      <Hero />
      <Benefits />

      {/* Categorías */}
      <section className="py-10">
        <div className="container-app">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="badge badge-soft mb-2">Explorá</span>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl">Categorías</h2>
            </div>
            <Link to="/productos" className="btn-ghost hidden sm:inline-flex">Ver todas →</Link>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {categories.filter((c) => c.slug !== 'todas').slice(0, 10).map((c, i) => (
              <button
                key={c.slug}
                onClick={() => navigate(`/categoria/${c.slug}`)}
                className="card-glass card-glass-hover p-5 text-left"
              >
                <div className="text-2xl mb-2">{['🎌','⚽','🎬','🎨','📸','🪧','🏷️','🚗','💬','✨'][i] || '✨'}</div>
                <div className="font-semibold">{c.name}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Destacados */}
      <section className="py-14">
        <div className="container-app">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="badge badge-soft mb-2">Top picks</span>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl">Productos destacados</h2>
            </div>
            <Link to="/productos" className="btn-ghost hidden sm:inline-flex">Ver todos →</Link>
          </div>
          <ProductGrid products={featured} />
        </div>
      </section>

      {/* Banner comercial */}
      <section className="py-10">
        <div className="container-app">
          <div className="card-glass p-8 md:p-10 text-center relative overflow-hidden"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgba(58,134,255,.35), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,27,141,.35), transparent 50%), rgba(32,32,32,.82)'
            }}>
            <span className="badge badge-hot mb-3">Envío gratis</span>
            <h3 className="font-display font-extrabold text-2xl md:text-4xl">
              Envío gratis en Rosario desde $50.000
            </h3>
            <p className="text-white/70 mt-3 max-w-xl mx-auto">
              También coordinamos envíos a otras zonas. Elegí tus productos, pagá online y coordinamos la entrega.
            </p>
            <Link to="/productos" className="btn-primary mt-6 inline-flex">Ver productos</Link>
          </div>
        </div>
      </section>

      <HowToBuy />

      {/* Personalizados */}
      <section className="py-14">
        <div className="container-app grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <span className="badge badge-new mb-3">Personalizados</span>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl">
              ¿Querés calcos con tu diseño?
            </h2>
            <p className="text-white/70 mt-4 max-w-lg">
              Subí o envianos tu logo, frase, foto o referencia y armamos tus calcos personalizadas.
              Ideal para emprendimientos, regalos, termos, notebooks, autos y motos.
            </p>
            <Link to="/productos?cat=personalizadas" className="btn-primary mt-6 inline-flex">
              Ver productos personalizados
            </Link>
          </div>
          <div className="card-glass p-6 grid grid-cols-2 gap-3">
            {[
              { t: 'Logos', e: '🏷️' },
              { t: 'Frases', e: '💬' },
              { t: 'Fotos', e: '📸' },
              { t: 'Diseño a medida', e: '🎨' }
            ].map((x) => (
              <div key={x.t} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-2xl mb-1">{x.e}</div>
                <div className="font-semibold">{x.t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FAQ />
    </>
  );
}
