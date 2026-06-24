import FixedProductPage from '../components/FixedProductPage.jsx';
import { POLAROID } from '../config/pricing.js';
import { useSeo } from '../lib/seo.js';

export default function Polaroid() {
  useSeo({
    title: 'Fotos Polaroid x10',
    description: 'Pack de 10 fotos estilo Polaroid a $10.000. Impresión premium. Pagás online con Mercado Pago.'
  });

  return (
    <FixedProductPage
      product={{ id: POLAROID.id, name: POLAROID.name, price: POLAROID.price }}
      emoji="📸"
      badge="Recuerdos"
      breadcrumb="Fotos Polaroid"
      title="Fotos Polaroid x10"
      subtitle="Pack de 10 fotos estilo Polaroid con tus imágenes. Las enviás por WhatsApp después de la compra."
      bullets={[
        '10 fotos estilo Polaroid por pack.',
        'Impresión premium con marco blanco.',
        'Ideales para regalar o decorar.'
      ]}
    />
  );
}
