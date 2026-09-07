import { useEffect, useRef, useState } from 'react';
import { msRestantes } from '../lib/cuponVentana.js';

const pad2 = (n) => String(n).padStart(2, '0');

/** Bajo este umbral el contador cambia de tono: es el último minuto. */
const ULTIMO_MINUTO_MS = 60_000;

/**
 * Cuenta regresiva de la ventana del cupón de bienvenida (spec 017).
 *
 * El MISMO componente va en el popup —donde se entrega— y en el checkout
 * —donde se usa—. Que estén los dos no es redundancia: un contador que la
 * persona no ve mientras completa el formulario no cambia ninguna conducta, y
 * uno que aparece de golpe al vencer se lee como un error del sitio.
 *
 * ⚠️ ACCESIBILIDAD: `aria-live` iría gritando la hora cada segundo. El contador
 * visible es `aria-hidden` y al lado va un texto para lector de pantalla que se
 * anuncia UNA vez al montar y otra al vencer — mismo criterio que
 * `AnnouncementBar` y que el `aria-label` de `PromoCountdown`.
 *
 * ⚠️ `onVencido` se llama UNA sola vez. El checkout lo usa para sacar el cupón
 * y recalcular el total: llamarlo en cada tick dispararía un recálculo por
 * segundo y, peor, un evento de analytics por segundo.
 *
 * @param {{ cupon: {code:string, emitidoEn:number|null},
 *           onVencido?: () => void, className?: string, compacto?: boolean }} props
 */
export default function CuponCountdown({ cupon, onVencido, className = '', compacto = false }) {
  const [restante, setRestante] = useState(() => msRestantes(cupon));
  const avisado = useRef(false);
  // `onVencido` en una ref y no en las deps del efecto: el llamador la pasa
  // inline, así que cambiaría de identidad en cada render y recrearía el
  // intervalo una vez por segundo.
  const onVencidoRef = useRef(onVencido);
  onVencidoRef.current = onVencido;

  useEffect(() => {
    avisado.current = false;
    setRestante(msRestantes(cupon));
    if (!Number.isFinite(msRestantes(cupon))) return undefined; // sin ventana

    const tick = () => {
      const ms = msRestantes(cupon);
      setRestante(ms);
      if (ms <= 0 && !avisado.current) {
        avisado.current = true;
        clearInterval(id);
        onVencidoRef.current?.();
      }
    };
    // Se recalcula desde Date.now() en cada tick en vez de restar 1000: si la
    // pestaña queda en segundo plano el navegador espacia los timers, y un
    // contador que descuenta de a uno se quedaría atrasado respecto del reloj
    // real — mostraría tiempo que ya no existe.
    const id = setInterval(tick, 500);
    tick();
    return () => clearInterval(id);
  }, [cupon]);

  // Este cupón no tiene ventana (lo tipearon a mano, o es EPI50): no hay contador.
  if (!Number.isFinite(restante)) return null;

  const seg = Math.ceil(restante / 1000);
  const mm = Math.floor(seg / 60);
  const ss = seg % 60;
  const urgente = restante <= ULTIMO_MINUTO_MS;
  const vencido = restante <= 0;

  if (vencido) {
    return (
      <div
        className={`rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/60 ${className}`}
        role="status"
      >
        ⌛ Se cerró la ventana de tu 10% OFF.
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border px-3 py-2 flex items-center gap-2 ${
        urgente
          ? 'border-brand-pink/60 bg-brand-pink/15'
          : 'border-emerald-400/40 bg-emerald-400/10'
      } ${className}`}
    >
      <span aria-hidden>{urgente ? '⏳' : '🎁'}</span>
      <span className={`text-sm ${urgente ? 'text-white' : 'text-emerald-300'}`}>
        {compacto ? 'Tu 10% OFF vence en' : 'Tu 10% OFF vence en'}{' '}
        <strong className="tabular-nums font-display font-extrabold">
          {pad2(mm)}:{pad2(ss)}
        </strong>
      </span>
      {/* Se anuncia al montar; después el contador visible queda oculto para el
          lector para no repetir la hora cada segundo. */}
      <span className="sr-only" role="status">
        Tu cupón de 10% de descuento vence en {mm} minutos y {ss} segundos.
      </span>
    </div>
  );
}
