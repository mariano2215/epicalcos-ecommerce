import { useEffect } from 'react';
import { trackPromoUnlock } from './analytics.js';

/**
 * Avisa a analytics UNA vez que el carrito cruzó un umbral y desbloqueó un
 * beneficio (el 10 % por transferencia, el envío gratis).
 *
 * ⚠️ POR QUÉ EL REGISTRO ES DE MÓDULO Y NO DE COMPONENTE: los medidores viven a
 * la vez en el carrito lateral y en /carrito. Estando en /carrito con el drawer
 * abierto, los DOS están montados y los dos verían el mismo desbloqueo — el
 * informe contaría el doble. Con el registro fuera de React, el primero que
 * llega avisa y el segundo se calla.
 *
 * Al bajar del umbral el desbloqueo se olvida: sacar dos calcos y volver a
 * ponerlas es volver a desbloquearlo, y eso es exactamente lo que se quiere
 * medir (cuánta gente sube el carrito para llegar).
 */
const reportados = new Set();

/** Sólo para los tests. */
export const _resetDesbloqueos = () => reportados.clear();

export function useAvisoDesbloqueo(promo, umbral, alcanzado) {
  useEffect(() => {
    if (!alcanzado) {
      reportados.delete(promo);
      return;
    }
    if (reportados.has(promo)) return;
    reportados.add(promo);
    trackPromoUnlock(promo, umbral);
  }, [promo, umbral, alcanzado]);
}
