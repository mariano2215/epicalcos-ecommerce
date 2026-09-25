import { useEffect, useReducer, useRef } from 'react';
import { captureLead } from '../../services/leadService.js';
import {
  trackPopupEmailSubmit,
  trackPopupInterestSelected,
  trackPopupCtaClick
} from '../../lib/analytics.js';
import { POPUP_CONFIG, POPUP_OFERTA } from '../../config/popup.js';
import PopupCaptura from './PopupCaptura.jsx';
import PopupExito from './PopupExito.jsx';

/**
 * La cáscara del popup de bienvenida (spec 026): diálogo, foco y los dos pasos.
 *
 * Se carga con `import()` recién cuando el disparo se arma (nunca antes de 5 s
 * en el Home): no tiene sentido que su código pese en el LCP.
 *
 * ESTADOS: un solo reducer. El popup anterior tenía `visible` + `status` +
 * `code` + `emitidoEn` sueltos, y nada impedía combinaciones imposibles (éxito
 * sin código, error enviando). Acá hay tres pasos —`captura`, `enviando`,
 * `exito`— y el error es un dato de `captura`. "Oculto", "cerrado" y
 * "convertido" no son pantallas: son memoria, y viven en lib/popupEstado.js.
 */

/** El mismo criterio que valida el servidor (netlify/functions/capture-lead.js). */
const EMAIL_RE = /^\S+@\S+\.\S+$/;

const INICIAL = { paso: 'captura', email: '', error: null, codigo: null };

function reducer(s, a) {
  switch (a.type) {
    case 'escribir':
      // Si estaba el error de formato, se va al escribir; el del servidor queda
      // hasta el próximo intento.
      return { ...s, email: a.email, error: s.error === 'email' ? null : s.error };
    case 'enviar':
      return { ...s, paso: 'enviando', error: null };
    case 'error':
      // Nunca se cierra por un error, y el mail escrito queda en el campo.
      return { ...s, paso: 'captura', error: a.error };
    case 'ok':
      return { paso: 'exito', email: '', error: null, codigo: a.codigo };
    default:
      return s;
  }
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * @param {{ pct: number, contexto: {variante, dispositivo}, hayCarrito: boolean,
 *           onCerrar: (metodo, paso) => void, onConvertido: (codigo) => void,
 *           onSalir: () => void }} props
 */
export default function PopupDialogo({ pct, contexto, hayCarrito, onCerrar, onConvertido, onSalir }) {
  const [s, dispatch] = useReducer(reducer, INICIAL);
  const cajaRef = useRef(null);
  const tituloRef = useRef(null);
  const enviandoRef = useRef(false);
  // En refs para que el listener de teclado (armado una vez) vea siempre lo último.
  const pasoRef = useRef(s.paso);
  pasoRef.current = s.paso;
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;

  const cerrar = (metodo) => onCerrarRef.current(metodo, pasoRef.current === 'exito' ? 'success' : 'capture');

  /**
   * Al abrir: foco al TÍTULO (no al campo: en el celular abriría el teclado sin
   * que nadie lo pida), scroll del fondo bloqueado, Escape cierra y Tab no se
   * escapa del diálogo. Al cerrar, el foco vuelve a donde estaba. Mismo patrón
   * que BuscadorModal.
   */
  useEffect(() => {
    const previo = document.activeElement;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    tituloRef.current?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cerrar('esc');
        return;
      }
      if (e.key !== 'Tab') return;
      const caja = cajaRef.current;
      if (!caja) return;
      const foco = [...caja.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!foco.length) return;
      const primero = foco[0];
      const ultimo = foco[foco.length - 1];
      const actual = document.activeElement;
      const afuera = !caja.contains(actual);
      if (e.shiftKey && (afuera || actual === primero || actual === tituloRef.current)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (afuera || actual === ultimo)) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowPrevio;
      // Si se navegó (un interés, el CTA), el elemento anterior ya no existe.
      if (previo && previo !== document.body && document.contains(previo)) {
        previo.focus?.({ preventScroll: true });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al pasar al éxito, el foco va al título nuevo: así el lector anuncia
  // "¡Listo! Tu 10% OFF ya está activo" sin un aria-live aparte.
  useEffect(() => {
    if (s.paso === 'exito') tituloRef.current?.focus({ preventScroll: true });
  }, [s.paso]);

  const enviar = async (e) => {
    e.preventDefault();
    // Ref y no estado: un doble toque rápido dispara dos submit antes de que
    // el botón llegue a deshabilitarse.
    if (enviandoRef.current) return;
    const email = s.email.trim();
    if (!EMAIL_RE.test(email)) {
      dispatch({ type: 'error', error: 'email' });
      return;
    }
    enviandoRef.current = true;
    dispatch({ type: 'enviar' });
    trackPopupEmailSubmit({
      variante: contexto.variante,
      tipoDescuento: POPUP_OFERTA.tipo === 'porcentaje' ? 'percentage' : POPUP_OFERTA.tipo,
      dispositivo: contexto.dispositivo,
      pagina: window.location.pathname
    });
    try {
      const { code } = await captureLead(email, { timeoutMs: POPUP_CONFIG.timeoutEnvioMs });
      const codigo = code || POPUP_OFERTA.codigo;
      // Primero la conversión (cupón guardado, estado, eventos) y después la
      // pantalla: si la persona cerró el popup mientras esperaba, el cupón
      // igual queda activo, que es lo que el servidor ya le mandó por mail.
      onConvertido(codigo);
      dispatch({ type: 'ok', codigo });
    } catch (err) {
      dispatch({ type: 'error', error: err?.status === 400 ? 'email' : 'servidor' });
    } finally {
      enviandoRef.current = false;
    }
  };

  const elegirInteres = (interes) => {
    trackPopupInterestSelected({ variante: contexto.variante, interes: interes.id, destino: interes.to });
    onSalir();
  };
  const irA = (destino) => () => {
    trackPopupCtaClick({ variante: contexto.variante, destino });
    onSalir();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center px-4 pt-[max(1rem,6vh)] pb-4 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => cerrar('overlay')} aria-hidden="true" />
      {/* Arriba en el celular (no centrado ni pegado abajo): con el teclado
          abierto, iOS tapa lo que está anclado abajo, y el botón de enviar
          tiene que seguir a la vista (RNF-2). */}
      <div
        ref={cajaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-titulo"
        aria-describedby={s.paso === 'exito' ? undefined : 'popup-bajada'}
        className="relative card-glass w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-7 text-center"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 0%, rgba(255,27,141,.6), transparent 55%), radial-gradient(circle at 90% 90%, rgba(58,134,255,.5), transparent 50%)'
          }}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => cerrar('x')}
          className="absolute top-2 right-2 z-10 grid h-11 w-11 place-items-center rounded-full text-lg text-white/50 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="relative">
          {s.paso === 'exito' ? (
            <PopupExito
              pct={pct}
              codigo={s.codigo}
              hayCarrito={hayCarrito}
              conVentana={POPUP_OFERTA.conVentana}
              onInteres={elegirInteres}
              onCatalogo={irA('catalog')}
              onPagar={irA('checkout')}
              tituloRef={tituloRef}
            />
          ) : (
            <PopupCaptura
              pct={pct}
              email={s.email}
              error={s.error}
              enviando={s.paso === 'enviando'}
              onEmail={(email) => dispatch({ type: 'escribir', email })}
              onSubmit={enviar}
              tituloRef={tituloRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}
