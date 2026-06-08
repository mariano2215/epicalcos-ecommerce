import { formatPrice } from '../context/CartContext.jsx';

/**
 * Barra fija en la parte inferior en mobile para ficha de producto.
 * Visible solo < sm.
 */
export default function StickyMobileBar({ product, onAdd, onBuyNow }) {
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 backdrop-blur-md bg-black/85">
      <div className="container-app py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-white/40 truncate">
            {product.categoryLabel}
          </div>
          <div className="font-display font-extrabold text-base leading-tight"
            style={{
              backgroundImage: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'
            }}>
            {formatPrice(product.price)}
          </div>
        </div>
        <button onClick={onAdd} className="btn-secondary !py-2 !px-4 text-sm">+ Carrito</button>
        <button onClick={onBuyNow} className="btn-primary !py-2 !px-4 text-sm">Comprar</button>
      </div>
    </div>
  );
}
