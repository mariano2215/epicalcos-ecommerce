import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { captureLead } from '../services/leadService.js';
import {
  trackLeadCapture,
  trackCuponEmitido,
  trackCuponVencido,
  trackRegaloEmitido,
  trackRegaloVencido
} from '../lib/analytics.js';
import { CUPON_VENTANA_MS, REGALO_BIENVENIDA } from '../config/pricing.js';
import { emitirCupon } from '../lib/cuponVentana.js';
import { emitirRegalo } from '../lib/regaloBienvenida.js';
import CuponCountdown from './CuponCountdown.jsx';
import RegaloCountdown from './RegaloCountdown.jsx';

const SEEN_KEY = 'epicalcos.welcomePopup.seen';
// El popup se dispara cuando, scrolleando, se llega a la sección de categorías
// destacadas del Home (esta id la pone Home.jsx).
const TRIGGER_ID = 'categorias-destacadas';

/**
 * Fallback para las páginas SIN esa sección — sobre todo categoría y ficha de
 * producto, que es donde la persona está mirando diseños.
 *
 * Antes era un scroll de 600 px: en una categoría eso cae apenas empieza a
 * bajar por la grilla, y el modal le tapa la pantalla completa justo en el
 * momento de más intención de compra. Ahora hay que cumplir las DOS
 * condiciones (tiempo real en la página + scroll profundo), o que se vaya:
 * la intención de salida es el único caso donde interrumpir no cuesta nada.
 */
const SCROLL_FALLBACK_PX = 2600;
const MIN_MS_EN_PAGINA = 20_000;
const HIDDEN_ON = ['/checkout', '/carrito'];

