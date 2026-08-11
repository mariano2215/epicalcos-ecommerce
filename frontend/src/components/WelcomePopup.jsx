import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { captureLead } from '../services/leadService.js';
import { trackLeadCapture } from '../lib/analytics.js';
import { WELCOME_COUPON_STORAGE_KEY } from '../config/pricing.js';

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
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [code, setCode] = useState('');

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

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setStatus('submitting');
    try {
      const { code: promoCode } = await captureLead(email);
      setCode(promoCode);
      setStatus('done');
      markSeen();
      trackLeadCapture('welcome_popup');
      try {
        localStorage.setItem(WELCOME_COUPON_STORAGE_KEY, promoCode);
      } catch {
        /* ignore */
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
          {status === 'done' ? (
            <>
              <div className="text-5xl mb-3">🎁</div>
              <h3 className="font-display font-extrabold text-2xl">¡Listo, gracias!</h3>
              <p className="text-white/70 text-sm mt-2">
                Guardá este código, ya te lo dejamos aplicado en tu carrito:
              </p>
              <div className="mt-4 font-display font-black text-3xl tracking-widest bg-white/5 border border-white/10 rounded-xl py-4">
                {code}
              </div>
              <button onClick={close} className="btn-primary w-full mt-5">Seguir comprando</button>
            </>
          ) : (
            <>
              <div className="text-5xl mb-3">🎁</div>
              <h3 className="font-display font-extrabold text-2xl">10% OFF en tu primera compra</h3>
              <p className="text-white/70 text-sm mt-2">
                Dejanos tu mail y te mandamos el código al toque.
              </p>
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
                  {status === 'submitting' ? 'Enviando…' : 'Quiero mi 10% OFF'}
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
