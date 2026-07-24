import FixedProductPage from '../components/FixedProductPage.jsx';
import { POLAROID, POLAROID_SIZES } from '../config/pricing.js';
import { useSeo } from '../lib/seo.js';

export default function Polaroid() {
  useSeo({
    title: 'Fotos Polaroid x10',
    description: 'Pack de 10 fotos estilo Polaroid desde $9.000 en 3 tamaños. Impresión premium. Pagás online con Mercado Pago.'
  });

  return (
    <FixedProductPage
      product={{ id: POLAROID.id, name: POLAROID.name, price: POLAROID.price }}
      sizes={POLAROID_SIZES}
      emoji="📸"
      photo="/images/polaroid.webp"
      badge="Recuerdos"
      breadcrumb="Fotos Polaroid"
      title="Fotos Polaroid x10"
      subtitle="Pack de 10 fotos estilo Polaroid con tus imágenes. Subí tus fotos acá y van con el pedido, o mandalas por WhatsApp después de la compra."
      bullets={[
        '10 fotos estilo Polaroid por pack.',
        'Impresión premium con marco blanco.',
        'Ideales para regalar o decorar.'
      ]}
      specs={[
        { label: 'Cantidad', value: '10 fotos' },
        { label: 'Papel', value: 'Fotográfico mate' },
        { label: 'Producción', value: '2-3 días hábiles' },
      ]}
      upload={{
        titulo: 'Subí tus fotos',
        sustantivo: 'fotos',
        formatos: ['png', 'jpg', 'jpeg'],
        perUnit: 10,
        tamanoCm: 10,
        // Preset propio de Polaroid → carpeta `polaroid/` en Cloudinary. Si la env
        // no está seteada, `preset` es undefined y uploadService cae al preset
        // default (personalizados/): la subida sigue funcionando sin romperse.
        preset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_POLAROID || undefined,
        descripcion:
          'PNG o JPG, hasta 10 MB cada una. Subí hasta 10 fotos por pack; si comprás más de un pack, el cupo sube solo. También podés mandarlas por WhatsApp después de pagar.'
      }}
    />
  );
}
