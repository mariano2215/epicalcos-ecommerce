import Breadcrumbs from '../components/Breadcrumbs.jsx';
import ImprimiblesCard from '../components/ImprimiblesCard.jsx';
import { IMPRIMIBLE_PRINCIPAL } from '../config/pricing.js';
import { useSeo } from '../lib/seo.js';

/**
 * Foto de muestra del pack (una grilla con varios de los diseños incluidos).
 * Si el archivo no existe todavía, la card cae sola al emoji y no se rompe.
 */
const MUESTRA_SRC = '/images/imprimibles-muestra.webp';

/** Qué se lleva el cliente. Editable a mano: es la copy de venta de la página. */
const INCLUYE = [
  'Archivos en alta calidad, listos para mandar a imprimir.',
  'Los imprimís donde quieras, las veces que quieras.',
  'Te llegan por mail apenas se acredita el pago.',
  'Uso personal y también para vender tus propios stickers.'
];

export default function Imprimibles() {
  const pack = IMPRIMIBLE_PRINCIPAL;

  useSeo({
    title: 'Archivos imprimibles',
    description: `${pack.name} por ${new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(pack.price)}. Diseños listos para imprimir que recibís por mail — sin envío y sin esperar.`
  });

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs
          items={[
            { name: 'Inicio', to: '/' },
            { name: 'Categorías', to: '/categorias' },
            { name: 'Archivos imprimibles' }
          ]}
        />
        <div className="mt-6">
          <ImprimiblesCard pack={pack} photo={MUESTRA_SRC} incluye={INCLUYE} />
        </div>

        {/* Las dudas propias del producto digital. Las generales (envíos,
            materiales, plazos) viven en el FAQ del Home y no aplican acá. */}
        <section className="mt-10 max-w-3xl">
          <h2 className="font-display font-extrabold text-2xl mb-4">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {[
              {
                q: '¿Me mandan algo por correo?',
                a: 'No. Este producto son SOLO los archivos digitales: te llegan por mail a la casilla que dejes en el checkout. No hay envío ni costo de envío.'
              },
              {
                q: '¿Cuánto tarda en llegarme?',
                a: 'Pagando con Mercado Pago, apenas se acredita el pago. Si pagás por transferencia, te lo mandamos en cuanto recibimos el comprobante.'
              },
              {
                q: '¿Puedo imprimirlos y venderlos?',
                a: 'Sí. Podés imprimir los diseños y vender los stickers que hagas con ellos. Lo que no se puede es revender los archivos digitales tal cual.'
              },
              {
                q: '¿Y si no me llega el mail?',
                a: 'Revisá la carpeta de spam o promociones. Si no está, escribinos por WhatsApp con tu número de pedido y te lo reenviamos.'
              },
              {
                q: '¿Aplica algún descuento o cupón?',
                a: 'No. Es un precio fijo: los cupones y el descuento por transferencia solo valen para los calcos impresos.'
              }
            ].map(({ q, a }) => (
              <details key={q} className="card-glass p-5 group">
                <summary className="font-semibold cursor-pointer list-none flex items-center justify-between gap-3">
                  {q}
                  <span className="text-white/40 group-open:rotate-45 transition-transform" aria-hidden>+</span>
                </summary>
                <p className="text-white/65 text-sm mt-3">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
