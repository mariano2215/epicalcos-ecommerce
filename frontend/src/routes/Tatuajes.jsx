import FixedProductPage from '../components/FixedProductPage.jsx';
import { TATUAJES } from '../config/pricing.js';
import { useSeo } from '../lib/seo.js';

export default function Tatuajes() {
  useSeo({
    title: 'Tatuajes temporales',
    description: 'Tatuajes temporales por hoja a $12.000. Pagás online con Mercado Pago.'
  });

  return (
    <FixedProductPage
      product={{ id: TATUAJES.id, name: TATUAJES.name, price: TATUAJES.price }}
      emoji="💉"
      badge="Novedad"
      breadcrumb="Tatuajes temporales"
      title="Tatuajes temporales"
      subtitle="Hoja de tatuajes temporales de aplicación con agua. Duran varios días y se quitan fácil."
      bullets={[
        'Precio por hoja completa de diseños.',
        'Aplicación con agua, sin dolor.',
        'Ideal para eventos, fiestas y regalos.'
      ]}
      specs={[
        { label: 'Material', value: 'Papel transfer' },
        { label: 'Duración', value: '3-5 días' },
        { label: 'Aplicación', value: 'Con agua' },
        { label: 'Producción', value: '2-3 días hábiles' },
      ]}
    />
  );
}
