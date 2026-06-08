import { useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { categories, getProductsByCategory } from '../data/products.js';
import { useSeo, breadcrumbJsonLd } from '../lib/seo.js';

export default function Category() {
  const { slug } = useParams();
  const category = categories.find((c) => c.slug === slug);

  const products = useMemo(() => getProductsByCategory(slug), [slug]);

  // SEO siempre antes de cualquier return condicional
  useSeo({
    title: category ? `${category.name} · Stickers premium` : 'Categoría',
    description: category
      ? `Stickers y calcos de ${category.name.toLowerCase()} en Rosario. Vinilo premium resistente al agua y al sol. Pagá online con Mercado Pago.`
      : undefined,
    jsonLd: category
      ? breadcrumbJsonLd([
          { name: 'Inicio', url: '/' },
          { name: 'Tienda', url: '/productos' },
          { name: category.name, url: `/categoria/${slug}` }
        ])
      : undefined
  });

  if (!category || category.slug === 'todas') {
    return <Navigate to="/productos" replace />;
  }

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs
          items={[
            { name: 'Inicio', to: '/' },
            { name: 'Tienda', to: '/productos' },
            { name: category.name }
          ]}
        />

        <header className="mb-8">
          <span className="badge badge-soft mb-3">Categoría</span>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl">{category.name}</h1>
          <p className="text-white/60 mt-3 max-w-xl">
            {products.length} {products.length === 1 ? 'producto' : 'productos'} en esta categoría.
          </p>
        </header>

        <div className="mb-8 flex flex-wrap gap-2">
          {categories
            .filter((c) => c.slug !== 'todas')
            .map((c) => (
              <Link
                key={c.slug}
                to={`/categoria/${c.slug}`}
                className={
                  c.slug === slug
                    ? 'btn-primary !py-2 !px-4 text-sm'
                    : 'btn-secondary !py-2 !px-4 text-sm'
                }
              >
                {c.name}
              </Link>
            ))}
        </div>

        <ProductGrid products={products} />
      </div>
    </div>
  );
}
