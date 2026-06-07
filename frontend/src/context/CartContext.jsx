import { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'epicalcos.cart.v1';

const initialState = { items: [], drawerOpen: false };

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, items: action.items || [] };
    case 'ADD': {
      const existing = state.items.find((i) => i.id === action.product.id);
      const items = existing
        ? state.items.map((i) =>
            i.id === action.product.id ? { ...i, quantity: i.quantity + (action.quantity || 1) } : i
          )
        : [...state.items, { ...action.product, quantity: action.quantity || 1 }];
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
  const [state, dispatch] = useReducer(reducer, initialState);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: 'HYDRATE', items: JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

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

  const addItem = useCallback((product, quantity = 1) => {
    dispatch({ type: 'ADD', product, quantity });
    setToast(`${product.name} agregado al carrito`);
    // TODO analytics: add_to_cart
  }, []);

  const removeItem = useCallback((id) => dispatch({ type: 'REMOVE', id }), []);
  const setQty = useCallback((id, quantity) => dispatch({ type: 'SET_QTY', id, quantity }), []);
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const openDrawer = useCallback(() => dispatch({ type: 'OPEN_DRAWER' }), []);
  const closeDrawer = useCallback(() => dispatch({ type: 'CLOSE_DRAWER' }), []);

  const { totalItems, subtotal } = useMemo(() => {
    const totalItems = state.items.reduce((acc, i) => acc + i.quantity, 0);
    const subtotal = state.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    return { totalItems, subtotal };
  }, [state.items]);

  const value = {
    items: state.items,
    drawerOpen: state.drawerOpen,
    totalItems,
    subtotal,
    addItem,
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
