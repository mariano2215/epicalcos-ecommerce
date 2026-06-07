import ProductCard from './ProductCard.jsx';

export default function ProductGrid({ products }) {
  if (!products || products.length === 0) {
    return (
      <div className="card-glass p-10 text-center text-white/70">
        No encontramos productos para esa búsqueda. Probá con otra categoría.
      </div>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
