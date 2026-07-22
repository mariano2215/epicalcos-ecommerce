import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import AnnouncementBar from './AnnouncementBar.jsx';
import PromoBanner from './PromoBanner.jsx';
import { usePromoActive } from '../lib/promo.js';
import { navLinks, site } from '../config/site.js';

export default function Header() {
  const { totalItems, openDrawer } = useCart();
  const [open, setOpen] = useState(false);
  const promoActive = usePromoActive();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-white/10">
      {promoActive ? <PromoBanner /> : <AnnouncementBar />}
      <div className="container-app flex items-center justify-between py-4">
        <Link to="/" className="flex items-center" onClick={() => setOpen(false)} aria-label={site.name}>
          <img src="/favicon.png" alt={site.name} className="h-11 w-11 rounded-lg" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
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
            className="md:hidden btn-secondary !py-2 !px-3"
            aria-label="Abrir menú"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-black/80">
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
