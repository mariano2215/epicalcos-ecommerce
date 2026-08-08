import { useSearchParams, Navigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PackBuilder from '../components/PackBuilder.jsx';
import PackCard from '../components/PackCard.jsx';
import SocialProof from '../components/SocialProof.jsx';
import ShippingInfo from '../components/ShippingInfo.jsx';
import { formatPrice } from '../context/CartContext.jsx';
import {
  DEFAULT_SIZE,
  BULK_THRESHOLD,
  BULK_DISCOUNT,
  WHOLESALE_QTY,
  WHOLESALE_DISCOUNT,
  PROMO_MAYORISTA_100,
  priceForSize,
  round
} from '../config/pricing.js';
import { useMayoristaPromoActive } from '../lib/promo.js';
import { useSeo } from '../lib/seo.js';

/**
 * "Armá tu pack" — el escalón que faltaba entre comprar 1 calco y el mayorista
 * de 100.
 *
 * DECISIÓN IMPORTANTE: los packs x10/x20/x50 NO son una regla de precio nueva.
 * Son una forma guiada de elegir varios diseños de una, y van al carrito como
 * calcos SUELTAS (`emit="stickers"`). El descuento que muestran es el 10 % por
 * transferencia desde 10 calcos que YA existe. Inventar un "precio de pack"
 * habría obligado a agregar un tipo de línea al espejo
 * frontend/src/config/pricing.js ↔ netlify/functions/lib/pricing.js — y a
 * inventar porcentajes que nadie definió.
 *
 * El x100 sí tiene regla propia (mayorista 50 % off, o la promo por fecha), así
 * que su tarjeta manda a /mayorista, que es donde vive ese armador.
 */
const TAMANOS_PACK = [10, 20, 50];

export default function ArmaTuPack() {
  const [params] = useSearchParams();
  const promoMayorista = useMayoristaPromoActive();

  const n = parseInt(params.get('n') || '', 10);
  const packElegido = TAMANOS_PACK.includes(n) ? n : null;

  const unit = priceForSize(DEFAULT_SIZE);
  const unitConDescuento = round(unit * (1 - BULK_DISCOUNT));

  useSeo({
    title: packElegido ? `Armá tu pack x${packElegido}` : 'Armá tu pack',
    description: packElegido
      ? `Elegí ${packElegido} calcos del catálogo en un solo tamaño y pagalas juntas. Desde ${BULK_THRESHOLD} calcos, 10% off pagando por transferencia. Envíos a todo el país.`
      : `Elegí de a 10, 20, 50 o 100 calcos y armá tu pack con los diseños que quieras. Desde ${BULK_THRESHOLD} calcos, 10% off pagando por transferencia.`
  });

  // ?n=100 no tiene armador propio: el pack de 100 vive en /mayorista, que ya
  // tiene su regla de precio en el servidor. Va DESPUÉS de los hooks: un return
  // antes de `useSeo` cambiaría la cantidad de hooks entre renders.
  if (n === WHOLESALE_QTY) return <Navigate to="/mayorista" replace />;

  if (packElegido) {
    return (
      <div className="page-gradient min-h-screen">
        <div className="container-app py-10">
          <Breadcrumbs
            items={[
              { name: 'Inicio', to: '/' },
              { name: 'Armá tu pack', to: '/armar-pack' },
              { name: `Pack x${packElegido}` }
            ]}
          />
          <div className="mt-6">
            <PackBuilder
              packType="catalogo"
              emit="stickers"
              packSizeLabel={`x${packElegido}`}
              target={packElegido}
              discount={BULK_DISCOUNT}
              title={`Armá tu pack x${packElegido}`}
              subtitle={`Elegí ${packElegido} calcos del catálogo —podés repetir diseños— en un solo tamaño. Pagando por transferencia bancaria te llevás un 10% off.`}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Armá tu pack' }]} />

        <header className="mt-6 mb-8 max-w-2xl">
          <span className="badge badge-soft mb-3">Comprá de a varias</span>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl">
            <span className="gradient-text">Armá tu pack</span>
          </h1>
          <p className="text-white/65 mt-3">
            Elegí cuántas calcos querés, después los diseños. Podés mezclar categorías y repetir el
            mismo diseño las veces que quieras. Desde {BULK_THRESHOLD} calcos,{' '}
            <strong className="text-white">10% off pagando por transferencia bancaria</strong>.
          </p>
        </header>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <PackCard
            qty={10}
            size={DEFAULT_SIZE}
            label="Para empezar"
            tagline="El mínimo para que arranque el descuento por volumen."
            to="/armar-pack?n=10"
          />
          <PackCard
            qty={20}
            size={DEFAULT_SIZE}
            label="Más variedad"
            tagline="Alcanza para llenar la notebook y el termo, y regalar algunas."
            to="/armar-pack?n=20"
            destacado
          />
          <PackCard
            qty={50}
            size={DEFAULT_SIZE}
            label="Para fanáticos"
            tagline="Cincuenta diseños distintos, o los que más te gustan repetidos."
            to="/armar-pack?n=50"
          />
          {/* El x100 tiene regla propia en el servidor: mayorista 50% off, o la
              promo de precio fijo mientras esté vigente. */}
          <PackCard
            qty={WHOLESALE_QTY}
            size={promoMayorista ? PROMO_MAYORISTA_100.sizes[1] : DEFAULT_SIZE}
            label={promoMayorista ? 'Promo mayorista' : 'Mayorista'}
            tagline={
              promoMayorista
                ? 'Cien calcos a precio fijo. Solo en 4 y 6 cm, por tiempo limitado.'
                : 'El mejor precio por calco. Para revender o para tu negocio.'
            }
            to="/mayorista"
            // Sin promo, el mayorista NO es el 10 % por volumen: es 50 % off, y
            // el precio se arma igual que en el servidor
            // (netlify/functions/lib/pricing.js → pack:mayorista).
            precioFijo={
              promoMayorista
                ? PROMO_MAYORISTA_100.price
                : round(priceForSize(DEFAULT_SIZE) * (1 - WHOLESALE_DISCOUNT)) * WHOLESALE_QTY
            }
            nota={
              promoMayorista
                ? 'Precio fijo de la promo, sin condición de medio de pago.'
                : 'Descuento mayorista, sin condición de medio de pago.'
            }
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <SocialProof index={1} />
          <ShippingInfo />
        </div>

        <p className="text-sm text-white/50 mt-6">
          ¿Preferís elegir de a uno? Andá al{' '}
          <a href="/categorias" className="underline decoration-white/30 hover:decoration-white">
            catálogo completo
          </a>
          . El precio por calco suelto es {formatPrice(unit)} en {DEFAULT_SIZE.replace('cm', ' cm')} —
          y desde {BULK_THRESHOLD}, {formatPrice(unitConDescuento)} pagando por transferencia.
        </p>
      </div>
    </div>
  );
}
