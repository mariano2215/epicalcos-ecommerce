import { useCallback } from 'react';
import { useCart } from '../../context/CartContext.jsx';
import { usePromoActive } from '../../lib/promo.js';
import { formatPrice } from '../../lib/formato.js';
import { estadoCta, construirLineas } from '../../lib/borradorPersonalizado.js';
import { cotizarTanda } from '../../lib/precioPersonalizados.js';
import { trackPersonalizedAddToCart } from '../../lib/analytics.js';
import { CTA } from '../../config/personalizadosLanding.js';
import { MATERIAL_HOLOGRAFICO_ID, RECARGO_HOLOGRAFICO } from '../../config/personalizados.js';
import { customImageDataUri } from './swatches.jsx';
import { borrador } from './useBorrador.js';
import { IDS, abrirSelector, irA } from './acciones.js';

/**
 * "Agregar al carrito" (D-1): UNA línea por diseño, con el link de su archivo
 * adentro, y el carrito lateral se abre UNA vez al final (con 20 diseños serían
 * 20 drawers y 20 toasts). El mismo hook lo usan el hero y la barra fija.
 */
export function useAgregarAlCarrito() {
  const { addCustom, addFixed, openDrawer } = useCart();
  const promoActiva = usePromoActive();
  return useCallback(() => {
    const store = borrador();
    const e = store.leer();
    if (estadoCta(e).tipo !== 'agregar') return;
    const lineas = construirLineas(e, { imagenGenerica: customImageDataUri() });
    if (!lineas.length) return;
    for (const l of lineas) {
      addCustom(l, { openDrawer: false, silent: true });
      // Recargo fijo por diseño del Vinilo Holográfico (enmienda 22/9/2026,
      // RF-MAT3): línea aparte, quantity 1, nunca mezclada con el unitario de
      // `l` — ver el comentario de `construirLineas()` sobre por qué.
      if (e.material === MATERIAL_HOLOGRAFICO_ID) {
        const disenoId = l.id.split(':').at(-1);
        addFixed(
          {
            id: `${RECARGO_HOLOGRAFICO.id}:${disenoId}`,
            name: 'Recargo · Vinilo Holográfico',
            categoryLabel: 'Personalizados',
            price: RECARGO_HOLOGRAFICO.precio
          },
          1
        );
      }
    }
    const unidades = lineas.length * e.copias;
    const c = cotizarTanda({ tamano: e.tamano, unidades, promoActiva, material: e.material, disenos: lineas.length });
    trackPersonalizedAddToCart({
      size: e.tamano,
      designs: lineas.length,
      units: unidades,
      value: c.total,
      material: e.material,
      items: lineas.map((l) => ({ ...l, price: c.unitario }))
    });
    store.marcarAgregado();
    openDrawer();
  }, [addCustom, addFixed, openDrawer, promoActiva]);
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
