import FixedProductPage from '../components/FixedProductPage.jsx';
import {
  POLAROID,
  POLAROID_SIZES,
  POLAROID_FOTOS_POR_PACK,
  POLAROID_VOLUMEN_MIN_PACKS,
  POLAROID_VOLUMEN_OFF_POR_FOTO,
  polaroidProductId,
  precioPolaroidLista,
  precioPolaroidPack
} from '../config/pricing.js';
import { trackPolaroidMaterial } from '../lib/analytics.js';
import { useSeo } from '../lib/seo.js';

/**
 * Id de la opción imantada del selector de material. Es el valor que viaja al
 * dataLayer y el que decide el `-iman` del id de la línea: si lo cambiás acá,
 * se corta la serie histórica del evento `polaroid_material`.
 */
const IMANTADAS = 'imantadas';
const esIman = (variantId) => variantId === IMANTADAS;

/** Fotos que entran en N packs — lo que el cliente cuenta, que no son packs sino fotos. */
const fotos = (packs) => packs * POLAROID_FOTOS_POR_PACK;
const FOTOS_MIN_VOLUMEN = fotos(POLAROID_VOLUMEN_MIN_PACKS);

export default function Polaroid() {
  useSeo({
    title: 'Fotos Polaroid x10',
    description:
      'Pack de 10 fotos estilo Polaroid desde $9.000, en 3 tamaños y con opción imantadas. Desde 20 fotos, más barato. Pagás online con Mercado Pago.'
  });

  // `pricing` le pasa a la ficha las cuatro cosas que necesita saber del precio,
  // y las cuatro salen de config/pricing.js — que es donde están espejadas
  // contra el servidor. La ficha no calcula nada por su cuenta a propósito: si
  // lo hiciera, sería un tercer lugar donde el precio puede quedar distinto del
  // que el checkout va a revalidar, y ahí el cliente se come un price_mismatch.
  return (
    <FixedProductPage
      product={{ id: POLAROID.id, name: POLAROID.name, price: POLAROID.price }}
      sizes={POLAROID_SIZES}
      variants={{
        label: 'Terminación',
        options: [
          { id: 'comunes', label: 'Comunes', hint: 'Papel fotográfico mate' },
          { id: IMANTADAS, label: 'Imantadas', hint: '+$600 por foto · van a la heladera' }
        ]
      }}
      pricing={{
        listPrice: (sizeId, variantId) => precioPolaroidLista(polaroidProductId(sizeId, esIman(variantId))),
        unitPrice: (sizeId, variantId, packs) => precioPolaroidPack(sizeId, esIman(variantId), packs),
        productId: (sizeId, variantId) => polaroidProductId(sizeId, esIman(variantId)),
        lineName: ({ size, variant }) => `${POLAROID.name} · ${size.label} · ${variant.label}`,
        aviso: (packs) =>
          packs >= POLAROID_VOLUMEN_MIN_PACKS
            ? `Llevás ${fotos(packs)} fotos: $${POLAROID_VOLUMEN_OFF_POR_FOTO} menos en cada una.`
            : `Desde ${FOTOS_MIN_VOLUMEN} fotos, $${POLAROID_VOLUMEN_OFF_POR_FOTO} menos por foto.`
      }}
      nota={`El precio es por el pack de ${POLAROID_FOTOS_POR_PACK} fotos. Desde ${FOTOS_MIN_VOLUMEN}, $${POLAROID_VOLUMEN_OFF_POR_FOTO} menos por foto.`}
      onVariantChange={(variantId, sizeId) => trackPolaroidMaterial(variantId, sizeId)}
      emoji="📸"
      photo="/images/polaroid.webp"
      badge="Recuerdos"
      breadcrumb="Fotos Polaroid"
      title="Fotos Polaroid x10"
      subtitle="Pack de 10 fotos estilo Polaroid con tus imágenes, en papel o imantadas. Subí tus fotos acá y van con el pedido, o mandalas por WhatsApp después de la compra."
      bullets={[
        '10 fotos estilo Polaroid por pack.',
        'Impresión premium con marco blanco.',
        'Versión imantada: se pegan en la heladera.',
        `Desde ${FOTOS_MIN_VOLUMEN} fotos, $${POLAROID_VOLUMEN_OFF_POR_FOTO} menos por foto.`
      ]}
      specs={[
        { label: 'Cantidad', value: '10 fotos' },
        { label: 'Papel', value: 'Fotográfico mate' },
        { label: 'Terminación', value: 'Común o imantada' },
        { label: 'Producción', value: '2-3 días hábiles' },
      ]}
      upload={{
        titulo: 'Subí tus fotos',
        sustantivo: 'fotos',
        formatos: ['png', 'jpg', 'jpeg'],
        perUnit: POLAROID_FOTOS_POR_PACK,
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
