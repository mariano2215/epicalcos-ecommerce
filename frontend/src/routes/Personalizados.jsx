import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PackBuilder from '../components/PackBuilder.jsx';
import { PERSONALIZADOS_MIN, PERSONALIZADOS_DISCOUNT } from '../config/pricing.js';
import { useSeo } from '../lib/seo.js';

export default function Personalizados() {
  useSeo({
    title: 'Personalizados',
    description:
      'Armá tu pack de calcos personalizados: elegí diseños del catálogo o sumá tus propios diseños. Mínimo 10 calcos, 10% off. Coordinás tu arte por WhatsApp.'
  });

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías', to: '/categorias' }, { name: 'Personalizados' }]} />
        <div className="mt-6">
          <PackBuilder
            packType="personalizados"
            min={PERSONALIZADOS_MIN}
            discount={PERSONALIZADOS_DISCOUNT}
            allowCustom
            title="Calcos Personalizados"
            subtitle="Elegí diseños del catálogo y/o sumá tus propios diseños. Mínimo 10 calcos, 10% off ya incluido. Los diseños propios los coordinás por WhatsApp."
          />
        </div>
      </div>
    </div>
  );
}