export default function WelcomePopup() {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [code, setCode] = useState('');
  /**
   * Qué se ganó, según LA RESPUESTA del servidor y no según el flag local
   * (spec 025). Si el regalo está apagado del lado del servidor, acá llega
   * `'cupon'` y la pantalla de éxito es la de siempre: nunca se muestra un
   * regalo que después no va a estar en la caja.
   */
  const [oferta, setOferta] = useState('cupon');
  const [regalo, setRegalo] = useState(null);
  // El instante de emisión arranca la ventana de 10 minutos (spec 017). Se
  // guarda en estado además de en localStorage para que el contador de este
  // popup no dependa de volver a leer el storage.
  const [emitidoEn, setEmitidoEn] = useState(null);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      /* si localStorage está bloqueado, no molestamos con el popup */
    }
    if (seen) return;
    if (HIDDEN_ON.includes(location.pathname)) return;

    let done = false;
    let huboMovimiento = false;
    const montadoEn = Date.now();
    const cleanup = () => {
      window.removeEventListener('scroll', maybeShow);
      document.removeEventListener('mousemove', onMovimiento);
      document.removeEventListener('mouseout', onSalida);
    };
    function trigger() {
      if (done) return;
      done = true;
      cleanup();
      setVisible(true);
    }

    // En el Home aparece apenas la sección de categorías entra en el viewport.
    // En el resto (categoría, ficha, landings) hace falta scroll profundo Y
    // tiempo en la página: mientras está eligiendo diseños, no se lo interrumpe.
    function maybeShow() {
      const target = document.getElementById(TRIGGER_ID);
      if (target) {
        if (target.getBoundingClientRect().top <= window.innerHeight * 0.9) trigger();
      } else if (
        window.scrollY > SCROLL_FALLBACK_PX &&
        Date.now() - montadoEn > MIN_MS_EN_PAGINA
      ) {
        trigger();
      }
    }

    /** Primer movimiento real del mouse: recién ahí la salida significa algo. */
    function onMovimiento() {
      huboMovimiento = true;
      document.removeEventListener('mousemove', onMovimiento);
    }

    /**
     * Intención de salida: el mouse sale por arriba del viewport, camino a la
     * barra de direcciones o a cerrar la pestaña. Es el único momento en que
     * interrumpir no le cuesta una venta a nadie.
     *
     * `relatedTarget` nulo = salió de la ventana y no a otro elemento; `clientY`
     * negativo = se fue por arriba y no por los costados.
     *
     * Pide además un `mousemove` previo: algunos navegadores emiten un `mouseout`
     * con clientY 0 apenas carga la página, sin que nadie haya tocado el mouse, y
     * el popup aparecía solo — justo la interrupción que este cambio saca.
     */
    function onSalida(e) {
      if (!huboMovimiento) return;
      if (e.relatedTarget || e.clientY > 0) return;
      if (Date.now() - montadoEn < MIN_MS_EN_PAGINA / 2) return;
      trigger();
    }

    window.addEventListener('scroll', maybeShow, { passive: true });
    // Solo con mouse de verdad: en touch no existe el gesto de salida y el
    // disparo queda en manos del scroll profundo + tiempo.
    if (window.matchMedia?.('(pointer: fine)')?.matches) {
      document.addEventListener('mousemove', onMovimiento, { passive: true });
      document.addEventListener('mouseout', onSalida);
    }
    maybeShow(); // por si ya está en viewport al montar
    return cleanup;
    // Solo evaluamos al montar la app (no reabrir al navegar entre páginas).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const close = () => {
    markSeen();
    setVisible(false);
  };

  /**
   * Con el carrito lleno, el botón del popup confirmado lleva derecho a pagar:
   * la ventana son 10 minutos y cada pantalla de más entre el regalo y el
   * checkout se los come. Con el carrito vacío no hay a dónde mandarlo todavía,
   * así que solo se cierra y sigue eligiendo (RF-4).
   */
  const irAComprar = () => {
    const hayCarrito = totalItems > 0;
    close();
    if (hayCarrito) navigate('/checkout');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setStatus('submitting');
    try {
      // Se le PIDE el regalo; el servidor contesta qué se entregó de verdad.
      const res = await captureLead(email, REGALO_BIENVENIDA.activa ? 'regalo' : undefined);
      setStatus('done');
      markSeen();
      trackLeadCapture('welcome_popup');

      if (res?.oferta === 'regalo') {
        setOferta('regalo');
        // Emitir ARRANCA la ventana: de acá salen los 10 minutos que cuenta el
        // contador de abajo, los que muestra el checkout y los que revalida el
        // servidor al crear el pedido.
        setRegalo(emitirRegalo());
        trackRegaloEmitido(res.regalo || REGALO_BIENVENIDA.id, REGALO_BIENVENIDA.ventanaMs);
      } else {
        setOferta('cupon');
        setCode(res?.code);
        const ts = emitirCupon(res?.code);
        setEmitidoEn(ts);
        trackCuponEmitido(res?.code, CUPON_VENTANA_MS);
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
      <div className="relative card-glass w-full max-w-md p-7 text-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(255,27,141,.6), transparent 55%), radial-gradient(circle at 90% 90%, rgba(58,134,255,.5), transparent 50%)' }}
          aria-hidden="true"
        />
        <button
          onClick={close}
          className="absolute top-3 right-3 text-white/50 hover:text-white text-xl leading-none"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="relative">
          {status === 'done' && oferta === 'regalo' ? (
            <>
              <div className="text-5xl mb-3">🎁</div>
              <h3 className="font-display font-extrabold text-2xl">¡Tu pack sorpresa está reservado!</h3>
              <p className="text-white/70 text-sm mt-2">
                Va <strong className="text-white">gratis</strong> adentro de tu pedido si comprás en
                los próximos <strong className="text-white">10 minutos</strong>.
              </p>
              {/* El contador va acá y también en el checkout: uno que la persona
                  no ve mientras completa el formulario no cambia ninguna
                  conducta. `donde: 'popup'` distingue al que nunca avanzó del
                  que lo perdió comprando — ese segundo es el caso caro. */}
              <RegaloCountdown
                regalo={regalo}
                onVencido={() => trackRegaloVencido(REGALO_BIENVENIDA.id, 'popup')}
                className="mt-4 justify-center"
              />
              <button onClick={irAComprar} className="btn-primary w-full mt-5">
                {totalItems > 0 ? 'Ir a pagar' : 'Elegir mis calcos'}
              </button>
            </>
          ) : status === 'done' ? (
            <>
              <div className="text-5xl mb-3">🎁</div>
              <h3 className="font-display font-extrabold text-2xl">¡Listo, gracias!</h3>
              <p className="text-white/70 text-sm mt-2">
                Ya te lo dejamos aplicado en tu carrito. Tenés{' '}
                <strong className="text-white">10 minutos</strong> para usarlo:
              </p>
              <div className="mt-4 font-display font-black text-3xl tracking-widest bg-white/5 border border-white/10 rounded-xl py-4">
                {code}
              </div>
              {/* El contador va acá y también en el checkout: uno que la persona
                  no ve mientras completa el formulario no cambia ninguna
                  conducta. `donde: 'popup'` distingue al que nunca avanzó del
                  que se le venció comprando — ese segundo es el caso caro. */}
              <CuponCountdown
                cupon={{ code, emitidoEn }}
                onVencido={() => trackCuponVencido(code, 'popup')}
                className="mt-4 justify-center"
              />
              <button onClick={close} className="btn-primary w-full mt-5">Comprar ahora</button>
            </>
          ) : (
            <>
              <div className="text-5xl mb-3">🎁</div>
              {REGALO_BIENVENIDA.activa ? (
                <>
                  <h3 className="font-display font-extrabold text-2xl">
                    Pack de stickers sorpresa GRATIS
                  </h3>
                  <p className="text-white/70 text-sm mt-2">
                    Dejanos tu mail y te lo sumamos a tu pedido, sin cargo, si comprás en los
                    próximos 10 minutos.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-display font-extrabold text-2xl">10% OFF en tu primera compra</h3>
                  <p className="text-white/70 text-sm mt-2">
                    Dejanos tu mail y te mandamos el código al toque.
                  </p>
                </>
              )}
              <form onSubmit={submit} className="mt-5 flex flex-col gap-2.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="input-dark text-center"
                />
                <button type="submit" disabled={status === 'submitting'} className="btn-primary w-full">
                  {status === 'submitting'
                    ? 'Enviando…'
                    : REGALO_BIENVENIDA.activa
                      ? 'Quiero mi pack sorpresa'
                      : 'Quiero mi 10% OFF'}
                </button>
              </form>
              {status === 'error' && (
                <p className="text-brand-pink text-xs mt-2">No pudimos registrar tu mail. Probá de nuevo.</p>
              )}
              <p className="text-white/40 text-[11px] mt-3">
                Sin spam. Solo novedades y promos de EPICALCOS.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
