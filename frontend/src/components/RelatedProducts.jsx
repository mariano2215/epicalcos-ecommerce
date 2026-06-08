import { products as all } from '../data/products.js';
import ProductCard from './ProductCard.jsx';

/**
 * Muestra hasta 4 productos relacionados (misma categoría, excluyendo el actual).
 * Si no hay suficientes, completa con destacados.
 */
export default function RelatedProducts({ currentProduct }) {
  const sameCat = all.filter(
    (p) => p.category === currentProduct.category && p.id !== currentProduct.id
  );
  const featured = all.filter(
    (p) => p.featured && p.id !== currentProduct.id && !sameCat.find((s) => s.id === p.id)
  );
  const related = [...sameCat, ...featured].slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between mb-6">
        <h2 className="font-display font-extrabold text-2xl md:text-3xl">También te puede gustar</h2>
      </div>
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
