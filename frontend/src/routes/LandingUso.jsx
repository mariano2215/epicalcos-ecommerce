import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import StickerCard from '../components/StickerCard.jsx';
import SizePicker from '../components/SizePicker.jsx';
import DiscountNote from '../components/DiscountNote.jsx';
import ShippingInfo from '../components/ShippingInfo.jsx';
import SizeGuide from '../components/SizeGuide.jsx';
import SocialProof from '../components/SocialProof.jsx';
import TrustBadges from '../components/TrustBadges.jsx';
import Reveal from '../components/Reveal.jsx';
import { getLanding } from '../config/landings.js';
import { categoryName } from '../data/categories.js';
import { formatPrice } from '../context/CartContext.jsx';
import { priceForSize, sizeLabel, BULK_THRESHOLD } from '../config/pricing.js';
import { useSeo } from '../lib/seo.js';
import { trackViewItemList } from '../lib/analytics.js';

/**
 * Landing por caso de uso (/calcos-termo, /calcos-notebook, /calcos-auto).
 *
 * Sigue la estructura del §40 del plan reutilizando los componentes que ya
 * existen —TrustBadges, SizeGuide, ShippingInfo, DiscountNote, SocialProof,
 * StickerCard— en vez de duplicar bloques nuevos. Lo único propio de cada
 * landing es el copy y qué diseños muestra, y eso vive en config/landings.js.
 *
 * Los diseños son REALES: se bajan los manifests de las categorías configuradas
 * y se arma una grilla mezclada. Nada de mockups.
 */
const POR_CATEGORIA = 4; // diseños que tomamos de cada categoría configurada

/**
 * `slug` llega por prop desde App.jsx: cada landing tiene su ruta literal
 * (/calcos-termo, …) en vez de un `/:slug` que se tragaría cualquier URL.
 */
