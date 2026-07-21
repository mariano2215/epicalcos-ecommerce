import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PackBuilder from '../components/PackBuilder.jsx';
import { WHOLESALE_QTY, WHOLESALE_DISCOUNT } from '../config/pricing.js';
import { useSeo } from '../lib/seo.js';

export default function Mayorista() {
  useSeo({
    title: 'Pack Mayorista',
    description:
      'Armá tu pack mayorista desde 100 calcos, eligiendo del catálogo o subiendo tus propios diseños. 50% de descuento en todos los tamaños. Pagás online con Mercado Pago.'
  });

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías', to: '/categorias' }, { name: 'Pack Mayorista' }]} />
        <div className="mt-6">
          <PackBuilder
            packType="mayorista"
            min={WHOLESALE_QTY}
            discount={WHOLESALE_DISCOUNT}
            defaultSize="4cm"
            allowCustom
            title="Pack Mayorista"
            subtitle="Elegí 100 calcos o más (del catálogo o con tus propios diseños), en un solo tamaño, y llevate un 50% de descuento. Aprovechá el 4 cm."
          />
        </div>
      </div>
    </div>
  );
}
