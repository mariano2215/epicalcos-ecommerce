import Breadcrumbs from '../components/Breadcrumbs.jsx';
import MarcasConfiaron from '../components/MarcasConfiaron.jsx';
import NegocioForm from '../components/NegocioForm.jsx';
import { useSeo } from '../lib/seo.js';

export default function Negocio() {
  useSeo({
    title: 'Negocio',
    description:
      'Promo Negocio: 100 calcos de tu logo en 6 cm por $39.999 (antes $96.999). Ideal para bares, kioscos, marcas y emprendimientos. Pagás online con Mercado Pago.'
  });

  return (
    <div className="page-gradient min-h-screen">
      {/* La prueba social va PRIMERO acá, al revés que en el Home, que la
          muestra al final. A esta página se llega desde un anuncio y sin
          conocer la marca: el que está evaluando encargar 100 calcos de su
          logo necesita ver quiénes ya lo hicieron ANTES que el formulario.
          Es la única diferencia de orden entre las dos páginas que usan el
          componente. */}
      <MarcasConfiaron />

      {/* `pb-10` y no `py-10`: la sección de marcas ya trae su propio espacio
          abajo, y con los dos el formulario quedaba flotando. */}
      <div className="container-app pb-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías', to: '/categorias' }, { name: 'Negocio' }]} />
        <div className="mt-6">
          <NegocioForm />
        </div>
      </div>
    </div>
  );
}