export default function LandingUso({ slug }) {
  const landing = getLanding(slug);
  const [porCategoria, setPorCategoria] = useState(null);

  const unit = priceForSize(landing?.tamanoRecomendado || '6cm');

  useSeo({
    title: landing?.h1,
    description: landing
      ? `${landing.promesa} Vinilo premium resistente al agua y al sol, desde ${formatPrice(unit)}. Envíos a todo el país y retiro en Rosario.`
      : undefined,
    jsonLd: landing
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: landing.faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a }
          }))
        }
      : undefined
  });

  useEffect(() => {
    if (!landing) return;
    let vivo = true;
    Promise.all(
      landing.categorias.map((cat) =>
        fetch(`/data/${cat}.json`)
          .then((r) => (r.ok ? r.json() : []))
          .then((list) =>
            (Array.isArray(list) ? list : []).slice(0, POR_CATEGORIA).map((it) => {
              const n = String(it.id).split('-').pop();
              return {
                id: it.id,
                sku: it.sku,
                image: it.file,
                name: `${categoryName(cat)} #${n}`,
                category: cat,
                categoryLabel: categoryName(cat)
              };
            })
          )
          .catch(() => [])
      )
    ).then((listas) => {
      if (vivo) setPorCategoria(listas);
    });
    return () => {
      vivo = false;
    };
  }, [landing]);

  /** Mezcla intercalando categorías para que la grilla no quede por bloques. */
  const disenos = useMemo(() => {
    if (!porCategoria) return [];
    const out = [];
    for (let i = 0; i < POR_CATEGORIA; i++) {
      for (const lista of porCategoria) if (lista[i]) out.push(lista[i]);
    }
    return out;
  }, [porCategoria]);

  useEffect(() => {
    if (disenos.length) trackViewItemList(disenos.map((d) => ({ ...d, price: unit })), `Landing ${slug}`, slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disenos.length, slug]);

  if (!landing) return <Navigate to="/categorias" replace />;

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs
          items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías', to: '/categorias' }, { name: landing.h1 }]}
        />

        {/* 1-2. Hero específico + promesa (message match con el anuncio) */}
        <header className="mt-6 mb-8 max-w-2xl">
          <div className="text-5xl mb-3" aria-hidden>{landing.emoji}</div>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl">
            <span className="gradient-text">{landing.h1}</span>
          </h1>
          <p className="text-white/70 mt-3 text-lg">{landing.promesa}</p>
          <p className="text-white/55 mt-2">
            Desde <strong className="text-white">{formatPrice(unit)}</strong> por calco.{' '}
            {BULK_THRESHOLD} o más, 10% off pagando por transferencia bancaria.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#disenos" className="btn-primary">Ver diseños</a>
            <Link to="/personalizados" className="btn-secondary">Mandar el mío</Link>
          </div>
          <TrustBadges className="mt-5 !justify-start" />
        </header>

        {/* 3. Qué tamaño — la duda propia de cada uso */}
        <section className="card-glass p-5 md:p-6 mb-8">
          <h2 className="font-display font-extrabold text-xl">
            ¿Qué tamaño le va mejor?
          </h2>
          <p className="text-white/70 mt-2 max-w-2xl">
            Para esto recomendamos el de{' '}
            <strong className="text-white">{sizeLabel(landing.tamanoRecomendado)}</strong>. {landing.tamanoPorQue}
          </p>
          {/* Abierta siempre: toda esta sección ES la respuesta al tamaño.
              Fuera del A/B a propósito, para no ensuciar la muestra de la ficha. */}
          <SizeGuide selectedSize={landing.tamanoRecomendado} abierta />
        </section>

        {/* 4. Beneficios */}
        <section className="grid gap-3 sm:grid-cols-3 mb-8">
          {landing.beneficios.map((b, i) => (
            <Reveal key={b.t} delay={i * 80} className="h-full">
              <div className="card-glass p-5 h-full">
                <div className="text-3xl mb-2">{b.icon}</div>
                <div className="font-semibold">{b.t}</div>
                <p className="text-sm text-white/60 mt-1">{b.d}</p>
              </div>
            </Reveal>
          ))}
        </section>

        {/* 5. Producto: diseños REALES del catálogo */}
        <section id="disenos" className="scroll-mt-24 mb-8">
          <div className="flex items-end justify-between mb-4 gap-3">
            <div>
              <span className="badge badge-soft mb-2">Diseños</span>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl">
                Algunos que quedan bien
              </h2>
            </div>
            <Link to="/categorias" className="btn-ghost hidden sm:inline-flex shrink-0">
              Ver las 99 categorías →
            </Link>
          </div>

          <DiscountNote className="mb-4" />

          <SizePicker className="mb-3" />

          {porCategoria === null ? (
            <div className="grid gap-2 sm:gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="card-glass aspect-square animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid-rise grid gap-2 sm:gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {disenos.map((s) => (
                <StickerCard key={s.id} sticker={s} listName={`Landing ${slug}`} />
              ))}
            </div>
          )}

          <div className="mt-5 text-center sm:hidden">
            <Link to="/categorias" className="btn-secondary">Ver las 99 categorías →</Link>
          </div>
        </section>

        {/* 6-7. Prueba social + envíos y métodos de pago */}
        <section className="grid md:grid-cols-2 gap-4 mb-8">
          <SocialProof index={landing.testimonio} />
          <ShippingInfo />
        </section>

        {/* 8. Cómo funciona */}
        <section className="card-glass p-5 md:p-6 mb-8">
          <h2 className="font-display font-extrabold text-xl mb-4">Cómo comprar</h2>
          <ol className="grid gap-4 sm:grid-cols-4">
            {[
              ['1', 'Elegí tus diseños', 'Y el tamaño de cada uno.'],
              ['2', 'Sumalos al carrito', 'Podés mezclar categorías y tamaños.'],
              ['3', 'Pagá', `Mercado Pago o transferencia (10% off desde ${BULK_THRESHOLD} calcos).`],
              ['4', 'Te llega', 'Envíos a todo el país o retiro en Rosario.']
            ].map(([n, t, d]) => (
              <li key={n}>
                <div className="font-display font-extrabold text-2xl text-white/20">{n}</div>
                <div className="font-semibold text-sm mt-1">{t}</div>
                <p className="text-xs text-white/55 mt-0.5">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 9. FAQ específica del uso */}
        <section className="mb-8">
          <h2 className="font-display font-extrabold text-2xl mb-4">Preguntas sobre {landing.h1.toLowerCase()}</h2>
          <div className="space-y-3 max-w-3xl">
            {landing.faq.map((f) => (
              <details key={f.q} className="card-glass p-5 group">
                <summary className="font-semibold cursor-pointer list-none flex items-center justify-between gap-3 min-h-[44px]">
                  {f.q}
                  <span className="text-xl shrink-0 transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="text-white/70 mt-3">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="text-sm text-white/50 mt-4">
            ¿Otra duda? Está el{' '}
            <Link to="/#faq" className="underline decoration-white/30 hover:decoration-white">FAQ completo</Link> o
            escribinos por WhatsApp.
          </p>
        </section>

        {/* 10. CTA final */}
        <section className="card-glass p-8 text-center">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl">
            Armá tu pedido de {landing.h1.toLowerCase()}
          </h2>
          <p className="text-white/65 mt-2 max-w-xl mx-auto">
            Desde una sola calco. {BULK_THRESHOLD} o más, 10% off pagando por transferencia bancaria.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/categorias" className="btn-primary">Ver todos los diseños</Link>
            <Link to="/armar-pack" className="btn-secondary">Armá tu pack</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
