import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { COTIZAR_FORM_HREF } from '../config/site.js';
import { WHATSAPP } from '../config/negocios.js';
import { hrefWhatsapp } from '../lib/whatsapp.js';
import { trackCotizar, trackWhatsappClick } from '../lib/analytics.js';

/**
 * El botón COTIZAR (spec 031, enmienda E-1). Mariano, 5/10/2026: "que llegue
 * a WhatsApp o al form de consulta por mail, así deja sus datos" — y que
 * elija el cliente. Al tocarlo se despliegan las dos salidas:
 *   · WhatsApp, con el mensaje precargado;
 *   · "Dejar mis datos": el formulario de /contacto (mail + CRM), con la
 *     consulta ya armada para cotizar (ver FormularioContacto).
 *
 * Hasta ese día "Cotizar" llevaba al bloque de compra de /negocio: el que no
 * estaba listo para comprar 100 calcos no tenía cómo dejar sus datos.
 *
 * `modo`:
 *   · 'flotante' (header y botones de página): un menú chico debajo del botón,
 *     que se cierra con Escape, tocando afuera o eligiendo una opción.
 *   · 'en-linea' (menú del celular): las dos opciones aparecen debajo, en el
 *     flujo, porque un menú flotante adentro del menú se superpone.
 * `alinear` ('izquierda' | 'derecha'): de qué borde del botón cuelga el menú.
 * `alAbrir` / `alElegir`: para que quien lo usa sume su propio tracking o
 * cierre su menú.
 */
export default function BotonCotizar({
  origen,
  label = 'Cotizar mis calcos',
  mensaje = WHATSAPP.cotizar,
  modo = 'flotante',
  alinear = 'izquierda',
  className = 'btn-primary min-h-[48px]',
  contenedorClassName = '',
  alAbrir,
  alElegir
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);
  const botonRef = useRef(null);
  const panelId = useId();

  // Solo con el menú abierto se escucha afuera: cerrado no cuesta nada.
  useEffect(() => {
    if (!abierto || modo !== 'flotante') return;
    const fuera = (e) => {
      if (!contenedorRef.current?.contains(e.target)) setAbierto(false);
    };
    const tecla = (e) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        botonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto, modo]);

  const alternar = () => {
    const proximo = !abierto;
    setAbierto(proximo);
    if (proximo) {
      trackCotizar({ origen, via: 'abrir' });
      alAbrir?.();
    }
  };

  const elegir = (via) => {
    trackCotizar({ origen, via });
    if (via === 'whatsapp') trackWhatsappClick(`cotizar_${origen}`);
    setAbierto(false);
    alElegir?.();
  };

  const opcion =
    'flex items-start gap-3 rounded-xl px-3 py-3 min-h-[56px] text-left hover:bg-white/10 focus-visible:bg-white/10 outline-none';
  const panel =
    modo === 'flotante'
      ? `absolute z-50 top-full mt-2 w-full min-w-[17rem] sm:w-72 ${alinear === 'derecha' ? 'right-0' : 'left-0'} rounded-2xl border border-white/15 bg-[#1a1a1a] p-2 shadow-2xl shadow-black/50`
      : 'mt-2 rounded-2xl border border-white/15 bg-white/5 p-2';

  return (
    <div ref={contenedorRef} className={`relative ${contenedorClassName}`}>
      <button
        ref={botonRef}
        type="button"
        aria-expanded={abierto}
        aria-controls={panelId}
        onClick={alternar}
        className={className}
      >
        {label}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {abierto && (
        <ul id={panelId} className={panel}>
          <li>
            <a
              href={hrefWhatsapp(mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => elegir('whatsapp')}
              className={opcion}
            >
              <span aria-hidden className="text-xl leading-none mt-0.5">💬</span>
              <span>
                <span className="block font-semibold text-white">Por WhatsApp</span>
                <span className="block text-xs text-white/60 mt-0.5">Escribinos qué necesitás</span>
              </span>
            </a>
          </li>
          <li>
            <Link to={COTIZAR_FORM_HREF} onClick={() => elegir('formulario')} className={opcion}>
              <span aria-hidden className="text-xl leading-none mt-0.5">✉️</span>
              <span>
                <span className="block font-semibold text-white">Dejar mis datos</span>
                <span className="block text-xs text-white/60 mt-0.5">Completás un formulario y te contactamos</span>
              </span>
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
