import Reveal from './Reveal.jsx';

const steps = [
  { n: '1', icon: '🎨', t: 'Seleccioná las calcos y el tamaño', d: 'Elegí tus diseños favoritos y el tamaño de cada uno (4, 6 o 9 cm).' },
  { n: '2', icon: '🛒', t: 'Andá al carrito y completá tus datos', d: 'Revisá tu pedido y rellená el formulario con tus datos de envío.' },
  { n: '3', icon: '🔒', t: 'Pagá por Mercado Pago o transferencia', d: 'Checkout 100% seguro. Por transferencia, 10% off desde 10 calcos.' },
  { n: '4', icon: '📦', t: 'Esperá tu pedido o retiralo', d: 'Producción 2 a 3 días hábiles en Rosario, 7 a 10 al resto del país.' }
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
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 100} className="card-glass p-6 relative">
              <div className="absolute top-3 right-4 font-display font-extrabold text-4xl text-white/10">
                {s.n}
              </div>
              <div className="text-5xl mb-3 text-center">{s.icon}</div>
              <h3 className="font-semibold text-white mb-1">{s.t}</h3>
              <p className="text-white/60 text-sm">{s.d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
