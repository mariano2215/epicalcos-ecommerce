import { Link } from 'react-router-dom';

export default function PaymentPending() {
  return (
    <div className="hero-gradient min-h-screen grid place-items-center">
      <div className="container-app py-20">
        <div className="card-glass p-10 max-w-xl mx-auto text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl">Tu pago está pendiente</h1>
          <p className="text-white/70 mt-3">
            Mercado Pago todavía está procesando la operación. Cuando se confirme, avanzamos con tu pedido.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/" className="btn-primary">Volver a la tienda</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
