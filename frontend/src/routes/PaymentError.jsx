import { Link } from 'react-router-dom';

export default function PaymentError() {
  return (
    <div className="hero-gradient min-h-screen grid place-items-center">
      <div className="container-app py-20">
        <div className="card-glass p-10 max-w-xl mx-auto text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl">No se pudo completar el pago</h1>
          <p className="text-white/70 mt-3">
            La operación fue cancelada o rechazada. Podés volver al checkout e intentar nuevamente.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/carrito" className="btn-secondary">Volver al carrito</Link>
            <Link to="/checkout" className="btn-primary">Intentar de nuevo</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
