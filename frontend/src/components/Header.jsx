import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar.jsx';
import BuscadorModal from './BuscadorModal.jsx';
import { useCart } from '../context/CartContext.jsx';
import PromoBanner, { endLabel } from './PromoBanner.jsx';
import { usePromoActive, useMayoristaPromoActive, useArgentinaPromoActive } from '../lib/promo.js';
import {
  PROMO_END_MS,
  PROMO_MAYORISTA_100,
  PROMO_MAYORISTA_END_MS,
  PROMO_ARGENTINA,
  PROMO_ARGENTINA_END_MS
} from '../config/pricing.js';
import { navLinks, site } from '../config/site.js';

/** Píxeles de scroll desde los que el header se compacta. */
const UMBRAL_COMPACTO = 80;

export default function Header() {
  const { totalItems, openDrawer } = useCart();
  const [open, setOpen] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [compacto, setCompacto] = useState(false);
  const promoActive = usePromoActive();
  const mayoristaPromoActive = useMayoristaPromoActive();
  const argentinaPromoActive = useArgentinaPromoActive();

  // Header reducido al scrollear: en celular, después del primer scroll lo único
  // que hace falta arriba es volver al inicio, buscar y ver el carrito. Todo lo
  // demás (la barra de anuncios) se recoge para devolverle esa altura al
  // producto.
  useEffect(() => {
    const onScroll = () => setCompacto(window.scrollY > UMBRAL_COMPACTO);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Una promo viva es EL mensaje comercial de la página. La barra de anuncios se
  // calla: dos tiras de colores compitiendo arriba se anulan entre sí (ya había
  // pasado cuando el ticker vivía arriba del banner).
  const hayPromo = promoActive || mayoristaPromoActive || argentinaPromoActive;

  return (
    /* El modal de búsqueda va FUERA del <header>, no adentro.
       El header tiene `backdrop-filter`, y un elemento con backdrop-filter se
       vuelve el bloque contenedor de sus descendientes `position: fixed`: el
       modal quedaba encerrado en los 100 px del header y la página seguía
       visible debajo. Como hermano, su `inset: 0` vuelve a resolver contra el
       viewport. (Mismo motivo por el que no sirve subirle el z-index.) */
    <>
    {/* Orden del header: banner de promo (si hay) → nav → menú mobile → barra de
       anuncios. La barra va ÚLTIMA y no entre el nav y el menú: el menú
       desplegable cuelga pegado al nav, y meterle una tira de color en el medio
       lo parte al abrirlo. */}
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-white/10">
      {promoActive ? (
        <PromoBanner
          title="3×2 EN TODAS LAS CALCOS"
          subtitle={`Cada 3, la más barata gratis · hasta ${endLabel(PROMO_END_MS, 'el viernes')}`}
          endMs={PROMO_END_MS}
          to="/categorias"
          ariaLabel="Promoción 3x2 en todas las calcos"
        />
      ) : mayoristaPromoActive ? (
        // Título, subtítulo y precio salen de PROMO_MAYORISTA_100; la fecha, de
        // su `endsAt`. Acá no se escribe ni un dato de la promo a mano.
        <PromoBanner
          title={PROMO_MAYORISTA_100.titulo}
          subtitle={`${PROMO_MAYORISTA_100.subtitulo} · hasta ${endLabel(PROMO_MAYORISTA_END_MS, 'que se agote')}`}
          endMs={PROMO_MAYORISTA_END_MS}
          to="/mayorista"
          ariaLabel={`Promoción mayorista: ${PROMO_MAYORISTA_100.titulo}`}
        />
      ) : argentinaPromoActive ? (
        // Lunes 17 a miércoles 19 de agosto. Se prende sola a las 00:00 del
        // lunes (ver useActiveBetween) — no hay que deployar nada ese día.
        <PromoBanner
          title={PROMO_ARGENTINA.titulo}
          subtitle={`${PROMO_ARGENTINA.subtitulo} · hasta ${endLabel(PROMO_ARGENTINA_END_MS, 'el miércoles')}`}
          endMs={PROMO_ARGENTINA_END_MS}
          to={`/categoria/${PROMO_ARGENTINA.categoria}`}
          ariaLabel={`Promoción: ${PROMO_ARGENTINA.titulo}`}
        />
      ) : null}

      <div
        className={`container-app flex items-center justify-between transition-[padding] duration-200 ${
          compacto ? 'py-2' : 'py-4'
        }`}
      >
        <Link to="/" className="flex items-center" onClick={() => setOpen(false)} aria-label={site.name}>
          {/* El logo está arriba del fold en todas las páginas: eager + tamaño
              declarado para que el header no salte al cargar. */}
          <img
            src="/favicon.png"
            alt={site.name}
            width={44}
            height={44}
            decoding="async"
            className={`rounded-lg transition-all duration-200 ${compacto ? 'h-9 w-9' : 'h-11 w-11'}`}
          />
        </Link>

        {/* lg y no md: con 7 links el nav no entra en 768 px y desbordaba la página */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((l) =>
            l.hash ? (
              <Link key={l.to} to={l.to} className="btn-ghost !text-white font-semibold whitespace-nowrap">
                {l.label}
              </Link>
            ) : (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `btn-ghost !text-white font-semibold whitespace-nowrap ${isActive ? 'bg-white/10' : ''}`
                }
                end={l.to === '/'}
              >
                {l.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          {/* BUSCAR, antes que el carrito y bastante antes que la hamburguesa.
              Con 61 categorías y 3.397 diseños, buscar es la forma real de
              navegar este catálogo: en mobile tiene que pesar más que el menú.
              Por eso lleva texto en celular (el menú no) y va con el mismo
              tratamiento visual que el carrito. */}
          <button
            onClick={() => setBuscando(true)}
            className="btn-secondary !py-2 !px-3.5 min-h-[44px] !border-white/25"
            aria-label="Buscar calcos"
          >
            <span aria-hidden>🔎</span>
            {/* El texto se muestra TAMBIÉN en celular, al revés que en el
                carrito y el menú. Es lo que hace que buscar pese más que la
                hamburguesa: tres círculos idénticos de 44 px dicen que las tres
                acciones valen lo mismo, y acá no valen lo mismo. */}
            <span>Buscar</span>
          </button>

          <button onClick={openDrawer} className="btn-secondary !py-2 !px-3 relative min-h-[44px] min-w-[44px]" aria-label="Abrir carrito">
            <span aria-hidden>🛒</span>
            <span className="hidden lg:inline">Carrito</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 grid place-items-center min-w-[20px] h-5 px-1 text-xs font-bold rounded-full"
                style={{ background: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)' }}>
                {totalItems}
              </span>
            )}
          </button>
          <button
            className="lg:hidden btn-secondary !py-2 !px-3 min-h-[44px] min-w-[44px]"
            aria-label="Abrir menú"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/10 bg-black/80">
          <div className="container-app py-3 flex flex-col gap-1">
            {navLinks.map((l) =>
              l.hash ? (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 rounded-lg text-white font-semibold"
                >
                  {l.label}
                </Link>
              ) : (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  end={l.to === '/'}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-white font-semibold ${isActive ? 'bg-white/10' : ''}`
                  }
                >
                  {l.label}
                </NavLink>
              )
            )}
          </div>
        </div>
      )}

      {/* Un mensaje comercial por vez, y ninguno si ya hay banner de promo.
          Se recoge al scrollear: pasado el primer scroll, la promesa ya se leyó
          y esos 32 px valen más para el producto. */}
      {!hayPromo && !compacto && <AnnouncementBar />}
    </header>

    <BuscadorModal abierto={buscando} onCerrar={() => setBuscando(false)} />
    </>
  );
}
