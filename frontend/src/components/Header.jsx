import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar.jsx';
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

export default function Header() {
  const { totalItems, openDrawer } = useCart();
  const [open, setOpen] = useState(false);
  const promoActive = usePromoActive();
  const mayoristaPromoActive = useMayoristaPromoActive();
  const argentinaPromoActive = useArgentinaPromoActive();

  return (
    /* Orden del header: banner de promo (si hay) → nav → menú mobile → ticker.
       El ticker va ÚLTIMO y no entre el nav y el menú: el menú desplegable está
       hecho para colgar pegado al nav, y meterle una tira de colores en el medio
       lo parte al abrirlo. */
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-white/10">
      {promoActive ? (
        <PromoBanner
          title="3×2 EN TODAS LAS CALCOS"
          subtitle={`Cada 3, la más barata gratis · hasta ${endLabel(PROMO_END_MS, 'el lunes')}`}
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
      <div className="container-app flex items-center justify-between py-4">
        <Link to="/" className="flex items-center" onClick={() => setOpen(false)} aria-label={site.name}>
          {/* El logo está arriba del fold en todas las páginas: eager + tamaño
              declarado para que el header no salte al cargar. */}
          <img
            src="/favicon.png"
            alt={site.name}
            width={44}
            height={44}
            decoding="async"
            className="h-11 w-11 rounded-lg"
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
          <button onClick={openDrawer} className="btn-secondary !py-2 !px-3 relative min-h-[44px] min-w-[44px]" aria-label="Abrir carrito">
            <span>🛒</span>
            <span className="hidden sm:inline">Carrito</span>
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

      {/* Ticker de anuncios, debajo del nav y en TODAS las páginas.
          Estuvo arriba de todo hasta que el banner dorado le ganó ese lugar:
          dos tiras de colores compitiendo arriba se anulaban entre sí. Acá abajo
          acompaña sin pelear. */}
      <AnnouncementBar />
    </header>
  );
}
