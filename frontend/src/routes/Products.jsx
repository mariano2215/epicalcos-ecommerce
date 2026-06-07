import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import CategoryFilter from '../components/CategoryFilter.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import { products as allProducts } from '../data/products.js';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const cat = params.get('cat') || 'todas';
  const q = (params.get('q') || '').toLowerCase().trim();

  const filtered = useMemo(() => {
    let list = cat === 'todas' ? allProducts : allProducts.filter((p) => p.category === cat);
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.categoryLabel.toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [cat, q]);

  const setCat = (slug) => {
    const next = new URLSearchParams(params);
    if (slug === 'todas') next.delete('cat');
    else next.set('cat', slug);
    setParams(next, { replace: true });
  };

  const setQ = (val) => {
    const next = new URLSearchParams(params);
    if (val) next.set('q', val);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-12">
        <header className="mb-8">
          <span className="badge badge-soft mb-3">Catálogo</span>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl">Todos los productos</h1>
          <p className="text-white/60 mt-3 max-w-xl">
            Stickers premium, packs personalizados, vinilos y polaroids. Pagás online con Mercado Pago.
          </p>
        </header>

        <div className="card-glass p-5 mb-8 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-white/50">🔎</span>
            <input
              defaultValue={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar productos…"
              className="flex-1 bg-transparent outline-none py-2 text-white placeholder:text-white/40"
            />
          </div>
          <CategoryFilter value={cat} onChange={setCat} />
        </div>

        <ProductGrid products={filtered} />
      </div>
    </div>
  );
}
