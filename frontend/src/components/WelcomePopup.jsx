import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { POPUP_CONFIG, POPUP_OFERTA, POPUP_VARIANTES } from '../config/popup.js';
import { CUPON_VENTANA_MS } from '../config/pricing.js';
import { EXPERIMENTS, getVariant } from '../lib/experiments.js';
import {
  popupPermitido,
  accesoVisible,
  porcentajeOferta,
  porcentajeCupon,
  beneficioActivo,
  puedeAbrirSolo
} from '../lib/popupReglas.js';
import {
  iniciarSesion,
  leerEstado,
  leerSesion,
  registrarSenal,
  marcarAutoAbierto,
  registrarVisto,
  registrarCerrado,
  registrarConvertido,
  storageOk,
  usePopupVersion
} from '../lib/popupEstado.js';
import { emitirCupon, leerCupon } from '../lib/cuponVentana.js';
import {
  trackPopupView,
  trackPopupClose,
  trackLeadCapture,
  trackCuponEmitido,
  trackExperimentView,
  setPopupUserProperties
} from '../lib/analytics.js';
import { usePopupDisparo } from './popup/usePopupDisparo.js';

/**
 * Popup de bienvenida: el orquestador (spec 026).
 *
 * Decide si la persona es elegible, arma el disparo, carga el diálogo cuando
 * hace falta y muestra el acceso fijo del 10%. Las reglas viven en
 * lib/popupReglas.js (testeadas); la memoria en lib/popupEstado.js; la pantalla
 * en ./popup/PopupDialogo.jsx, que se baja aparte.
 *
 * HISTORIA DEL DISPARO (no volver a cometer lo mismo):
 *  1. Al principio fuera del Home abría con 600 px de scroll: en una categoría
 *     eso cae apenas empieza a bajar por la grilla, y el modal le tapaba la
 *     pantalla justo en el momento de más intención de compra.
 *  2. Pasó a pedir 2.600 px de scroll Y 20 s (o la salida del mouse), y en el
 *     Home abría al ver las categorías destacadas.
 *  3. Spec 026 (25/9/2026): el popup se abre SOLO EN EL HOME (decisión de
 *     Mariano), con 12 s o 30% de scroll en la compu, 15 s o 50% en el celular,
 *     o por señales de interés juntadas en todo el sitio. Que ahí alcance con
 *     una condición ("o") es seguro porque ya no aparece sobre la grilla ni la
 *     ficha, y porque nunca abre mientras la persona escribe, busca, tiene el
 *     carrito abierto o acaba de agregar un calco (ver usePopupDisparo).
 */

const cargarDialogo = () => import('./popup/PopupDialogo.jsx');
// El acceso fijo también baja aparte: solo lo necesita quien ya vio el popup,
// y el visitante nuevo del Home no tiene por qué pagarlo en el bundle.
const cargarAcceso = () => import('./popup/AccesoBeneficio.jsx');

/** Exposición del A/B: una vez por carga de página, no por render. */
let exposicionReportada = false;

