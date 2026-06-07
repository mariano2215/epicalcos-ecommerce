import { Link } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';

export default function ProductCard({ product }) {
  const { addItem } = useCart();

  return (
    <article className="card-glass card-glass-hover overflow-hidden flex flex-col">
      <Link to={`/producto/${product.id}`} className="block relative aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        {product.badge && (
          <span className="absolute top-3 left-3 badge badge-hot">{product.badge}</span>
        )}
      </Link>

      <div className="p-5 flex-1 flex flex-col">
        <span className="text-xs uppercase tracking-wider text-white/50 mb-1">
          {product.categoryLabel}
        </span>
        <h3 className="font-semibold text-white text-lg leading-snug">
          <Link to={`/producto/${product.id}`} className="hover:text-brand-pink transition-colors">
            {product.name}
          </Link>
        </h3>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-display font-extrabold text-2xl"
            style={{
              backgroundImage: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'
            }}>
            {formatPrice(product.price)}
          </span>
        </div>

        <div className="mt-5 flex gap-2 mt-auto pt-4">
          <button onClick={() => addItem(product)} className="btn-primary !py-2.5 !px-4 text-sm flex-1">
            Agregar
          </button>
          <Link to={`/producto/${product.id}`} className="btn-secondary !py-2.5 !px-4 text-sm">
            Ver
          </Link>
        </div>
      </div>
    </article>
  );
}
