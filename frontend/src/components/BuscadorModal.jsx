import { useEffect, useRef } from 'react';
import BuscadorCalcos from './BuscadorCalcos.jsx';
import { site } from '../config/site.js';

/**
 * Búsqueda a pantalla completa. Es la puerta de entrada al catálogo en celular.
 *
 * Antes, en mobile, buscar significaba: estar en el Home, no haber scrolleado
 * todavía, y encontrar un input de 36 px al final del hero. Desde cualquier otra
 * página, o después de dos scrolls, el buscador no existía. Con 61 categorías
 * eso deja la navegación entera en manos del menú hamburguesa.
 *
 * Acá la búsqueda ocupa la pantalla: sin nada más que mirar, con el teclado ya
 * abierto y con los chips diciendo qué se puede buscar.
 *
 * Accesibilidad (el diálogo es la única trampa de foco de todo el sitio):
 * `Escape` cierra, el foco vuelve al botón que lo abrió, el scroll del `body`
 * queda bloqueado mientras está abierto, y el `<h2>` le da nombre al diálogo.
 */
export default function BuscadorModal({ abierto, onCerrar }) {
  const cerrarRef = useRef(null);
  const devolverFocoA = useRef(null);

  useEffect(() => {
    if (!abierto) return;

    devolverFocoA.current = document.activeElement;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowPrevio;
      // Sin esto, al cerrar con Escape el foco queda en el <body> y el siguiente
      // Tab arranca desde el principio de la página.
      devolverFocoA.current?.focus?.();
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="buscador-modal" role="dialog" aria-modal="true" aria-labelledby="buscador-modal-titulo">
      <div className="container-app py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="buscador-modal-titulo" className="font-display font-extrabold text-lg">
            ¿Qué te gusta?
          </h2>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            className="btn-secondary !py-2 !px-3 min-h-[44px] min-w-[44px]"
            aria-label="Cerrar búsqueda"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-white/60 mt-2">
          Buscá entre miles de diseños de {site.name}: personajes, clubes, series, frases y más.
        </p>

        <BuscadorCalcos
          className="mt-5"
          size="lg"
          autoFocus
          chips
          origen="modal_mobile"
          onNavigate={onCerrar}
        />
      </div>
    </div>
  );
}