export default function WelcomePopup() {
  const { pathname } = useLocation();
  const { totalItems, drawerOpen } = useCart();
  usePopupVersion(); // re-render cuando cambia el estado o el cupón

  // Lo que se decide UNA vez por carga: dispositivo, variante y si hay storage.
  const [ctx] = useState(() => {
    const variante = getVariant('popup_disparo') || 'b_12s';
    const esMovil = typeof window === 'undefined' || !window.matchMedia?.('(pointer: fine)')?.matches;
    return {
      variante,
      esMovil,
      dispositivo: esMovil ? 'mobile' : 'desktop',
      umbrales: POPUP_VARIANTES[variante] || POPUP_VARIANTES.b_12s,
      storageOk: storageOk()
    };
  });

  const [iniciado, setIniciado] = useState(false);
  const [abierto, setAbierto] = useState(null); // { Dialogo, disparo }
  const disparoRef = useRef(null);
  // ¿Esta apertura ya convirtió? Decide si un cierre cuenta como del paso 1 o 2.
  const convirtioRef = useRef(false);

  // Arranca la sesión (y migra el `seen` del popup anterior) y re-marca las
  // propiedades de usuario en cada carga, así el `purchase` también las lleva.
  useEffect(() => {
    iniciarSesion(pathname);
    const e = leerEstado();
    setPopupUserProperties({ exposed: Boolean(e.vistoEn), converted: Boolean(e.convertidoEn) });
    setIniciado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Señales de interés: se juntan en TODO el sitio, aunque el popup solo abra
  // en el Home. La búsqueda la registra BuscadorCalcos (no cambia la ruta).
  useEffect(() => {
    if (/^\/producto\//.test(pathname)) registrarSenal('producto', pathname);
    else if (/^\/categoria\//.test(pathname)) registrarSenal('categoria', pathname);
  }, [pathname]);

  const cerrar = useCallback(
    (metodo, paso) => {
      if (paso === 'capture') registrarCerrado();
      trackPopupClose({ variante: ctx.variante, paso, metodo });
      setAbierto(null);
    },
    [ctx]
  );

  // Atrás del navegador con el popup abierto: se cierra. Un CTA del paso 2 ya
  // lo cerró antes de navegar (`onSalir`), así que no cuenta como cierre.
  const rutaPrevia = useRef(pathname);
  useEffect(() => {
    if (rutaPrevia.current === pathname) return;
    rutaPrevia.current = pathname;
    if (abierto) cerrar('navigation', convirtioRef.current ? 'success' : 'capture');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const abrir = useCallback(
    (disparo, auto) => {
      cargarDialogo()
        .then((mod) => {
          // Mientras bajaba el chunk pudo haberse ido del Home.
          if (!popupPermitido(window.location.pathname)) return;
          if (auto) marcarAutoAbierto();
          registrarVisto();
          disparoRef.current = disparo;
          convirtioRef.current = false;
          setAbierto({ Dialogo: mod.default, disparo });
          trackPopupView({
            variante: ctx.variante,
            disparador: disparo,
            dispositivo: ctx.dispositivo,
            visitante: leerSesion()?.visitante || 'new',
            pagina: window.location.pathname
          });
        })
        .catch(() => {
          // El chunk no bajó (red cortada): no se abre y NO se marca como
          // visto, así no se pierde la oportunidad por un error nuestro.
        });
    },
    [ctx]
  );

  const convertir = useCallback(
    (codigo) => {
      convirtioRef.current = true;
      emitirCupon(codigo, { conVentana: POPUP_OFERTA.conVentana });
      registrarConvertido();
      trackLeadCapture('welcome_popup', {
        popup_variant: ctx.variante,
        popup_trigger: disparoRef.current,
        device_type: ctx.dispositivo,
        user_properties: { popup_converted: 'true' }
      });
      trackCuponEmitido(codigo, POPUP_OFERTA.conVentana ? CUPON_VENTANA_MS : null);
    },
    [ctx]
  );

  // ─── ¿Qué corresponde mostrar? ──────────────────────────────────────────────
  const pct = porcentajeOferta();
  const habilitado = POPUP_CONFIG.activo && pct != null;
  const cupon = leerCupon();
  const cuponActivo = beneficioActivo(cupon);
  const estado = leerEstado();

  const elegible =
    iniciado &&
    habilitado &&
    !abierto &&
    popupPermitido(pathname) &&
    puedeAbrirSolo({
      estado,
      sesion: leerSesion(),
      cuponActivo,
      storageOk: ctx.storageOk,
      ahora: Date.now()
    });

  usePopupDisparo({
    activo: elegible,
    esMovil: ctx.esMovil,
    umbrales: ctx.umbrales,
    drawerOpen,
    itemsCount: totalItems,
    onDisparo: (disparo) => abrir(disparo, true)
  });

  // El acceso "oferta" es para quien ya vio el popup y no dejó el mail. Con
  // storage bloqueado el popup nunca abre solo, así que el acceso es la única
  // forma de llegar a la oferta: se muestra desde el principio.
  const tipoAcceso = !habilitado
    ? null
    : cuponActivo
      ? 'activo'
      : !estado.compradoEn && (!ctx.storageOk || estado.vistoEn || estado.cerradoEn)
        ? 'oferta'
        : null;
  const mostrarAcceso = Boolean(iniciado && !abierto && tipoAcceso && accesoVisible(pathname, tipoAcceso));

  // Con `import()` a mano y no `React.lazy`: sin un error boundary, un chunk que
  // no baja tiraría la app entera. Así, si falla, simplemente no hay acceso.
  const [Acceso, setAcceso] = useState(null);
  useEffect(() => {
    if (!mostrarAcceso || Acceso) return undefined;
    let vigente = true;
    cargarAcceso()
      .then((mod) => vigente && setAcceso(() => mod.default))
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [mostrarAcceso, Acceso]);

  // Baja el chunk del diálogo cuando se cumple el piso de 5 s (antes de eso
  // ningún disparo puede abrir, y así no compite con la carga del Home): el
  // disparo que llegue después abre sin esperar la red.
  const precargar = elegible || tipoAcceso === 'oferta';
  useEffect(() => {
    if (!precargar) return undefined;
    const t = setTimeout(() => cargarDialogo().catch(() => {}), POPUP_CONFIG.minMsEnPagina);
    return () => clearTimeout(t);
  }, [precargar]);

  useEffect(() => {
    if (!elegible || exposicionReportada || !EXPERIMENTS.popup_disparo?.active) return;
    exposicionReportada = true;
    trackExperimentView({ id: 'popup_disparo', variant: ctx.variante });
  }, [elegible, ctx]);

  const Dialogo = abierto?.Dialogo;

  return (
    <>
      {mostrarAcceso && Acceso && (
        <Acceso
          tipo={tipoAcceso}
          pct={tipoAcceso === 'activo' ? porcentajeCupon(cupon.code) : pct}
          codigo={cupon?.code}
          pathname={pathname}
          onAbrir={() => abrir('manual', false)}
        />
      )}
      {Dialogo && (
        <Dialogo
          pct={pct}
          contexto={ctx}
          hayCarrito={totalItems > 0}
          onCerrar={cerrar}
          onConvertido={convertir}
          onSalir={() => setAbierto(null)}
        />
      )}
    </>
  );
}
