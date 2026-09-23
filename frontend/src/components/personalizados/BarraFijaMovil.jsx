import { useEffect, useMemo, useState } from 'react';
import { usePromoActive } from '../../lib/promo.js';
import { cotizarTanda } from '../../lib/precioPersonalizados.js';
import { estadoCta } from '../../lib/borradorPersonalizado.js';
import { formatPrice } from '../../lib/formato.js';
import BotonCta from './BotonCta.jsx';
import { useBorrador } from './useBorrador.js';
import { IDS } from './acciones.js';

/**
 * Barra fija inferior, solo < lg (RF-M1…M3). Es el MISMO CTA del hero.
 *
 * Está siempre que el CTA del hero NO esté a la vista (arriba o abajo) y se va
 * al llegar al CTA final: con los dos a la vista serían dos botones iguales
 * apilados, y al pie de la página taparía el footer.
 *
 * ⚠️ Mide pt-3 + 44 px + pb-3 + safe-area = 4,25 rem + safe-area. El botón de
 * WhatsApp se eleva 6 rem en /personalizados (ver `WhatsAppButton.jsx`): si esta
 * barra crece, el botón queda encima de ella.
 */
export default function BarraFijaMovil() {
  const [estado] = useBorrador();
  const promoActiva = usePromoActive();
  // Arranca oculta hasta que el observer diga dónde está el CTA del hero.
  const [heroVisible, setHeroVisible] = useState(true);
  const [finalAlcanzado, setFinalAlcanzado] = useState(false);

  const tipoCta = estadoCta(estado).tipo;
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const hero = document.getElementById(IDS.ctaHero);
    const fin = document.getElementById(IDS.ctaFinal);
    // Visible también cuando el CTA del hero todavía está ABAJO del fold (en un
    // celular lo está al entrar): así "Subir mi diseño" queda a mano desde el
    // primer momento. El margen de abajo es la franja del botón de WhatsApp
    // (elevado 6 rem + su alto): un CTA del hero que pasa por ahí queda tapado
    // por el botón, así que para esta barra cuenta como "no visible".
    const ioHero = new IntersectionObserver((es) => setHeroVisible(es[es.length - 1].isIntersecting), {
      rootMargin: '0px 0px -160px 0px'
    });
    const ioFin = new IntersectionObserver((es) => {
      const e = es[es.length - 1];
      setFinalAlcanzado(e.isIntersecting || e.boundingClientRect.top < 0);
    });
    if (hero) ioHero.observe(hero);
    if (fin) ioFin.observe(fin);
    return () => {
      ioHero.disconnect();
      ioFin.disconnect();
    };
    // Se re-observa si el CTA del hero cambia de estado (por si React cambia el nodo).
  }, [tipoCta]);

  const disenos = Math.max(1, estado.disenos.length);
  const unidades = disenos * estado.copias;
  // Mismo cálculo que HeroConfigurador (enmienda 22/9/2026): sin `material` acá
  // esta barra mostraba el total SIN el recargo del holográfico mientras el CTA
  // del hero sí lo mostraba — dos precios distintos para el mismo "Agregar".
  const cotizacion = useMemo(
    () => cotizarTanda({ tamano: estado.tamano, unidades, promoActiva, material: estado.material, disenos }),
    [estado.tamano, unidades, promoActiva, estado.material, disenos]
  );
  const visible = !heroVisible && !finalAlcanzado;

  return (
    <div
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bg-deep/95 backdrop-blur px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-transform duration-200 motion-reduce:transition-none ${
        visible ? 'translate-y-0' : 'translate-y-full invisible'
      }`}
      aria-hidden={!visible}
    >
      <div className="container-app !px-0 flex items-center gap-3">
        <div className="min-w-0 flex-1 text-xs text-white/60 leading-tight">
          {estado.disenos.length > 0 && cotizacion.configuracionCompleta ? (
            <>
              <div className="font-display font-extrabold text-base text-white tabular-nums">{formatPrice(cotizacion.total)}</div>
              {estado.disenos.length} diseño{estado.disenos.length === 1 ? '' : 's'} · {cotizacion.unidades} calco
              {cotizacion.unidades === 1 ? '' : 's'}
            </>
          ) : estado.disenos.length > 0 ? (
            'Elegí el tamaño'
          ) : (
            'Tu imagen, hecha calco'
          )}
        </div>
        <div className="shrink-0 w-[62%]">
          <BotonCta estado={estado} total={cotizacion.total} origen="sticky" className="!py-2.5 !px-3 text-sm !min-h-[44px]" />
        </div>
      </div>
    </div>
  );
}
