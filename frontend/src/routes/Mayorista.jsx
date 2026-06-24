import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PackBuilder from '../components/PackBuilder.jsx';
import { WHOLESALE_QTY, WHOLESALE_DISCOUNT } from '../config/pricing.js';
import { useSeo } from '../lib/seo.js';

export default function Mayorista() {
  useSeo({
    title: 'Pack Mayorista x100',
    description:
      'Armá tu pack mayorista de 100 calcos eligiendo del catálogo (podés incluir diseños propios). 25% de descuento. Pagás online con Mercado Pago.'
  });

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías', to: '/categorias' }, { name: 'Pack Mayorista x100' }]} />
        <div className="mt-6">
          <PackBuilder
            packType="mayorista"
            target={WHOLESALE_QTY}
            discount={WHOLESALE_DISCOUNT}
            allowCustom
            title="Pack Mayorista x100"
            subtitle="Elegí 100 calcos del catálogo (podés incluir diseños propios) en un solo tamaño y llevate un 25% de descuento."
          />
        </div>
      </div>
    </div>
  );
}
