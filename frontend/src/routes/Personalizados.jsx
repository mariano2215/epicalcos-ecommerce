import Breadcrumbs from '../components/Breadcrumbs.jsx';
import Configurador from '../components/personalizados/Configurador.jsx';
import { useSeo } from '../lib/seo.js';

export default function Personalizados() {
  useSeo({
    title: 'Personalizados',
    description:
      'Armá tu calco personalizado: elegí material, tamaño, corte y cantidad, subí tu diseño y ves el precio final antes de pagar. Producción en 2 a 3 días hábiles.'
  });

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías', to: '/categorias' }, { name: 'Personalizados' }]} />
        <div className="mt-6">
          <Configurador />
        </div>
      </div>
    </div>
  );
}
