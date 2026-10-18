import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PackBuilder from '../components/PackBuilder.jsx';
import EscalaVolumen from '../components/negocios/EscalaVolumen.jsx';
import PedidosGrandes from '../components/negocios/PedidosGrandes.jsx';
import { WHOLESALE_QTY, WHOLESALE_DISCOUNT } from '../config/pricing.js';
import { MAYORISTA, SEO } from '../config/negocios.js';
import { useSeo } from '../lib/seo.js';
import { jsonLdMayorista } from '../lib/negociosEstatico.js';
import { trackWholesaleClick } from '../lib/analytics.js';

/**
 * /mayorista — calcos por mayor (spec 034 §7.6, spec 032 tarea 2.2).
 *
 *   qué se compra y en qué condiciones → cuánto sale cada escalón →
 *   armar el pedido → más de 1.000 → ¿con tu logo? → /negocio
 *
 * HASTA EL 17/10/2026 la página era un cartel de "Promo por tiempo limitado"
 * (una promo SIN fecha de fin desde la spec 017) y un armador que obligaba a
 * juntar EXACTAMENTE 100 calcos: para 300 había que armar el pack tres veces,
 * y la escala por volumen que Mariano aprobó el 5/10 (250 / 500 / 1.000 más
 * baratas por calco) no se podía comprar en ningún lado.
 *
 * Ahora el armador cobra con la escala (`escala`), de 100 a 1.000, en 4 y 6
 * cm. El escalón de 100 cuesta lo mismo que la promo de antes, así que nadie
 * paga más; el que lleva más, paga menos por calco. El 9 cm sale de la venta
 * por mayor (spec 032 §9.4) y se dice.
 *
 * Las condiciones van ANTES del armador: el que compra 500 calcos para
 * revender quiere saber plazo, envío y pago antes de elegir el primer diseño.
 *
 * "Mayorista" queda como keyword y argumento de precio (spec 031): el título
 * dice "por mayor" y el slug no cambia.
 */
export default function Mayorista() {
  useSeo({
    title: SEO.mayorista.title,
    description: SEO.mayorista.description,
    jsonLd: jsonLdMayorista()
  });

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app pt-6 md:pt-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Calcos por mayor' }]} />

        <header className="mt-4 max-w-3xl">
          <span className="badge badge-hot">{MAYORISTA.eyebrow}</span>
          <h1 className="font-display font-black text-4xl sm:text-5xl leading-[1.02] mt-4">{MAYORISTA.h1}</h1>
          <p className="text-white/75 mt-4 text-base md:text-lg">{MAYORISTA.bajada}</p>
        </header>

        {/* Condiciones: todas leídas del config (montos, plazos, umbrales).
            UNA tarjeta con renglones y no siete tarjetas: a 375 px, siete
            cards apiladas empujaban el armador casi 800 px hacia abajo. */}
        <ul className="mt-6 card-glass p-4 md:p-6 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {MAYORISTA.condiciones.map((c) => (
            <li key={c.t} className="flex items-start gap-3 text-sm leading-snug">
              <span className="text-lg leading-none mt-0.5" aria-hidden>{c.icono}</span>
              <span className="min-w-0">
                <strong className="text-white">{c.t}.</strong> <span className="text-white/70">{c.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <EscalaVolumen id="precios" conHolografico={false} />

      <div id="armar" className="container-app pb-10 scroll-mt-24">
        <PackBuilder
          packType="mayorista"
          escala
          min={WHOLESALE_QTY}
          discount={WHOLESALE_DISCOUNT}
          defaultSize="4cm"
          allowCustom
          title={MAYORISTA.armadorTitulo}
          subtitle={MAYORISTA.armadorBajada}
        />
      </div>

      <PedidosGrandes pagina="mayorista" />

      <section className="pb-16">
        <div className="container-app">
          <div className="card-glass p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display font-extrabold text-2xl">{MAYORISTA.conTuLogo.t}</h2>
              <p className="text-white/70 mt-1">{MAYORISTA.conTuLogo.d}</p>
            </div>
            <Link
              to="/negocio"
              onClick={() => trackWholesaleClick('mayorista_con_tu_logo')}
              className="btn-secondary min-h-[48px] shrink-0"
            >
              {MAYORISTA.conTuLogo.cta} →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
