import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { INTERESES } from '../../config/popup.js';
import { leerCupon } from '../../lib/cuponVentana.js';
import CuponCountdown from '../CuponCountdown.jsx';
import { copiarCodigo } from './copiar.js';

/**
 * Paso 2 del popup de bienvenida (spec 026).
 *
 * El popup NO se cierra al dejar el mail: este es el momento de más intención
 * de toda la visita, y el popup anterior lo gastaba en un "Comprar ahora" que
 * cerraba y dejaba a la persona donde estaba. Acá la pregunta "¿qué querés
 * personalizar?" la lleva directo a productos.
 *
 * La acción principal es comercial ("Elegir mis calcos"); la ✕ sigue estando,
 * pero con menos peso visual que el botón.
 *
 * Los intereses y los CTA son `Link` (navegan de verdad: se pueden abrir en
 * otra pestaña, el lector los anuncia como links). El `onClick` solo mide y
 * cierra el popup; la navegación la hace el Link.
 */
export default function PopupExito({
  pct,
  codigo,
  hayCarrito,
  conVentana,
  onInteres,
  onCatalogo,
  onPagar,
  tituloRef
}) {
  const [copia, setCopia] = useState(null);
  const codigoRef = useRef(null);
  // El cupón recién guardado, solo para el contador si la oferta tiene ventana.
  const [cupon] = useState(() => (conVentana ? leerCupon() : null));

  const copiar = async () => setCopia(await copiarCodigo(codigo, codigoRef.current));

  return (
    <>
      <h2
        id="popup-titulo"
        ref={tituloRef}
        tabIndex={-1}
        className="font-display font-extrabold leading-tight outline-none px-1 pt-5 sm:px-6 sm:pt-0"
      >
        <span className="block text-3xl" aria-hidden="true">
          🎉
        </span>
        <span className="block text-2xl mt-1">¡Listo!</span>
        <span className="block text-lg sm:text-xl mt-1">Tu {pct}% OFF ya está activo</span>
      </h2>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 pl-4 text-left">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-white/50">Código</div>
          <div ref={codigoRef} className="font-display font-black text-2xl tracking-widest select-all">
            {codigo}
          </div>
        </div>
        <button type="button" onClick={copiar} className="btn-secondary min-h-[44px] !px-4 text-sm shrink-0">
          {copia === 'ok' ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
      <p className="text-white/55 text-xs mt-2" aria-live="polite">
        {copia === 'manual'
          ? 'Quedó seleccionado: copialo con el menú de tu teléfono.'
          : 'Se aplica solo en el checkout. Vale para las calcos del catálogo.'}
      </p>
      {conVentana && cupon && <CuponCountdown cupon={cupon} className="mt-3 justify-center" />}

      <p className="font-display font-bold mt-5">¿Qué querés personalizar?</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {INTERESES.map((i) => (
          <Link
            key={i.id}
            to={i.to}
            onClick={() => onInteres(i)}
            className="min-h-[52px] rounded-xl border border-white/15 bg-white/[0.04] hover:border-brand-fuchsia/60 hover:bg-white/[0.08] font-semibold flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
          >
            <span aria-hidden="true">{i.emoji}</span>
            {i.label}
          </Link>
        ))}
      </div>

      <Link to="/categorias" onClick={onCatalogo} className="btn-primary w-full min-h-[48px] mt-5 text-base">
        Elegir mis calcos <span aria-hidden="true">→</span>
      </Link>
      {hayCarrito && (
        <Link
          to="/checkout"
          onClick={onPagar}
          className="mt-2 inline-flex items-center justify-center min-h-[44px] px-2 text-sm text-white/70 hover:text-white underline underline-offset-4"
        >
          Ya tengo calcos en el carrito: ir a pagar
        </Link>
      )}
    </>
  );
}
