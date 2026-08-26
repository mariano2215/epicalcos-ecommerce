import { contact } from '../../config/site.js';
import { trackWhatsappClick } from '../../lib/analytics.js';

/**
 * El mensaje ya escrito es TODO el punto de esta card. La de antes abría el
 * chat vacío y ahí se caía la consulta: el cliente tenía que redactar qué
 * quería justo cuando ya había hecho el esfuerzo de tocar el botón.
 *
 * Mismo patrón que routes/Categorias.jsx y routes/PaymentTransfer.jsx.
 */
const MENSAJE = 'Hola! Quiero hacer una consulta sobre calcos';

/**
 * El ícono es una copia del de components/WhatsAppButton.jsx a propósito: ese
 * botón está en TODAS las páginas y extraerle el ícono es un refactor fuera del
 * scope de la spec 012 (regla 8). Queda anotado como hallazgo para unificarlo
 * en un cambio propio.
 */
function IconoWhatsapp({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.447h.006c6.585 0 11.946-5.335 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411z" />
    </svg>
  );
}

/** Link listo para usar en cualquier lado (el estado de error del formulario lo reusa). */
export const whatsappHref = `${contact.whatsappUrl}?text=${encodeURIComponent(MENSAJE)}`;

export default function CardWhatsapp() {
  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWhatsappClick('contacto_card')}
      aria-label={`Escribinos por WhatsApp al ${contact.whatsappDisplay}`}
      className="card-glass card-glass-hover group block p-6 md:p-7 relative overflow-hidden"
    >
      {/* El verde de WhatsApp, apenas insinuado: la card tiene que leerse como
          "esto es WhatsApp" antes de que alguien lea la palabra. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#25D366]/20 blur-2xl transition-opacity duration-300 group-hover:opacity-150"
      />
      <div className="relative flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25">
          <IconoWhatsapp />
        </span>
        <div className="min-w-0">
          {/* `flex-wrap` + `whitespace-nowrap`: a 375 px no entran los dos en la
              misma línea y, sin esto, lo que se parte en dos es el TEXTO del
              badge ("Lo más / rápido"), que queda como un error. Así baja el
              badge entero a la línea de abajo. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <h2 className="font-display font-extrabold text-xl">WhatsApp</h2>
            <span className="badge bg-[#25D366]/15 text-[#7ff0ae] border border-[#25D366]/30 text-[11px] whitespace-nowrap">
              Lo más rápido
            </span>
          </div>
          <p className="text-white/70 text-sm mt-1.5">
            Te abrimos el chat con el mensaje ya escrito. Solo tenés que tocar enviar.
          </p>
          <p className="text-white/45 text-sm mt-2 tabular-nums">{contact.whatsappDisplay}</p>
        </div>
      </div>

      <span className="btn-primary w-full mt-5 min-h-[44px] bg-[#25D366] bg-none shadow-[#25D366]/25 hover:brightness-110">
        Escribinos por WhatsApp
      </span>

      <p className="text-white/40 text-xs mt-3 text-center">
        Consultas, diseños personalizados y pedidos para negocios.
      </p>
    </a>
  );
}
