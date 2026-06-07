import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function PaymentSuccess() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
    // TODO analytics: purchase
  }, [clear]);

  return (
    <div className="hero-gradient min-h-screen grid place-items-center">
      <div className="container-app py-20">
        <div className="card-glass p-10 max-w-xl mx-auto text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl">Pago recibido</h1>
          <p className="text-white/70 mt-3">
            Gracias por comprar en EPICALCOS. Ya recibimos tu pedido y nos vamos a contactar
            para coordinar producción y entrega.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="btn-secondary">Volver al inicio</Link>
            <Link to="/productos" className="btn-primary">Ver más productos</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
