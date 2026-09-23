import { useCallback } from 'react';
import { useCart } from '../../context/CartContext.jsx';
import { usePromoActive } from '../../lib/promo.js';
import { formatPrice } from '../../lib/formato.js';
import { estadoCta, construirLineas, disenosListos } from '../../lib/borradorPersonalizado.js';
import { precioEfectivoTanda, convieneNegocio } from '../../lib/precioPersonalizados.js';
import { trackPersonalizedAddToCart } from '../../lib/analytics.js';
import { CTA } from '../../config/personalizadosLanding.js';
import { MATERIAL_HOLOGRAFICO_ID, RECARGO_HOLOGRAFICO } from '../../config/personalizados.js';
import { NEGOCIO } from '../../config/pricing.js';
import { customImageDataUri } from './swatches.jsx';
import { borrador } from './useBorrador.js';
import { IDS, abrirSelector, irA } from './acciones.js';

/** Agrega la línea de recargo del Vinilo Holográfico, ligada por id a `disenoId` (RF-MAT3). */
function agregarRecargoHolografico(addFixed, disenoId) {
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
 */
export function useAgregarAlCarrito() {
  const { addCustom, addFixed, addNegocio, openDrawer } = useCart();
  const promoActiva = usePromoActive();
  return useCallback(() => {
    const store = borrador();
    const e = store.leer();
    if (estadoCta(e).tipo !== 'agregar') return;
    const disenos = disenosListos(e);
    const esNegocio =
      disenos.length === 1 &&
      e.tamano === NEGOCIO.size &&
      convieneNegocio({ tamano: e.tamano, copias: e.copias, promoActiva });

    const c = precioEfectivoTanda({ tamano: e.tamano, copias: e.copias, disenos: disenos.length, promoActiva, material: e.material });
    let itemsParaTrack; // lo que en verdad quedó en el carrito, para GA4/Meta (nunca una línea fantasma)

    if (esNegocio) {
      const [d] = disenos;
      const [previa] = construirLineas(e, { imagenGenerica: customImageDataUri() }); // solo para la imagen del archivo
      const ts = Date.now();
      const lineaNegocio = {
        id: e.material === MATERIAL_HOLOGRAFICO_ID ? `negocio:${MATERIAL_HOLOGRAFICO_ID}:${ts}` : `negocio:${ts}`,
        // Sin el nombre del archivo (a diferencia de una línea `custom:`): acá
        // el cliente tiene UNA sola línea de Negocio, no hace falta distinguirla
        // de otras, y `nombreParaAnalytics()` no sabe limpiar un `negocio:` —
        // meterlo en el name sería PII filtrándose a GA4/Meta. El archivo real
        // sigue viajando en meta.archivos, que es lo que lee el mail/CRM.
        name: 'Negocio · 100u 6 cm',
        categoryLabel: 'Negocio',
        image: previa.image,
        basePrice: NEGOCIO.price,
        quantity: 1,
        meta: { qty: NEGOCIO.qty, size: NEGOCIO.size, archivos: [{ nombre: d.nombre, pesoMB: d.pesoMB, url: d.url || null }] }
      };
      addNegocio(lineaNegocio);
      if (e.material === MATERIAL_HOLOGRAFICO_ID) agregarRecargoHolografico(addFixed, ts);
      itemsParaTrack = [{ ...lineaNegocio, price: NEGOCIO.price }];
    } else {
      const lineas = construirLineas(e, { imagenGenerica: customImageDataUri() });
      if (!lineas.length) return;
      for (const l of lineas) {
        addCustom(l, { openDrawer: false, silent: true });
        // Recargo fijo por diseño del Vinilo Holográfico (enmienda 22/9/2026,
        // RF-MAT3): línea aparte, quantity 1, nunca mezclada con el unitario de
        // `l` — ver el comentario de `construirLineas()` sobre por qué.
        if (e.material === MATERIAL_HOLOGRAFICO_ID) agregarRecargoHolografico(addFixed, l.id.split(':').at(-1));
      }
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
