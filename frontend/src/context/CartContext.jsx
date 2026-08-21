import { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback } from 'react';
import { trackAddToCart, trackRemoveFromCart } from '../lib/analytics.js';
import { usePromoActive } from '../lib/promo.js';
import { META_LINE_SKU, FIXED_SKU, DIGITAL_SKU } from '../config/metaCatalog.js';
import {
  priceForSize,
  sizeLabel,
  round,
  BULK_THRESHOLD,
  BULK_DISCOUNT,
  BULK_DISCOUNT_PAYMENT_METHOD,
  findCoupon,
  couponBundle,
  couponAnulaTodo,
  couponIncluyeCustom,
  MAX_STICKER_DISCOUNT,
  PROMO_3X2,
  PROMO_ARGENTINA,
  esPromoArgentina,
  precioVidrieraLinea,
  promo3x2
} from '../config/pricing.js';

/**
 * Tipos de línea que entran en las promos N x M — la 3x2 por fecha y el cupón
 * de bundle, si hay alguno vivo: calcos de catálogo + personalizados.
 */
const PROMO_ELIGIBLE_TYPES = new Set(['sticker', 'custom']);

const CartContext = createContext(null);
const STORAGE_KEY = 'epicalcos.cart.v2';

const initialState = { items: [], drawerOpen: false };

/**
 * Líneas de personalizados del configurador VIEJO (`custom:{material}:{tamano}:{corte}:{ts}`,
 * con precio por material y mínimo de 10). El configurador nuevo emite
 * `custom:{tamano}:{corte}:{ts}`: si una de esas líneas sobrevivió en el
 * localStorage de alguien, el servidor la rechazaría y le trabaría TODO el
 * checkout, así que se descartan al hidratar.
 */
const esCustomViejo = (id) => String(id).startsWith('custom:') && String(id).split(':').length > 4;

