import { useLocation } from 'react-router-dom';
import { contact } from '../config/site.js';

/**
 * Botón flotante de WhatsApp, presente en todas las páginas.
 * Usa el mismo número/enlace que la sección Contacto (contact.whatsappUrl).
 *
 * z-40: por encima del contenido, pero por debajo del CartDrawer (z-50) y el
 * WelcomePopup (z-60) — esos overlays lo tapan solos cuando están abiertos.
 *
 * En /personalizados hay una barra inferior fija en mobile/tablet
 * (ResumenPedido, lg:hidden); ahí el botón se eleva para no tapar el CTA.
 */
export default function WhatsAppButton() {
  const { pathname } = useLocation();

  const bottom =
    pathname === '/personalizados'
      ? 'bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:bottom-6'
      : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom))] sm:bottom-6';

  return (
    <a
      href={contact.whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className={`group fixed right-5 sm:right-6 ${bottom} z-40 block`}
    >
      {/* Etiqueta que aparece al pasar el mouse (desktop) */}
      <span className="hidden sm:block pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-full bg-black/80 px-3 py-1.5 text-sm font-medium text-white opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        Escribinos 👋
      </span>

      <span className="grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/30 ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
        {/* Ícono de WhatsApp */}
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-7 w-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.447h.006c6.585 0 11.946-5.335 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411z" />
        </svg>
      </span>
    </a>
  );
}
