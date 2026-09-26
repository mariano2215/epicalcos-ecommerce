import { useCallback } from 'react';
import { useCart } from '../../context/CartContext.jsx';
import { usePromoActive } from '../../lib/promo.js';
import { formatPrice } from '../../lib/formato.js';
import {
  estadoCta,
  construirLineas,
  construirLineasNegocio,
  construirLineaHolografica,
  disenosListos
} from '../../lib/borradorPersonalizado.js';
import { precioEfectivoTanda } from '../../lib/precioPersonalizados.js';
import { trackPersonalizedAddToCart } from '../../lib/analytics.js';
import { CTA } from '../../config/personalizadosLanding.js';
import { MATERIAL_HOLOGRAFICO_ID, RECARGO_HOLOGRAFICO } from '../../config/personalizados.js';
import { customImageDataUri } from './swatches.jsx';
import { borrador } from './useBorrador.js';
import { IDS, abrirSelector, irA } from './acciones.js';

/** Agrega la línea de recargo del pack holográfico, ligada por el último segmento del id del pack. */
function agregarRecargoHolografico(addFixed, idLigado) {
  addFixed(
    {
      id: `${RECARGO_HOLOGRAFICO.id}:${idLigado}`,
      name: 'Recargo · Vinilo Holográfico',
      categoryLabel: 'Personalizados',
      price: RECARGO_HOLOGRAFICO.precio
    },
    1
  );
}

/**
 * "Agregar al carrito" (D-1): UNA línea por diseño, con el link de su archivo
 * adentro, y el carrito lateral se abre UNA vez al final (con 20 diseños serían
 * 20 drawers y 20 toasts). El mismo hook lo usan el hero y la barra fija.
 *
 * Enmienda 22/9/2026 ("topear el precio en $39.999"): un solo diseño en
 * NEGOCIO.size cuyas copias ya cuestan lo mismo o más que la Promo Negocio se
 * agrega COMO Negocio (mismo producto de `/negocio`, ya probado) en vez de
 * como calcos `custom:` sueltos — así el total nunca queda por encima de lo
 * que cuesta tomar la promo. Con más de un diseño no aplica: Negocio es
 * específicamente "100 de UN diseño" (ver precioPersonalizados.js).
 *
 * El "¿topea?" y el "¿cuántos packs?" salen de `precioEfectivoTanda()` —la
 * MISMA cuenta que arma el total que se muestra—, no de una cuenta propia de
 * acá: hasta el 26/9/2026 esto repetía la condición por su cuenta, y dos
 * cuentas de la misma regla terminan diciendo cosas distintas.
 *
 * Enmienda 26/9/2026: Vinilo Holográfico va SIEMPRE como pack de 100 (una
 * línea para toda la tanda + su recargo), antes que cualquier otra cuenta —
 * `construirLineas()` ni siquiera emite líneas holográficas sueltas.
 */
export function useAgregarAlCarrito() {
  const { addCustom, addFixed, addNegocio, openDrawer } = useCart();
  const promoActiva = usePromoActive();
  return useCallback(() => {
    const store = borrador();
    const e = store.leer();
    if (estadoCta(e).tipo !== 'agregar') return;
    const disenos = disenosListos(e);
    const esHolografico = e.material === MATERIAL_HOLOGRAFICO_ID;
    const c = precioEfectivoTanda({ tamano: e.tamano, copias: e.copias, disenos: disenos.length, promoActiva, material: e.material });
    let itemsParaTrack; // lo que en verdad quedó en el carrito, para GA4/Meta (nunca una línea fantasma)

    if (esHolografico) {
      const ts = Date.now();
      const pack = construirLineaHolografica(e, { imagenGenerica: customImageDataUri(), ts });
      if (!pack) return;
      addNegocio(pack);
      agregarRecargoHolografico(addFixed, ts);
      itemsParaTrack = [{ ...pack, price: pack.basePrice }];
    } else if (c.esNegocio) {
      const lineas = construirLineasNegocio(e, {
        packs: c.packsNegocio,
        sueltas: c.sueltas,
        imagenGenerica: customImageDataUri()
      });
      if (!lineas.length) return;
      for (const l of lineas) {
        if (l.id.startsWith('negocio:')) addNegocio(l);
        else addCustom(l, { openDrawer: false, silent: true });
      }
      itemsParaTrack = lineas.map((l) => ({ ...l, price: l.id.startsWith('negocio:') ? l.basePrice : c.unitarioSueltas }));
    } else {
      const lineas = construirLineas(e, { imagenGenerica: customImageDataUri() });
      if (!lineas.length) return;
      for (const l of lineas) addCustom(l, { openDrawer: false, silent: true });
      itemsParaTrack = lineas.map((l) => ({ ...l, price: c.unitario }));
    }

    trackPersonalizedAddToCart({
      size: e.tamano,
      designs: disenos.length,
      units: c.unidades,
      value: c.total,
      material: e.material,
      items: itemsParaTrack
    });
    store.marcarAgregado();
    openDrawer();
  }, [addCustom, addFixed, addNegocio, openDrawer, promoActiva]);
}

/**
 * El CTA de tres estados (RF-C6) más los de paso. Es el MISMO en el hero y en
 * la barra fija: los dos leen `estadoCta()` del borrador, así que no pueden
 * decir cosas distintas.
 *
 *   sin diseño            → Subir mi diseño      (abre el selector)
 *   diseño, sin tamaño    → Crear mi calco       (lleva al tamaño)
 *   subiendo              → Subiendo tu diseño…  (espera: D-2)
 *   algún error           → Revisá tus diseños   (lleva a la lista)
 *   todo listo            → Agregar al carrito · $total
 *   recién agregado       → ✓ Tu calco está en el carrito
 */
export default function BotonCta({ estado, total, origen = 'hero', className = '', id }) {
  const agregar = useAgregarAlCarrito();
  const { openDrawer } = useCart();
  const cta = estadoCta(estado);

  const base = `btn-primary w-full min-h-[48px] ${className}`;

  switch (cta.tipo) {
    case 'subir':
      return (
        <button id={id} type="button" className={base} onClick={() => abrirSelector(origen)}>
          {CTA.subir}
        </button>
      );
    case 'crear':
      return (
        <button id={id} type="button" className={base} onClick={() => irA(IDS.tamano, '[role="radio"][tabindex="0"]')}>
          {CTA.crear}
        </button>
      );
    case 'esperando':
      return (
        <button id={id} type="button" className={base} disabled aria-live="polite">
          {CTA.esperando} {cta.progreso} %
        </button>
      );
    case 'revisar':
      return (
        <button id={id} type="button" className={base} onClick={() => irA(IDS.lista)}>
          {CTA.revisar}
        </button>
      );
    case 'agregado':
      return (
        <button id={id} type="button" className={`${base} !bg-none !bg-emerald-600 !shadow-none`} onClick={openDrawer} aria-live="polite">
          {CTA.agregado}
        </button>
      );
    default:
      return (
        <button id={id} type="button" className={base} onClick={agregar}>
          {CTA.agregar} · <span className="tabular-nums">{formatPrice(total)}</span>
        </button>
      );
  }
}
