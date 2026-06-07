import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-black/40">
      <div className="container-app py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="grid place-items-center w-9 h-9 rounded-xl text-black font-black text-lg"
              style={{ background: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)' }}>E</span>
            <span className="font-display font-extrabold tracking-tight text-lg">EPICALCOS</span>
          </div>
          <p className="text-white/60 text-sm">
            Calcomanías personalizadas y stickers premium en Rosario. Resistentes al agua y al sol.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Tienda</h4>
          <ul className="space-y-2 text-white/60 text-sm">
            <li><Link to="/productos" className="hover:text-white">Todos los productos</Link></li>
            <li><Link to="/productos?cat=personalizadas" className="hover:text-white">Personalizadas</Link></li>
            <li><Link to="/productos?cat=polaroids" className="hover:text-white">Polaroids</Link></li>
            <li><Link to="/productos?cat=vinilos" className="hover:text-white">Vinilos</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Ayuda</h4>
          <ul className="space-y-2 text-white/60 text-sm">
            <li><Link to="/contacto" className="hover:text-white">Contacto</Link></li>
            <li><a href="#faq" className="hover:text-white">Preguntas frecuentes</a></li>
            <li><span className="text-white/40">Pagos: Mercado Pago</span></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Sumate</h4>
          <p className="text-white/60 text-sm mb-3">Novedades, drops y descuentos.</p>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="tu@email.com" className="input-dark !py-2" />
            <button className="btn-primary !py-2 !px-4 text-sm">OK</button>
          </form>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-app py-5 flex flex-col md:flex-row gap-2 justify-between text-xs text-white/40">
          <span>© {new Date().getFullYear()} EPICALCOS — Rosario, Argentina</span>
          <span>Hecho con calcos, café y mucho diseño.</span>
        </div>
      </div>
    </footer>
  );
}
