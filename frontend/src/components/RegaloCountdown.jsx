import { useEffect, useRef, useState } from 'react';
import { msRestantesRegalo } from '../lib/regaloBienvenida.js';
import { REGALO_BIENVENIDA } from '../config/pricing.js';

const pad2 = (n) => String(n).padStart(2, '0');

/** Bajo este umbral el contador cambia de tono: es el último minuto. */
const ULTIMO_MINUTO_MS = 60_000;

/**
 * Cuenta regresiva del pack de stickers sorpresa (spec 025).
 *
 * El MISMO componente va en el popup —donde se entrega— y en el checkout
 * —donde se cobra—, por lo mismo que `CuponCountdown`: un contador que la
 * persona no ve mientras completa el formulario no cambia ninguna conducta, y
 * uno que aparece de golpe al vencer se lee como un error del sitio.
 *
 * ⚠️ NO se parametrizó `CuponCountdown` para servir a los dos. Ese componente
 * está atado a `msRestantes(cupon)` y al copy del 10 %, y sigue vivo: es lo que
 * vuelve si se apaga el regalo. Generalizarlo sería refactorizar algo que
 * funciona en el mismo diff que estrena una promo (CLAUDE.md, regla 8). El
 * costo es la lógica de intervalo duplicada, anotada como hallazgo en tasks.md.
 *
 * ⚠️ ACCESIBILIDAD: `aria-live` iría gritando la hora cada segundo. El contador
 * visible es `aria-hidden` y al lado va un texto para lector de pantalla que se
 * anuncia UNA vez al montar y otra al vencer.
 *
 * ⚠️ `onVencido` se llama UNA sola vez. El checkout lo usa para sacar la línea
 * del regalo y disparar analytics: llamarlo en cada tick sería un evento por
 * segundo.
 *
 * @param {{ regalo: {regalo:string, emitidoEn:number}|null,
 *           onVencido?: () => void, className?: string, compacto?: boolean }} props
 */
export default function RegaloCountdown({ regalo, onVencido, className = '', compacto = false }) {
  const [restante, setRestante] = useState(() => msRestantesRegalo(regalo));
  const avisado = useRef(false);
  // `onVencido` en una ref y no en las deps del efecto: el llamador la pasa
  // inline, así que cambiaría de identidad en cada render y recrearía el
  // intervalo una vez por segundo.
  const onVencidoRef = useRef(onVencido);
  onVencidoRef.current = onVencido;

  useEffect(() => {
    avisado.current = false;
    setRestante(msRestantesRegalo(regalo));
    if (!regalo?.emitidoEn) return undefined;

    const tick = () => {
      const ms = msRestantesRegalo(regalo);
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
  }, [regalo]);

  if (!regalo?.emitidoEn) return null;

  const seg = Math.ceil(restante / 1000);
  const mm = Math.floor(seg / 60);
  const ss = seg % 60;
  const urgente = restante <= ULTIMO_MINUTO_MS;

  // Al vencer se anuncia acá (ANF-3: el lector de pantalla tiene que enterarse
  // del cierre, no solo de la apertura). En el checkout este bloque no llega a
  // verse porque `vencerRegalo` desmonta el contador y pone su propio aviso —
  // que además explica que el pedido no cambió; en el popup, este es el aviso.
  if (restante <= 0) {
    return (
      <div
        className={`rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/60 ${className}`}
        role="status"
      >
        ⌛ Se terminó el tiempo de tu pack sorpresa.
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border flex items-center gap-2 ${
        compacto ? 'px-3 py-1.5' : 'px-3 py-2'
      } ${
        urgente
          ? 'border-brand-pink/60 bg-brand-pink/15'
          : 'border-emerald-400/40 bg-emerald-400/10'
      } ${className}`}
    >
      <span aria-hidden>{urgente ? '⏳' : '🎁'}</span>
      <span
        className={`${compacto ? 'text-[13px]' : 'text-sm'} ${
          urgente ? 'text-white' : 'text-emerald-300'
        }`}
        aria-hidden
      >
        {compacto ? 'Tu pack sorpresa:' : 'Tu pack sorpresa te espera'}{' '}
        <strong className="tabular-nums font-display font-extrabold">
          {pad2(mm)}:{pad2(ss)}
        </strong>
      </span>
      {/* Se anuncia al montar; después el contador visible queda oculto para el
          lector para no repetir la hora cada segundo.

          La variante compacta NO lo anuncia: en el checkout conviven las dos
          (la banda de arriba en mobile y la del resumen), y dos `role="status"`
          con el mismo texto le leen la misma frase dos veces seguidas. */}
      {!compacto && (
        <span className="sr-only" role="status">
          Tu {REGALO_BIENVENIDA.titulo.toLowerCase()} de regalo vence en {mm} minutos y {ss} segundos.
        </span>
      )}
    </div>
  );
}