/** Hidratación síncrona desde localStorage en el primer render (evita el race con el persist). */
function initState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return {
      items: Array.isArray(items) ? items.filter((i) => !esCustomViejo(i?.id)) : [],
      drawerOpen: false
    };
  } catch {
    return initialState;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, items: Array.isArray(action.items) ? action.items : [] };
    case 'ADD': {
      const line = action.line;
      const existing = state.items.find((i) => i.id === line.id);
      const items = existing
        ? state.items.map((i) =>
            i.id === line.id ? { ...i, quantity: i.quantity + (line.quantity || 1) } : i
          )
        : [...state.items, line];
      // `openDrawer: false` → agregar sin abrir el carrito (upsell del checkout:
      // taparle el formulario con el drawer lo sacaría de la compra).
      return { ...state, items, drawerOpen: action.openDrawer === false ? state.drawerOpen : true };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'PATCH': {
      // Actualiza una línea ya agregada (ej. el configurador de personalizados
      // parchea la URL de Cloudinary cuando termina de subir el diseño, o las
      // notas del pedido). `meta` se mergea; el resto se pisa.
      const { id, changes } = action;
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === id
            ? { ...i, ...changes, ...(changes.meta ? { meta: { ...i.meta, ...changes.meta } } : {}) }
            : i
        )
      };
    }
    case 'SET_QTY': {
      const qty = Math.max(1, Number(action.quantity) || 1);
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? { ...i, quantity: qty } : i))
      };
    }
    case 'CLEAR':
      return { ...state, items: [] };
    case 'OPEN_DRAWER':
      return { ...state, drawerOpen: true };
    case 'CLOSE_DRAWER':
      return { ...state, drawerOpen: false };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      /* ignore */
    }
  }, [state.items]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((msg) => setToast(msg), []);

  /**
   * Agregar un calco del catálogo con tamaño elegido.
   * `opts.openDrawer === false` agrega sin abrir el carrito (ver reducer ADD).
   * `opts.silent` omite el toast: el armador de packs agrega una línea POR
   * DISEÑO, y con 20 diseños serían 20 toasts encima del mismo click (mismo
   * motivo por el que ya lo tiene `addCustom`).
   */
  const addSticker = useCallback((sticker, size, quantity = 1, opts = {}) => {
    const line = {
      id: `sticker:${sticker.id}:${size}`,
      type: 'sticker',
      name: `${sticker.name} · ${sizeLabel(size)}`,
      categoryLabel: sticker.categoryLabel,
      category: sticker.category,
      image: sticker.image,
      catalogSku: sticker.sku, // SKU del diseño en el catálogo de Meta
      size,
      basePrice: priceForSize(size),
      quantity
    };
    dispatch({ type: 'ADD', line, openDrawer: opts.openDrawer });
    if (!opts.silent) notify(`${line.name} agregado`);
    trackAddToCart({ ...line, price: precioVidrieraLinea(line) }, quantity);
  }, [notify]);

  /**
   * Agregar una línea de pack ya armada (mayorista).
   *
   * Un pack NO trae el envío incluido: paga lo mismo que cualquier pedido, según
   * zona y subtotal. Acá vivía un flag `envioGratis` que lo regalaba — los
   * carritos guardados en localStorage todavía lo traen y se ignora a propósito.
   */
  const addPack = useCallback((line) => {
    const enriched = {
      ...line,
      type: 'pack',
      catalogSku: line.catalogSku || META_LINE_SKU.mayorista
    };
    dispatch({ type: 'ADD', line: enriched });
    notify(`${enriched.name} agregado`);
    trackAddToCart({ ...enriched, price: precioVidrieraLinea(enriched) }, enriched.quantity || 1);
  }, [notify]);

  /**
   * Agregar un calco personalizado ya configurado (Configurador).
   * `opts.openDrawer === false` agrega sin abrir el carrito y `opts.silent`
   * omite el toast: el configurador agrega UNA línea por diseño subido, y con
   * 20 archivos serían 20 drawers y 20 toasts encima de la subida.
   */
  const addCustom = useCallback((line, opts = {}) => {
    const enriched = { ...line, type: 'custom', catalogSku: line.catalogSku || META_LINE_SKU.personalizados };
    dispatch({ type: 'ADD', line: enriched, openDrawer: opts.openDrawer });
    if (!opts.silent) notify(`${enriched.name} agregado`);
    trackAddToCart({ ...enriched, price: precioVidrieraLinea(enriched) }, enriched.quantity || 1);
  }, [notify]);

  /** Agregar la promo Negocio. */
  const addNegocio = useCallback((line) => {
    const enriched = { ...line, type: 'negocio', catalogSku: line.catalogSku || META_LINE_SKU.negocio };
    dispatch({ type: 'ADD', line: enriched });
    notify(`${enriched.name} agregado`);
    trackAddToCart({ ...enriched, price: precioVidrieraLinea(enriched) }, 1);
  }, [notify]);

  /**
   * Agregar un producto de precio fijo (tatuajes / polaroid). Si trae `meta`
   * (ej. fotos adjuntas de Polaroid), la línea lleva un id único para que cada
   * pedido conserve sus propios adjuntos en vez de mergear la cantidad y pisarlos.
   * El backend valida el precio por el prefijo `fixed:{productId}` (ver
   * netlify/functions/lib/pricing.js), así que el sufijo extra no lo afecta.
   */
  const addFixed = useCallback((product, quantity = 1) => {
    const hasMeta = product.meta && Object.keys(product.meta).length > 0;
    const line = {
      id: hasMeta ? `fixed:${product.id}:${Date.now()}` : `fixed:${product.id}`,
      type: 'fixed',
      name: product.name,
      categoryLabel: product.categoryLabel || 'Especial',
      image: product.image,
      catalogSku: FIXED_SKU[product.id], // SKU de catálogo (tatuajes / polaroid)
      basePrice: product.price,
      quantity,
      ...(hasMeta ? { meta: product.meta } : {})
    };
    dispatch({ type: 'ADD', line });
    notify(`${line.name} agregado`);
    trackAddToCart({ ...line, price: precioVidrieraLinea(line) }, quantity);
  }, [notify]);

  /**
   * Agregar un pack de archivos imprimibles (producto DIGITAL, entrega por mail).
   *
   * Cantidad SIEMPRE 1 y sin acumular: comprar dos veces el mismo archivo no le
   * sirve a nadie, y el servidor además rechaza la línea con quantity ≠ 1 (ver
   * `digital:` en netlify/functions/lib/pricing.js). Si ya está en el carrito,
   * abre el drawer y lo avisa en vez de sumar una segunda copia.
   */
  const addDigital = useCallback(
    (product) => {
      const id = `digital:${product.id}`;
      if (state.items.some((i) => i.id === id)) {
        notify('Ese pack ya está en tu carrito');
        dispatch({ type: 'OPEN_DRAWER' });
        return;
      }
      const line = {
        id,
        type: 'digital',
        name: product.name,
        categoryLabel: 'Archivos imprimibles',
        image: product.image,
        catalogSku: DIGITAL_SKU[product.id],
        basePrice: product.price,
        quantity: 1
      };
      dispatch({ type: 'ADD', line });
      notify(`${line.name} agregado`);
      trackAddToCart({ ...line, price: precioVidrieraLinea(line) }, 1);
    },
    [state.items, notify]
  );

  const removeItem = useCallback(
    (id) => {
      const item = state.items.find((i) => i.id === id);
      if (item) trackRemoveFromCart({ ...item, price: precioVidrieraLinea(item) });
      dispatch({ type: 'REMOVE', id });
    },
    [state.items]
  );
  const setQty = useCallback((id, quantity) => dispatch({ type: 'SET_QTY', id, quantity }), []);
  /** Parche puntual de una línea existente (ver reducer PATCH). */
  const patchLine = useCallback((id, changes) => dispatch({ type: 'PATCH', id, changes }), []);
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const openDrawer = useCallback(() => dispatch({ type: 'OPEN_DRAWER' }), []);
  const closeDrawer = useCallback(() => dispatch({ type: 'CLOSE_DRAWER' }), []);

  /**
   * ¿La promo 3x2 está corriendo? Viene del HOOK y no de `isPromoActive()`
   * suelto, para que el carrito se entere del cambio de ventana SIN recargar.
   *
   * POR QUÉ IMPORTA: `derived` es un useMemo sobre `state.items`. Si la promo
   * se decidiera adentro del memo, una pestaña abierta a las 22:59 seguiría
   * calculando precios de LISTA después de las 23:00 —el banner del Header sí
   * se enciende, porque tiene su propio hook— y el checkout mandaría un precio
   * que el servidor ya no acepta: `price_mismatch` y compra trabada, justo en
   * el minuto de más tráfico de la promo. Con el hook, el flip de la ventana
   * re-renderiza el provider y el memo se recalcula solo.
   */
  const promoActive = usePromoActive();

  /**
   * Precios derivados. Hay que distinguir DOS tipos de descuento, porque se
   * muestran en momentos distintos:
   *
   *  1. Los que dependen del CARRITO ENTERO — el 10 % por volumen en calcos
   *     sueltos, el cupón y el 10 % por transferencia. Estos NO se pueden
   *     mostrar acá: dependen de la cantidad total y del medio de pago, que se
   *     eligen en el checkout. Se aplican en `pricedItems`.
   *
   *  2. Los que dependen SOLO DEL DISEÑO — las promos por categoría (ver
   *     `precioVidrieraLinea`). Estos sí se muestran desde acá: la grilla y la
   *     ficha ya los muestran, y que el carrito no lo hiciera era mostrar el
   *     precio al DOBLE justo antes de pagar.
   *
   * Packs y negocio ya traen su propio descuento en basePrice, así que quedan
   * afuera del descuento por volumen. Para el umbral de envío gratis, en cambio,
   * suman como cualquier cosa que viaje en la caja: es plata del pedido.
   */
  const derived = useMemo(() => {
    const stickerLines = state.items.filter((i) => i.type === 'sticker');
    const bulkUnits = stickerLines.reduce((a, i) => a + i.quantity, 0);
    const bulkEligible = bulkUnits >= BULK_THRESHOLD;

    const items = state.items.map((i) => ({ ...i, price: precioVidrieraLinea(i) }));

    const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
    const totalItems = items.reduce((a, i) => a + i.quantity, 0);
    const bulkSavings = bulkEligible
      ? stickerLines.reduce(
          (a, i) => a + (i.basePrice - round(i.basePrice * (1 - BULK_DISCOUNT))) * i.quantity,
          0
        )
      : 0;
    const unitsToBulk = bulkEligible ? 0 : BULK_THRESHOLD - bulkUnits;

    // Bolsa común de calcos elegibles (catálogo + personalizados) para las
    // promos N x M. La usan la promo 3x2 por fecha (acá abajo, para mostrarla
    // en el carrito) y el cupón de bundle (recién en el checkout, en
    // pricedItems, porque el cupón se escribe ahí).
    //
    // ⚠️ Va con `basePrice` (precio de LISTA) y NO con el de vidriera: el
    // servidor arma esta misma bolsa con SIZE_PRICES (ver `unitBasePrices` en
    // netlify/functions/lib/pricing.js). Usar acá el precio con la promo por
    // categoría desincronizaría el N x M y el checkout se rechazaría.
    const eligibleUnitBasePrices = [];
    for (const i of state.items) {
      if (PROMO_ELIGIBLE_TYPES.has(i.type)) {
        for (let k = 0; k < i.quantity; k++) eligibleUnitBasePrices.push(i.basePrice);
      }
    }

    // Promo 3x2 (por tiempo limitado): independiente del medio de pago y del
    // cupón, así ya se puede mostrar en el carrito. El % por transferencia se
    // suma recién en el checkout, en pricedItems. `promoActive` viene del hook
    // de arriba — ver el comentario de por qué no se decide acá adentro.
    const promo = promo3x2({ unitBasePrices: promoActive ? eligibleUnitBasePrices : [] });
    const promoUnits = promoActive ? eligibleUnitBasePrices.length : 0;
    const promoToNextFree = promoActive
      ? (PROMO_3X2.buy - (promoUnits % PROMO_3X2.buy)) % PROMO_3X2.buy
      : 0;

    // Archivos imprimibles: no se producen ni se despachan. `physicalSubtotal`
    // es lo único que cuenta para el envío gratis y `digitalOnly` apaga toda la
    // sección de entrega del checkout (espejado en el servidor: ver
    // `isDigitalOnly` en netlify/functions/lib/pricing.js).
    const digitalSubtotal = items.reduce(
      (a, i) => (i.type === 'digital' ? a + i.price * i.quantity : a),
      0
    );
    const hasDigital = items.some((i) => i.type === 'digital');
    const digitalOnly = items.length > 0 && items.every((i) => i.type === 'digital');

    return {
      items,
      subtotal,
      physicalSubtotal: subtotal - digitalSubtotal,
      hasDigital,
      digitalOnly,
      totalItems,
      bulkUnits,
      bulkEligible,
      bulkSavings,
      unitsToBulk,
      eligibleUnitBasePrices,
      promoActive,
      promoUnits,
      promoFreeUnits: promo.freeUnits,
      promoSavings: promo.discount,
      promoKeepFraction: promo.keepFraction,
      promoToNextFree
    };
  }, [state.items, promoActive]);

  /**
   * Recalcula los items con el precio real según el medio de pago y el cupón
   * aplicado en el checkout.
   *
   * FUERA de la promo: a los calcos sueltos se les SUMA el 10 % por volumen
   * (solo transferencia y desde el umbral) MÁS el cupón (acumulables, tope 90 %).
   *
   * DURANTE la promo 3x2: a los calcos elegibles (catálogo + personalizados) se
   * les aplica primero el 3x2 (uniforme vía keepFraction) y después el 10 % por
   * transferencia, topeado en PROMO_3X2.percentCap. Los cupones de % NO se
   * combinan con la promo: mientras corre, `couponRate` es 0. Espejado en
   * netlify/functions/lib/pricing.js.
   *
   * Con un CUPÓN DE BUNDLE (N x M): manda el bundle del cupón — cada N,
   * la más barata gratis y NINGÚN % (ni transferencia, ni volumen, ni otro
   * cupón), y reemplaza a la promo 3x2 si estuviera vigente.
   *
   * Con un CUPÓN EXCLUSIVO (EPI50): corre SOLO el % del cupón. No se le suma el
   * 10 % por transferencia ni el de volumen, no corre el % de la promo por
   * categoría y no se aplica la agrupación N x M por fecha. Si además trae
   * `incluyeCustom`, el % alcanza a los personalizados sueltos.
   *
   * ⚠️ Espejo de validateAndPriceOrder() en netlify/functions/lib/pricing.js:
   * si tocás una de estas reglas acá y no allá, el checkout se rechaza con
   * `price_mismatch`. La paridad la verifica src/lib/promoPricing.test.js.
   */
  const pricedItems = useCallback(
    (paymentMethod, couponCode) => {
      const bundle = couponBundle(couponCode); // 2x1 del cupón oculto, si aplica
      // ¿El cupón es el único descuento que corre? (bundle o `exclusivo`).
      const anulaTodo = couponAnulaTodo(couponCode);
      const incluyeCustom = couponIncluyeCustom(couponCode);
      const bulkRate =
        !anulaTodo && derived.bulkEligible && paymentMethod === BULK_DISCOUNT_PAYMENT_METHOD ? BULK_DISCOUNT : 0;
      // Durante la promo 3x2 un cupón de % NO suma: la promo se combina con el
      // 10 % por transferencia y con nada más. EPI50 no cae acá — es `exclusivo`,
      // así que ya anuló la promo (anulaTodo) y corre solo su 50 %.
      const cuponAnuladoPorPromo = derived.promoActive && !anulaTodo;
      const couponRate =
        bundle || cuponAnuladoPorPromo ? 0 : findCoupon(couponCode)?.discount || 0;
      // El tope de la promo sigue a la promo REAL, no a la fecha: un cupón que
      // la anula deja al pedido sin 3x2, así que tampoco corre su tope de 10 %.
      const cap = derived.promoActive && !anulaTodo ? PROMO_3X2.percentCap : MAX_STICKER_DISCOUNT;
      const percentRate = Math.min(bulkRate + couponRate, cap);

      // Agrupación N x M vigente: el cupón de bundle pisa a la promo por fecha,
      // y un cupón exclusivo la anula (su % es el descuento final).
      const grouping = bundle || (!anulaTodo && derived.promoActive ? PROMO_3X2 : null);
      const keep = bundle
        ? promo3x2({ unitBasePrices: derived.eligibleUnitBasePrices, buy: bundle.buy, pay: bundle.pay }).keepFraction
        : derived.promoKeepFraction;

      // El 50 % de Argentina es POR LÍNEA (solo esa categoría), así que no puede
      // ir en `percentRate`, que es uno solo para todo el carrito. Se suma
      // encima y se vuelve a topear. Espejado en el servidor.
      //
      // Con un cupón que anula todo (bundle o `exclusivo`) no corre: esos cupones
      // anulan TODOS los % por definición, y el 50 % de Argentina es uno más.
      const rateDe = (i) =>
        !anulaTodo && esPromoArgentina(i.id)
          ? Math.min(percentRate + PROMO_ARGENTINA.discount, MAX_STICKER_DISCOUNT)
          : percentRate;

      // Fuera de una agrupación N x M, el % solo toca calcos de catálogo — salvo
      // que el cupón traiga `incluyeCustom`, que suma los personalizados sueltos.
      const alcanza = (i) => i.type === 'sticker' || (incluyeCustom && i.type === 'custom');

      if (!grouping) {
        return derived.items.map((i) => {
          if (!alcanza(i)) return i;
          const rate = rateDe(i);
          return rate === 0 ? i : { ...i, price: round(i.basePrice * (1 - rate)) };
        });
      }

      // N x M + % (con tope) a los elegibles; el resto intacto.
      return derived.items.map((i) =>
        PROMO_ELIGIBLE_TYPES.has(i.type)
          ? { ...i, price: round(i.basePrice * keep * (1 - rateDe(i))) }
          : i
      );
    },
    [derived]
  );

  const value = {
    ...derived,
    pricedItems,
    drawerOpen: state.drawerOpen,
    addSticker,
    addPack,
    addCustom,
    addNegocio,
    addFixed,
    addDigital,
    removeItem,
    setQty,
    patchLine,
    clear,
    openDrawer,
    closeDrawer
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      {toast && <div className="toast">{toast}</div>}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
};

// El formateador vive en lib/formato.js para que `config/` también pueda usarlo
// sin importar React. Se re-exporta acá: todo el sitio ya lo importa de este módulo.
export { formatPrice } from '../lib/formato.js';
