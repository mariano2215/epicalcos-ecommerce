import { useEffect, useId, useRef, useState } from 'react';
import { copiarCodigo } from './copiar.js';

/**
 * El acceso fijo del popup de bienvenida (spec 026), abajo a la izquierda.
 *
 * Dos estados:
 *  - `oferta` — "🎁 10% OFF". Solo en el Home, para quien cerró el popup sin
 *    dejar el mail. Lo reabre en el paso 1, y SOLO si lo tocan.
 *  - `activo` — "🎁 10% OFF activo". En la tienda (no en el pago ni donde el
 *    10% no aplica), para quien ya lo activó. Al tocarlo despliega el código;
 *    no abre el popup, que vive solo en el Home (P-6).
 *
 * POR QUÉ UN CHIP Y NO UNA BARRA: a 375 px el header ya lleva el banner de la
 * promo y la tira de anuncios. Una tercera barra empuja el contenido y, como
 * aparece recién al convertir, mueve el layout en la cara del cliente. El chip
 * flota: no mueve nada.
 *
 * ⚠️ POSICIÓN: sube y baja con las mismas reglas que WhatsAppButton.jsx (que
 * está a la derecha), por las barras fijas del celular en la ficha y en
 * /personalizados. Si se toca una, tocar la otra.
 */
const ELEVADO = 'bottom-[calc(6rem+env(safe-area-inset-bottom))]';
const NORMAL = 'bottom-[calc(1.25rem+env(safe-area-inset-bottom))] sm:bottom-6';

export default function AccesoBeneficio({ tipo, pct, codigo, pathname, onAbrir }) {
  const [abierto, setAbierto] = useState(false);
  const [copia, setCopia] = useState(null);
  const cajaRef = useRef(null);
  const codigoRef = useRef(null);
  const panelId = useId();

  const bottom =
    pathname === '/personalizados'
      ? `${ELEVADO} lg:bottom-6`
      : /^\/producto\//.test(pathname)
        ? `${ELEVADO} sm:bottom-6`
        : NORMAL;

  // El panel se cierra al navegar, con Escape y tocando afuera.
  useEffect(() => setAbierto(false), [pathname]);
  useEffect(() => {
    if (!abierto) return undefined;
    const onKey = (e) => e.key === 'Escape' && setAbierto(false);
    const onClick = (e) => !cajaRef.current?.contains(e.target) && setAbierto(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onClick);
    };
  }, [abierto]);

  const chip =
    'inline-flex items-center gap-1.5 min-h-[44px] rounded-full px-4 text-sm font-bold text-white shadow-lg shadow-black/30 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';

  if (tipo === 'oferta') {
    return (
      <div className={`fixed left-4 sm:left-6 ${bottom} z-40`}>
        <button
          type="button"
          onClick={onAbrir}
          className={`${chip} bg-gradient-to-r from-brand-fuchsia to-brand-orange`}
        >
          <span aria-hidden="true">🎁</span> {pct}% OFF
        </button>
      </div>
    );
  }

  return (
    <div ref={cajaRef} className={`fixed left-4 sm:left-6 ${bottom} z-40`}>
      {abierto && (
        <div
          id={panelId}
          className="absolute bottom-full left-0 mb-2 w-64 card-glass !rounded-2xl p-4 text-left"
        >
          <div className="text-[11px] uppercase tracking-wider text-white/50">Tu código</div>
          <div className="mt-1 flex items-center gap-2">
            <span ref={codigoRef} className="flex-1 font-display font-black text-xl tracking-widest select-all">
              {codigo}
            </span>
            <button
              type="button"
              onClick={async () => setCopia(await copiarCodigo(codigo, codigoRef.current))}
              className="btn-secondary min-h-[44px] !px-3 text-sm"
            >
              {copia === 'ok' ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs text-white/60 mt-2" aria-live="polite">
            {copia === 'manual'
              ? 'Quedó seleccionado: copialo con el menú de tu teléfono.'
              : 'Se aplica solo en el checkout. Vale para las calcos del catálogo.'}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-controls={abierto ? panelId : undefined}
        className={`${chip} bg-emerald-600/90 border border-emerald-300/40`}
      >
        <span aria-hidden="true">🎁</span> {pct}% OFF activo
      </button>
    </div>
  );
}
