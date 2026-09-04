import { Link } from 'react-router-dom';
import Reveal from './Reveal.jsx';
import { formatPrice } from '../lib/formato.js';
import { SPECIALS } from '../data/categories.js';
import {
  WHOLESALE_QTY,
  WHOLESALE_DISCOUNT,
  BULK_THRESHOLD,
  PROMO_MAYORISTA_100
} from '../config/pricing.js';
import { useMayoristaPromoActive } from '../lib/promo.js';
import { trackWholesaleClick } from '../lib/analytics.js';

/** Slugs que se listan como "además del catálogo", en orden. */
const OTROS = ['tatuajes', 'polaroid', 'archivos-imprimibles'];

/**
 * UNA oferta. La principal.
 *
 * Acá había dos bloques distintos peleando: una grilla de cuatro cards con
 * emoji gigante ("Packs y servicios": mayorista, imprimibles, tatuajes,
 * polaroid, todos con el mismo peso visual) y, más abajo, un banner con
 * degradado que anunciaba a la vez el 10 % por transferencia Y el mayorista con
 * 50 %. Sumado a la card de promo del hero y a las siete frases del ticker, la
 * Home ofrecía media docena de descuentos al mismo tiempo: la persona no elige,
 * se satura y sigue de largo.
 *
 * Ahora hay una sola oferta dominante —el pack mayorista, que es el de mayor
 * ticket— y el 10 % por transferencia baja a una línea de apoyo, que es el
 * lugar que le corresponde: es un beneficio del CARRITO, no un motivo para
 * entrar. Donde de verdad empuja es en el carrito, y ahí ya vive (`BulkProgress`).
 *
 * Los otros productos (tatuajes, polaroid, imprimibles) no desaparecen: quedan
 * como links de texto. No son promociones y no tienen por qué competir con una.
 *
 * ⚠️ Ni un número escrito a mano: cantidad, porcentaje y precio salen de
 * `config/pricing.js`, que está espejado en el servidor.
 */
export default function OfertaPrincipal() {
  const promoActiva = useMayoristaPromoActive();
  const otros = OTROS.map((slug) => SPECIALS.find((s) => s.slug === slug)).filter(Boolean);

  return (
    <section className="seccion">
      <div className="container-app">
        <Reveal>
          <div
            className="card-glass p-8 md:p-12 text-center relative overflow-hidden"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgba(58,134,255,.35), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,27,141,.35), transparent 50%), rgba(32,32,32,.82)'
            }}
          >
            {promoActiva ? (
              <>
                <span className="badge badge-hot mb-4">Por tiempo limitado</span>
                <h2 className="font-display font-black text-3xl md:text-6xl leading-[1.02]">
                  {PROMO_MAYORISTA_100.qty} calcos a{' '}
                  <span className="gradient-text">{formatPrice(PROMO_MAYORISTA_100.price)}</span>
                </h2>
                <p className="text-white/75 mt-4 max-w-lg mx-auto">
                  {PROMO_MAYORISTA_100.subtitulo}. Ideal para negocios, eventos, regalos o revender.
                </p>
              </>
            ) : (
              <>
                <span className="badge badge-soft mb-4">Pack mayorista</span>
                <h2 className="font-display font-black text-3xl md:text-6xl leading-[1.02]">
                  Desde {WHOLESALE_QTY} calcos,{' '}
                  <span className="gradient-text">{Math.round(WHOLESALE_DISCOUNT * 100)}% OFF</span>
                </h2>
                <p className="text-white/75 mt-4 max-w-lg mx-auto">
                  En todos los tamaños, eligiendo los diseños que quieras. Ideal para negocios,
                  eventos, regalos o revender.
                </p>
              </>
            )}

            <div className="mt-8">
              <Link
                to="/mayorista"
                onClick={() => trackWholesaleClick('oferta_principal')}
                className="btn-primary"
              >
                Ver el pack x{WHOLESALE_QTY}
              </Link>
            </div>

            {/* El 10 % NUNCA a secas: siempre con sus dos condiciones. Es el
                error que ya se cometió en /categorias con "10% off automático",
                que el cliente descubría recién al elegir medio de pago. */}
            <p className="mt-6 text-sm text-white/55">
              ¿Menos cantidad? Desde {BULK_THRESHOLD} calcos tenés{' '}
              <strong className="text-white/80">10% OFF pagando por transferencia</strong>.
            </p>
          </div>
        </Reveal>

        {otros.length > 0 && (
          <p className="mt-6 text-center text-sm text-white/45">
            También hacemos{' '}
            {otros.map((s, i) => (
              <span key={s.slug}>
                {i > 0 && (i === otros.length - 1 ? ' y ' : ', ')}
                <Link to={s.to} className="text-white/75 underline underline-offset-4 hover:text-white">
                  {s.name.toLowerCase()}
                </Link>
              </span>
            ))}
            .
          </p>
        )}
      </div>
    </section>
  );
}
