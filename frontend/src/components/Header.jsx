import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import AnnouncementBar from './AnnouncementBar.jsx';
import PromoBanner, { endLabel } from './PromoBanner.jsx';
import { usePromoActive, useMayoristaPromoActive } from '../lib/promo.js';
import { PROMO_END_MS, PROMO_MAYORISTA_100, PROMO_MAYORISTA_END_MS } from '../config/pricing.js';
import { navLinks, site } from '../config/site.js';

export default function Header() {
  const { totalItems, openDrawer } = useCart();
  const [open, setOpen] = useState(false);
  const promoActive = usePromoActive();
  const mayoristaPromoActive = useMayoristaPromoActive();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-white/10">
      {promoActive ? (
        <PromoBanner
          title="3×2 EN TODAS LAS CALCOS"
          subtitle={`Cada 3, la más barata gratis · hasta ${endLabel(PROMO_END_MS, 'el domingo')}`}
          endMs={PROMO_END_MS}
          to="/categorias"
          ariaLabel="Promoción 3x2 en todas las calcos"
        />
      ) : mayoristaPromoActive ? (
        <PromoBanner
          title={`100 CALCOS A ${formatPrice(PROMO_MAYORISTA_100.price)}`}
          subtitle={`Elegís los 100 diseños · 4 y 6 cm · hasta ${endLabel(PROMO_MAYORISTA_END_MS, 'el viernes 14/8')}`}
          endMs={PROMO_MAYORISTA_END_MS}
          to="/mayorista"
          ariaLabel="Promoción mayorista: 100 calcos a $39.999"
        />
      ) : (
        <AnnouncementBar />
      )}
      <div className="container-app flex items-center justify-between py-4">
        <Link to="/" className="flex items-center" onClick={() => setOpen(false)} aria-label={site.name}>
          <img src="/favicon.png" alt={site.name} className="h-11 w-11 rounded-lg" />
        </Link>

        {/* lg y no md: con 7 links el nav no entra en 768 px y desbordaba la página */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((l) =>
            l.hash ? (
              <Link key={l.to} to={l.to} className="btn-ghost">
                {l.label}
              </Link>
            ) : (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `btn-ghost ${isActive ? 'text-white bg-white/10' : ''}`
                }
                end={l.to === '/'}
              >
                {l.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={openDrawer} className="btn-secondary !py-2 !px-3 relative" aria-label="Abrir carrito">
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
            className="lg:hidden btn-secondary !py-2 !px-3"
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
                  className="block px-3 py-2 rounded-lg text-white/80"
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
                    `block px-3 py-2 rounded-lg ${isActive ? 'bg-white/10 text-white' : 'text-white/80'}`
                  }
                >
                  {l.label}
                </NavLink>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}
