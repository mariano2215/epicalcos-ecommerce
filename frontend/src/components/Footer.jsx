import { Link } from 'react-router-dom';
import { site, contact, footerLinks } from '../config/site.js';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-black/40">
      <div className="container-app py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="grid place-items-center w-9 h-9 rounded-xl text-black font-black text-lg"
              style={{ background: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)' }}>E</span>
            <span className="font-display font-extrabold tracking-tight text-lg">{site.name}</span>
          </div>
          <p className="text-white/60 text-sm">{site.tagline}</p>
          <p className="text-white/40 text-xs mt-3">{site.city}</p>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Tienda</h4>
          <ul className="space-y-2 text-white/60 text-sm">
            {footerLinks.tienda.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Ayuda</h4>
          <ul className="space-y-2 text-white/60 text-sm">
            {footerLinks.ayuda.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Hablemos</h4>
          <ul className="space-y-2 text-white/60 text-sm">
            <li>
              <a href={`mailto:${contact.email}`} className="hover:text-white">
                ✉️ {contact.email}
              </a>
            </li>
            <li>
              <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                💬 WhatsApp {contact.whatsappDisplay}
              </a>
            </li>
            <li>
              <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                {contact.instagram}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-app py-5 flex flex-col md:flex-row gap-2 justify-between text-xs text-white/40">
          <span>© {new Date().getFullYear()} {site.name} — {site.legalName}</span>
          <span>Hecho con calcos, mate y mucho diseño en Rosario.</span>
        </div>
      </div>
    </footer>
  );
}
