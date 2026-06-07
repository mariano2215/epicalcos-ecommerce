import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/productos', label: 'Productos' },
  { to: '/productos?cat=personalizadas', label: 'Personalizados' },
  { to: '/contacto', label: 'Contacto' }
];

export default function Header() {
  const { totalItems, openDrawer } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-white/10">
      <div className="container-app flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="grid place-items-center w-9 h-9 rounded-xl text-black font-black text-lg"
            style={{ background: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)' }}>
            E
          </span>
          <span className="font-display font-extrabold tracking-tight text-lg">EPICALCOS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `btn-ghost ${isActive ? 'text-white bg-white/10' : ''}`
              }
            >
              {l.label}
            </NavLink>
          ))}
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
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg ${isActive ? 'bg-white/10 text-white' : 'text-white/80'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
