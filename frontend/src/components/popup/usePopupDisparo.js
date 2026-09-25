import { useEffect, useRef } from 'react';
import { POPUP_CONFIG } from '../../config/popup.js';
import { disparoCumplido, porcentajeScroll } from '../../lib/popupReglas.js';
import { leerSesion } from '../../lib/popupEstado.js';

/**
 * Cuándo se abre SOLO el popup de bienvenida (spec 026).
 *
 * Mientras `activo` sea true (el orquestador ya decidió que la persona es
 * elegible y está en el Home), cada `sondeoMs` se pregunta si se cumplió algún
 * disparo. Cuando se cumple, NO abre de una: espera a que la persona no esté
 * haciendo otra cosa (ver `bloqueado`) y a que pasen `graciaMs` desde la última
 * vez que lo estuvo. Abrir encima de alguien que está escribiendo o que acaba
 * de agregar un calco es exactamente la interrupción que cuesta ventas.
 *
 * Se re-arma en cada visita al Home (el popup anterior solo evaluaba al montar
 * la app, y el que entraba por el checkout y volvía al catálogo ya no lo veía).
 * El tiempo cuenta desde el inicio de la SESIÓN, así que al volver al Home
 * alcanza con los 5 s del piso.
 *
 * @param {{ activo: boolean, esMovil: boolean, umbrales: object, drawerOpen: boolean,
 *           itemsCount: number, onDisparo: (disparo: string) => void }} args
 */
export function usePopupDisparo({ activo, esMovil, umbrales, drawerOpen, itemsCount, onDisparo }) {
  // Todo lo que cambia seguido va en refs: si fueran dependencias del efecto,
  // cada cambio desarmaría el intervalo y reiniciaría el piso de 5 s.
  const drawerRef = useRef(drawerOpen);
  drawerRef.current = drawerOpen;
  const onDisparoRef = useRef(onDisparo);
  onDisparoRef.current = onDisparo;
  const ultimoBloqueo = useRef(0);

  // "Está agregando un producto": el cambio de cantidad de líneas cuenta como
  // bloqueo en ese instante, así la gracia de 3 s corre desde ahí.
  const itemsPrevios = useRef(itemsCount);
  useEffect(() => {
    if (itemsPrevios.current !== itemsCount) ultimoBloqueo.current = Date.now();
    itemsPrevios.current = itemsCount;
  }, [itemsCount]);

  useEffect(() => {
    if (!activo || typeof window === 'undefined') return undefined;

    const llegada = Date.now();
    let scrollMax = null;
    let salida = false;
    let armado = null;
    let huboMovimiento = false;
    let raf = 0;
    let limpio = false;

    const medirScroll = () => {
      raf = 0;
      const pct = porcentajeScroll({
        scrollY: window.scrollY,
        alto: document.documentElement.scrollHeight,
        altoVentana: window.innerHeight
      });
      // Se guarda el MÁXIMO: el que bajó al 30% y volvió a subir ya lo recorrió.
      if (pct != null) scrollMax = Math.max(scrollMax ?? 0, pct);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(medirScroll);
    };

    /** Primer movimiento real del mouse: recién ahí la salida significa algo. */
    const onMovimiento = () => {
      huboMovimiento = true;
      document.removeEventListener('mousemove', onMovimiento);
    };

    /**
     * Intención de salida: el mouse sale por arriba del viewport, camino a la
     * barra de direcciones o a cerrar la pestaña.
     *
     * `relatedTarget` nulo = salió de la ventana y no a otro elemento; `clientY`
     * negativo = se fue por arriba y no por los costados.
     *
     * Pide un `mousemove` previo: algunos navegadores emiten un `mouseout` con
     * clientY 0 apenas carga la página, sin que nadie haya tocado el mouse, y el
     * popup aparecía solo. Tampoco se usa "mouse a menos de 20 px del borde"
     * (como sugería el pedido): el menú del header está pegado arriba y
     * dispararía al ir a usarlo.
     */
    const onSalida = (e) => {
      if (!huboMovimiento || e.relatedTarget || e.clientY > 0) return;
      salida = true;
      tick();
    };

    function bloqueado() {
      const el = document.activeElement;
      const escribiendo =
        el && el !== document.body && el.matches?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
      // Buscador (aria-modal), menú del celular (data-popup-bloqueo) y cualquier
      // diálogo futuro que se declare modal.
      const dialogo = document.querySelector('[aria-modal="true"], [data-popup-bloqueo]');
      return Boolean(escribiendo || dialogo || drawerRef.current || document.visibilityState === 'hidden');
    }

    function tick() {
      const ahora = Date.now();
      if (!armado) {
        const sesion = leerSesion();
        armado = disparoCumplido({
          umbrales,
          esMovil,
          msEnSitio: ahora - (sesion?.inicioEn ?? llegada),
          msEnPagina: ahora - llegada,
          scrollPct: scrollMax,
          senales: {
            productos: sesion?.productos.length || 0,
            busqueda: Boolean(sesion?.busqueda),
            categoria: Boolean(sesion?.categoria)
          },
          salida
        });
        // Una salida que cae antes del piso de 5 s no queda guardada: se
        // cuenta la próxima vez que el mouse se vaya.
        salida = false;
        if (!armado) return;
      }
      if (bloqueado()) {
        ultimoBloqueo.current = ahora;
        return;
      }
      if (ahora - ultimoBloqueo.current < POPUP_CONFIG.graciaMs) return;
      const disparo = armado;
      limpiar();
      onDisparoRef.current?.(disparo);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // Solo con mouse de verdad: en touch no existe el gesto de salida.
    const conMouse = window.matchMedia?.('(pointer: fine)')?.matches;
    if (conMouse) {
      document.addEventListener('mousemove', onMovimiento, { passive: true });
      document.addEventListener('mouseout', onSalida);
    }
    const id = setInterval(tick, POPUP_CONFIG.sondeoMs);
    medirScroll(); // por si llegó ya scrolleado (volver atrás restaura el scroll)

    function limpiar() {
      if (limpio) return;
      limpio = true;
      clearInterval(id);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mousemove', onMovimiento);
      document.removeEventListener('mouseout', onSalida);
    }
    return limpiar;
    // `umbrales` y `esMovil` se deciden una vez por carga; no cambian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);
}
