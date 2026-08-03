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
      photo="/images/tatuajes.webp"
      badge="Novedad"
      breadcrumb="Tatuajes temporales"
      title="Tatuajes temporales"
      subtitle="Hoja de tatuajes temporales de aplicación con agua. Duran varios días y se quitan fácil. Subí tus diseños acá y van con el pedido, o mandalos por WhatsApp después de la compra."
      bullets={[
        'Precio por hoja completa de diseños.',
        'Hasta 10 diseños distintos por hoja.',
        'Aplicación con agua, sin dolor.',
        'Ideal para eventos, fiestas y regalos.'
      ]}
      specs={[
        { label: 'Material', value: 'Papel transfer' },
        { label: 'Duración', value: '3-5 días' },
        { label: 'Aplicación', value: 'Con agua' },
        { label: 'Producción', value: '2-3 días hábiles' },
      ]}
      upload={{
        titulo: 'Subí tus diseños',
        sustantivo: 'diseños',
        // 10 por hoja: si comprás más hojas, el cupo sube solo (perUnit × cantidad).
        perUnit: 10,
        tamanoCm: 6,
        // Preset propio de tatuajes → carpeta `tatuajes/` en Cloudinary. Si la env
        // no está seteada, `preset` es undefined y uploadService cae al preset
        // default (personalizados/): la subida sigue funcionando sin romperse.
        preset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_TATUAJES || undefined,
        descripcion:
          'PNG, JPG, PDF, SVG o AI, hasta 10 MB cada uno. Hasta 10 diseños por hoja; si comprás más de una hoja, el cupo sube solo. También podés mandarlos por WhatsApp después de pagar.'
      }}
    />
  );
}
