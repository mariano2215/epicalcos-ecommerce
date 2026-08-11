import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PackBuilder from '../components/PackBuilder.jsx';
import { PromoCountdown, endLabel } from '../components/PromoBanner.jsx';
import { formatPrice } from '../context/CartContext.jsx';
import {
  WHOLESALE_QTY,
  WHOLESALE_DISCOUNT,
  PROMO_MAYORISTA_100,
  PROMO_MAYORISTA_END_MS
} from '../config/pricing.js';
import { useMayoristaPromoActive } from '../lib/promo.js';
import { useSeo } from '../lib/seo.js';

/** Cierre de la promo, derivado de `endsAt` (ej. "viernes 14/8"). */
const PROMO_END_LABEL = endLabel(PROMO_MAYORISTA_END_MS, 'que se agote');

export default function Mayorista() {
  const promoActive = useMayoristaPromoActive();

  useSeo({
    title: promoActive
      ? `Pack Mayorista · ${PROMO_MAYORISTA_100.qty} calcos a ${formatPrice(PROMO_MAYORISTA_100.price)}`
      : 'Pack Mayorista',
    description: promoActive
      ? `Promo por tiempo limitado: ${PROMO_MAYORISTA_100.qty} calcos a ${formatPrice(PROMO_MAYORISTA_100.price)}, eligiendo ${PROMO_MAYORISTA_100.qty} diseños distintos del catálogo o subiendo los tuyos. En 4 y 6 cm, hasta el ${PROMO_END_LABEL}. Pagás online con Mercado Pago.`
      : 'Armá tu pack mayorista desde 100 calcos, eligiendo del catálogo o subiendo tus propios diseños. 50% de descuento en todos los tamaños. Pagás online con Mercado Pago.'
  });

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías', to: '/categorias' }, { name: 'Pack Mayorista' }]} />

        {/* Promo por tiempo limitado: cartel + cuenta regresiva. Desaparece solo al vencer. */}
        {promoActive && (
          <div className="mt-6 card-glass p-5 md:p-6 border border-brand-fuchsia/30">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="badge badge-hot mb-2">Promo por tiempo limitado</span>
                <h2 className="font-display font-extrabold text-2xl md:text-3xl">
                  {PROMO_MAYORISTA_100.qty} calcos a{' '}
                  <span className="gradient-text">{formatPrice(PROMO_MAYORISTA_100.price)}</span>
                </h2>
                <p className="text-white/70 text-sm mt-1.5 max-w-xl">
                  Podés elegir{' '}
                  <strong className="text-white">{PROMO_MAYORISTA_100.qty} diseños distintos</strong> del catálogo,
                  subir los tuyos, o mezclar. Solo en <strong className="text-white">4 y 6 cm</strong> —
                  el 9 cm queda fuera de la promo. Hasta el {PROMO_END_LABEL} a las 23:59.
                </p>
              </div>
              <div className="shrink-0">
                <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1.5 text-center">
                  Termina en
                </div>
                <PromoCountdown endMs={PROMO_MAYORISTA_END_MS} />
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <PackBuilder
            packType="mayorista"
            min={WHOLESALE_QTY}
            discount={WHOLESALE_DISCOUNT}
            defaultSize="4cm"
            allowCustom
            promo={{ active: promoActive, ...PROMO_MAYORISTA_100 }}
            title="Pack Mayorista"
            subtitle={
              promoActive
                ? `Elegí ${PROMO_MAYORISTA_100.qty} calcos (del catálogo o con tus propios diseños) en 4 o 6 cm y pagás ${formatPrice(PROMO_MAYORISTA_100.price)}. Promo hasta el ${PROMO_END_LABEL}.`
                : 'Elegí 100 calcos o más (del catálogo o con tus propios diseños), en un solo tamaño, y llevate un 50% de descuento. Aprovechá el 4 cm.'
            }
          />
        </div>
      </div>
    </div>
  );
}
