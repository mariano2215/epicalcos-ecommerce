import { Link } from 'react-router-dom';
import { RANGO_CORTO } from '../../config/epicyber.js';
import { usePacksCyber } from '../../lib/promo.js';

/**
 * Paso 2 del popup de EPICYBER (spec 037): qué quedó reservado y cómo se usa.
 *
 * Nombra el mail a propósito: comprar con otro es la forma más fácil de quedarse
 * sin el regalo. Antes del 2/11 `/epicyber` todavía no existe, así que el botón
 * lleva al catálogo; con la campaña corriendo, a las ofertas.
 */
export default function PopupCyberExito({ email, regalo, onIr, tituloRef }) {
  const hayOfertas = usePacksCyber().length > 0;

  return (
    <>
      <h2
        id="popup-titulo"
        ref={tituloRef}
        tabIndex={-1}
        className="font-display font-extrabold leading-tight outline-none px-1 pt-5 sm:px-6 sm:pt-0"
      >
        <span className="block text-3xl" aria-hidden="true">
          🎁
        </span>
        <span className="block text-2xl mt-1">¡Listo!</span>
        <span className="block text-lg sm:text-xl mt-1">Tu regalo quedó reservado</span>
      </h2>

      <p className="text-white/80 text-sm mt-3">
        Comprá {RANGO_CORTO} con <strong className="text-white break-all">{email}</strong> y sumamos un pack de{' '}
        {regalo.qty} calcos sorpresa a tu pedido.
      </p>
      <p className="text-white/55 text-xs mt-2">Te mandamos las condiciones por mail.</p>

      <Link
        to={hayOfertas ? '/epicyber' : '/categorias'}
        onClick={onIr}
        className="btn-primary w-full min-h-[48px] mt-5 text-base"
      >
        {hayOfertas ? 'Ver ofertas' : 'Elegir mis calcos'} <span aria-hidden="true">→</span>
      </Link>
    </>
  );
}
