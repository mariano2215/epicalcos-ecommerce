import { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback } from 'react';
import { trackAddToCart, trackRemoveFromCart } from '../lib/analytics.js';
import { META_LINE_SKU, FIXED_SKU } from '../config/metaCatalog.js';
import {
  priceForSize,
  sizeLabel,
  round,
  BULK_THRESHOLD,
  BULK_DISCOUNT,
  BULK_DISCOUNT_PAYMENT_METHOD,
  findCoupon,
  couponBundle,
  MAX_STICKER_DISCOUNT,
  PROMO_3X2,
  isPromoActive,
  promo3x2
} from '../config/pricing.js';

/**
 * Tipos de línea que entran en las promos N x M — la 3x2 por fecha y el cupón
 * de bundle (EMOJI50 = 2x1): calcos de catálogo + personalizados.
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
    notify(`${line.name} agregado`);
    trackAddToCart({ ...line, price: line.basePrice }, quantity);
  }, [notify]);

  /** Agregar una línea de pack ya armada (mayorista). */
  const addPack = useCallback((line) => {
    const enriched = { ...line, type: 'pack', catalogSku: line.catalogSku || META_LINE_SKU.mayorista };
    dispatch({ type: 'ADD', line: enriched });
    notify(`${enriched.name} agregado`);
    trackAddToCart({ ...enriched, price: enriched.basePrice }, enriched.quantity || 1);
  }, [notify]);

  /** Agregar un calco personalizado ya configurado (Configurador). */
  const addCustom = useCallback((line) => {
    const enriched = { ...line, type: 'custom', catalogSku: line.catalogSku || META_LINE_SKU.personalizados };
    dispatch({ type: 'ADD', line: enriched });
    notify(`${enriched.name} agregado`);
    trackAddToCart({ ...enriched, price: enriched.basePrice }, enriched.quantity || 1);
  }, [notify]);

  /** Agregar la promo Negocio. */
  const addNegocio = useCallback((line) => {
    const enriched = { ...line, type: 'negocio', catalogSku: line.catalogSku || META_LINE_SKU.negocio };
    dispatch({ type: 'ADD', line: enriched });
    notify(`${enriched.name} agregado`);
    trackAddToCart({ ...enriched, price: enriched.basePrice }, 1);
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
    trackAddToCart({ ...line, price: line.basePrice }, quantity);
  }, [notify]);

  const removeItem = useCallback(
    (id) => {
      const item = state.items.find((i) => i.id === id);
      if (item) trackRemoveFromCart({ ...item, price: item.basePrice });
      dispatch({ type: 'REMOVE', id });
    },
    [state.items]
  );
  const setQty = useCallback((id, quantity) => dispatch({ type: 'SET_QTY', id, quantity }), []);
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const openDrawer = useCallback(() => dispatch({ type: 'OPEN_DRAWER' }), []);
  const closeDrawer = useCallback(() => dispatch({ type: 'CLOSE_DRAWER' }), []);

  /**
   * Precios derivados: el precio de vidriera SIEMPRE es el de Mercado Pago
   * (basePrice, sin descuento) — el 10 % por volumen en calcos sueltos
   * (type === 'sticker') recién se aplica en el checkout, y solo si el
   * cliente elige pagar por transferencia (ver pricedItems). Packs y negocio
   * ya traen su propio descuento en basePrice y no cuentan para el umbral.
   */
  const derived = useMemo(() => {
    const stickerLines = state.items.filter((i) => i.type === 'sticker');
    const bulkUnits = stickerLines.reduce((a, i) => a + i.quantity, 0);
    const bulkEligible = bulkUnits >= BULK_THRESHOLD;

    const items = state.items.map((i) => ({ ...i, price: i.basePrice }));

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
    const eligibleUnitBasePrices = [];
    for (const i of state.items) {
      if (PROMO_ELIGIBLE_TYPES.has(i.type)) {
        for (let k = 0; k < i.quantity; k++) eligibleUnitBasePrices.push(i.basePrice);
      }
    }

    // Promo 3x2 (por tiempo limitado): independiente del medio de pago y del
    // cupón, así ya se puede mostrar en el carrito. El % (EPICA10 /
    // transferencia) se suma recién en el checkout, en pricedItems.
    const promoActive = isPromoActive();
    const promo = promo3x2({ unitBasePrices: promoActive ? eligibleUnitBasePrices : [] });
    const promoUnits = promoActive ? eligibleUnitBasePrices.length : 0;
    const promoToNextFree = promoActive
      ? (PROMO_3X2.buy - (promoUnits % PROMO_3X2.buy)) % PROMO_3X2.buy
      : 0;

    return {
      items,
      subtotal,
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
  }, [state.items]);

  /**
   * Recalcula los items con el precio real según el medio de pago y el cupón
   * aplicado en el checkout.
   *
   * FUERA de la promo: a los calcos sueltos se les SUMA el 10 % por volumen
   * (solo transferencia y desde el umbral) MÁS el cupón (acumulables, tope 90 %).
   *
   * DURANTE la promo 3x2: a los calcos elegibles (catálogo + personalizados) se
   * les aplica primero el 3x2 (uniforme vía keepFraction) y después el % (cupón
   * + transferencia) topeado en PROMO_3X2.percentCap (10 %). Espejado en
   * netlify/functions/lib/pricing.js.
   *
   * Con un CUPÓN DE BUNDLE (EMOJI50 = 2x1): manda el bundle del cupón — 2x1
   * sobre los elegibles y NINGÚN % (ni transferencia, ni volumen, ni otro
   * cupón), y reemplaza a la promo 3x2 si estuviera vigente.
   */
  const pricedItems = useCallback(
    (paymentMethod, couponCode) => {
      const bundle = couponBundle(couponCode); // 2x1 del cupón oculto, si aplica
      const bulkRate =
        !bundle && derived.bulkEligible && paymentMethod === BULK_DISCOUNT_PAYMENT_METHOD ? BULK_DISCOUNT : 0;
      const couponRate = bundle ? 0 : findCoupon(couponCode)?.discount || 0;
      const cap = derived.promoActive ? PROMO_3X2.percentCap : MAX_STICKER_DISCOUNT;
      const percentRate = Math.min(bulkRate + couponRate, cap);

      // Agrupación N x M vigente: el cupón de bundle pisa a la promo por fecha.
      const grouping = bundle || (derived.promoActive ? PROMO_3X2 : null);
      const keep = bundle
        ? promo3x2({ unitBasePrices: derived.eligibleUnitBasePrices, buy: bundle.buy, pay: bundle.pay }).keepFraction
        : derived.promoKeepFraction;

      if (!grouping) {
        if (percentRate === 0) return derived.items;
        return derived.items.map((i) =>
          i.type === 'sticker' ? { ...i, price: round(i.basePrice * (1 - percentRate)) } : i
        );
      }

      // N x M + % (con tope) a los elegibles; el resto intacto.
      return derived.items.map((i) =>
        PROMO_ELIGIBLE_TYPES.has(i.type)
          ? { ...i, price: round(i.basePrice * keep * (1 - percentRate)) }
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
    removeItem,
    setQty,
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

export const formatPrice = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
