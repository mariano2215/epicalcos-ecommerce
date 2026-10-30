import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../lib/formato.js';
import { CYBER, isCyberPreview, precioHabitualPack } from '../../config/pricing.js';
import {
  EPICYBER_COPY,
  CONDICIONES_CYBER,
  CYBER_PENDIENTES,
  offDePack,
  porCalco,
  separarPacks
} from '../../config/epicyber.js';
import { usePacksCyber } from '../../lib/promo.js';
import { trackSelectPromotion, trackViewPromotion } from '../../lib/analytics.js';
import { FONDO_CYBER } from './CyberBanner.jsx';

/**
 * `view_promotion` una sola vez, cuando la sección entra en pantalla.
 *
 * El ref lo hace idempotente frente al doble efecto de StrictMode. Y va con
 * observer porque la sección de mayoristas queda muy abajo en el Home: contarla
 * al montar inflaría las vistas con gente que nunca llegó hasta ahí.
 */
function useVistaPromocion(ubicacion, packs) {
  const ref = useRef(null);
  const enviado = useRef(false);

  useEffect(() => {
    const enviar = () => {
      if (enviado.current) return;
      enviado.current = true;
      trackViewPromotion({ ubicacion, packs });
    };
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      enviar();
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        enviar();
        io.disconnect();
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ubicacion]);

  return ref;
}

/** Una oferta: la cantidad, el precio final y la rebaja real, en poco alto. */
function CyberPackCard({ pack, ubicacion }) {
  const off = offDePack(pack);
  const habitual = precioHabitualPack({ qty: pack.qty, size: CYBER.sizes[0] });

  return (
    <Link
      to={`/epicyber?n=${pack.qty}`}
      onClick={() => trackSelectPromotion({ ubicacion, pack })}
      className="card-glass card-glass-hover p-4 flex flex-col relative overflow-hidden min-h-[44px]"
    >
      {isCyberPreview() && !pack.aprobado && (
        <span className="absolute top-0 left-0 text-[9px] font-extrabold tracking-wide px-2 py-0.5 rounded-br-lg bg-brand-yellow text-black">
          SIN APROBAR
        </span>
      )}
      {off > 0 && (
        <span className="absolute top-0 right-0 text-[11px] font-extrabold px-2 py-1 rounded-bl-xl bg-brand-fuchsia text-white">
          -{off}%
        </span>
      )}
      <div className="mt-3 font-display font-black text-3xl leading-none">x{pack.qty}</div>
      <div className="mt-2.5">
        {off > 0 && (
          <div className="text-xs text-white/45 line-through" aria-hidden="true">
            {formatPrice(habitual)}
          </div>
        )}
        {/* `text-xl` en 375 px: con $ 164.900, el `text-2xl` se cortaba en la card. */}
        <div className="font-display font-extrabold text-xl md:text-2xl leading-none gradient-text whitespace-nowrap">
          {formatPrice(pack.price)}
        </div>
        <div className="text-xs text-white/60 mt-1">{formatPrice(porCalco(pack))} por calco</div>
      </div>
      <span className="mt-3 btn-primary w-full !py-2.5 text-sm text-center">Elegir</span>
    </Link>
  );
}

function Encabezado({ titulo, subtitulo }) {
  return (
    <div className="mb-4 md:mb-6 text-center">
      <h2 className="font-display font-black text-2xl md:text-4xl">{titulo}</h2>
      <p className="mt-1.5 text-sm md:text-base text-white/75">{subtitulo}</p>
    </div>
  );
}

/** La letra chica: el tachado es de 4 cm, que es la comparación más baja. */
export function CyberCondiciones() {
  return (
    <p className="mt-4 text-[11px] leading-relaxed text-white/50 text-center max-w-2xl mx-auto">
      Tachado: lo que cuesta hoy esa cantidad en 4 cm. {CONDICIONES_CYBER}
    </p>
  );
}

/** PACKS CYBER PARA TUS IDEAS. En el Home solo 10, 20, 30 y 50. */
export function CyberPacksChicos({ soloPrioritarios = false, ubicacion = 'home_chicos' }) {
  const { chicos } = separarPacks(usePacksCyber());
  const packs = soloPrioritarios ? chicos.filter((p) => p.prioritario) : chicos;
  const ref = useVistaPromocion(ubicacion, packs);
  if (!packs.length) return null;

  return (
    <section ref={ref} id="packs-cyber" className="container-app py-6 md:py-10 scroll-mt-24">
      <Encabezado {...EPICYBER_COPY.chicos} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {packs.map((p) => (
          <CyberPackCard key={p.qty} pack={p} ubicacion={ubicacion} />
        ))}
      </div>
      {soloPrioritarios && chicos.length > packs.length && (
        <div className="mt-4 text-center">
          <Link to="/epicyber" className="btn-ghost text-sm">
            Ver todos los packs
          </Link>
        </div>
      )}
      <CyberCondiciones />
    </section>
  );
}

/** TU MARCA PEGA MÁS FUERTE. En el Home solo 100 y 200. */
export function CyberMayoristas({ soloPrioritarios = false, ubicacion = 'home_mayoristas' }) {
  const { mayoristas } = separarPacks(usePacksCyber());
  const packs = soloPrioritarios ? mayoristas.filter((p) => p.prioritario) : mayoristas;
  const ref = useVistaPromocion(ubicacion, packs);
  if (!packs.length) return null;
  const { titulo, subtitulo, texto, cta } = EPICYBER_COPY.mayoristas;

  return (
    <section ref={ref} id="mayoristas-cyber" className="container-app py-6 md:py-10 scroll-mt-24">
      <div className="rounded-3xl border border-white/10 p-3 py-5 md:p-8" style={FONDO_CYBER}>
        <Encabezado titulo={titulo} subtitulo={subtitulo} />
        <p className="text-center text-sm text-white/70 -mt-2 mb-4">{texto}</p>
        <div className={`grid gap-3 grid-cols-2 ${packs.length > 2 ? 'lg:grid-cols-4' : 'max-w-xl mx-auto'}`}>
          {packs.map((p) => (
            <CyberPackCard key={p.qty} pack={p} ubicacion={ubicacion} />
          ))}
        </div>
        {/* Un botón por sección y no uno por card: "PERSONALIZAR MI PEDIDO" no
            entra en media pantalla de 375 px. */}
        <div className="mt-4 text-center">
          <Link
            to={`/epicyber?n=${packs[0].qty}`}
            onClick={() => trackSelectPromotion({ ubicacion: `${ubicacion}_cta`, pack: packs[0] })}
            className="btn-primary w-full md:w-auto"
          >
            {cta}
          </Link>
        </div>
        {soloPrioritarios && mayoristas.length > packs.length && (
          <div className="mt-2 text-center">
            <Link to="/epicyber#mayoristas-cyber" className="btn-ghost text-sm">
              Ver 300 y 500 calcos
            </Link>
          </div>
        )}
        <CyberCondiciones />
      </div>
    </section>
  );
}

/** Solo en vista previa: lo que falta aprobar. En vivo no se muestra nunca. */
export function CyberPendientes() {
  if (!isCyberPreview()) return null;
  return (
    <section className="container-app py-6">
      <div className="rounded-2xl border border-dashed border-brand-yellow/60 p-5">
        <h2 className="font-display font-extrabold text-lg text-brand-yellow">
          Pendientes de aprobación · no se publican
        </h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {CYBER_PENDIENTES.map((p) => (
            <li key={p.id} className="text-sm text-white/75">
              <strong className="text-white">{p.titulo}:</strong> {p.oferta}.{' '}
              <span className="text-white/50">Falta: {p.falta}.</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
