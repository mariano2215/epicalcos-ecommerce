const steps = [
  { n: '1', icon: '🎨', t: 'Elegí tus diseños', d: 'Navegá las categorías o usá el buscador.' },
  { n: '2', icon: '🛒', t: 'Agregalos al carrito', d: 'Sumá la cantidad que quieras. Mínimo 10 calcos por pedido.' },
  { n: '3', icon: '🔒', t: 'Pagá seguro online', d: 'Checkout con Mercado Pago. Tarjetas, efectivo o transferencia.' },
  { n: '4', icon: '📦', t: 'Recibí o retirás', d: 'Producción 2 a 3 días hábiles en Rosario, 7 a 10 al resto del país.' }
];

export default function HowToBuy() {
  return (
    <section className="py-16">
      <div className="container-app">
        <div className="text-center mb-10">
          <span className="badge badge-soft mb-3">Cómo comprar</span>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl">Súper simple</h2>
          <p className="text-white/60 mt-2 max-w-xl mx-auto">
            4 pasos y tus calcos están en camino.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="card-glass p-6 relative">
              <div className="absolute top-3 right-4 font-display font-extrabold text-4xl text-white/10">
                {s.n}
              </div>
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="font-semibold text-white mb-1">{s.t}</h3>
              <p className="text-white/60 text-sm">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
