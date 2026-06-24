import Breadcrumbs from '../components/Breadcrumbs.jsx';
import NegocioForm from '../components/NegocioForm.jsx';
import { useSeo } from '../lib/seo.js';

export default function Negocio() {
  useSeo({
    title: 'Negocio',
    description:
      'Promo Negocio: 100 calcos de tu logo en 6 cm por $40.000. Ideal para bares, kioscos, marcas y emprendimientos. Pagás online con Mercado Pago.'
  });

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías', to: '/categorias' }, { name: 'Negocio' }]} />
        <div className="mt-6">
          <NegocioForm />
        </div>
      </div>
    </div>
  );
}
