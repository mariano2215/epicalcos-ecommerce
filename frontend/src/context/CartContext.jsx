import { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback } from 'react';
import { trackAddToCart, trackRemoveFromCart } from '../lib/analytics.js';
import {
  priceForSize,
  sizeLabel,
  round,
  BULK_THRESHOLD,
  BULK_DISCOUNT,
  BULK_DISCOUNT_PAYMENT_METHOD,
  findCoupon,
  MAX_STICKER_DISCOUNT
} from '../config/pricing.js';

const CartContext = createContext(null);
const STORAGE_KEY = 'epicalcos.cart.v2';

const initialState = { items: [], drawerOpen: false };

/** Hidratación síncrona desde localStorage en el primer render (evita el race con el persist). */
function initState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { items: raw ? JSON.parse(raw) : [], drawerOpen: false };
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
      return { ...state, items, drawerOpen: true };
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

  /** Agregar un calco del catálogo con tamaño elegido. */
  const addSticker = useCallback((sticker, size, quantity = 1) => {
    const line = {
      id: `sticker:${sticker.id}:${size}`,
      type: 'sticker',
      name: `${sticker.name} · ${sizeLabel(size)}`,
      categoryLabel: sticker.categoryLabel,
      category: sticker.category,
      image: sticker.image,
      size,
      basePrice: priceForSize(size),
      quantity
    };
    dispatch({ type: 'ADD', line });
    notify(`${line.name} agregado`);
    trackAddToCart({ ...line, price: line.basePrice }, quantity);
  }, [notify]);

  /** Agregar una línea de pack ya armada (mayorista / personalizados). */
  const addPack = useCallback((line) => {
    dispatch({ type: 'ADD', line: { ...line, type: 'pack' } });
    notify(`${line.name} agregado`);
    trackAddToCart({ ...line, price: line.basePrice }, line.quantity || 1);
  }, [notify]);

  /** Agregar un calco personalizado ya configurado (Configurador). */
  const addCustom = useCallback((line) => {
    dispatch({ type: 'ADD', line: { ...line, type: 'custom' } });
    notify(`${line.name} agregado`);
    trackAddToCart({ ...line, price: line.basePrice }, line.quantity || 1);
  }, [notify]);

  /** Agregar la promo Negocio. */
  const addNegocio = useCallback((line) => {
    dispatch({ type: 'ADD', line: { ...line, type: 'negocio' } });
    notify(`${line.name} agregado`);
    trackAddToCart({ ...line, price: line.basePrice }, 1);
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

    return { items, subtotal, totalItems, bulkUnits, bulkEligible, bulkSavings, unitsToBulk };
  }, [state.items]);

  /**
   * Recalcula los items con el precio real según el medio de pago y el cupón
   * aplicado en el checkout: a los calcos sueltos se les SUMA el 10 % por
   * volumen (solo si paymentMethod es 'transferencia' y el carrito llegó al
   * umbral) MÁS el descuento del cupón (si es válido). Son acumulables.
   */
  const pricedItems = useCallback(
    (paymentMethod, couponCode) => {
      const bulkRate = derived.bulkEligible && paymentMethod === BULK_DISCOUNT_PAYMENT_METHOD ? BULK_DISCOUNT : 0;
      const couponRate = findCoupon(couponCode)?.discount || 0;
      const rate = Math.min(bulkRate + couponRate, MAX_STICKER_DISCOUNT);
      if (rate === 0) return derived.items;
      return derived.items.map((i) =>
        i.type === 'sticker' ? { ...i, price: round(i.basePrice * (1 - rate)) } : i
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
