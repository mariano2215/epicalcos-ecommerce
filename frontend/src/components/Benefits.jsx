import Reveal from './Reveal.jsx';

const items = [
  { icon: '💧', title: 'Resistentes al agua', text: 'A diferencia de los calcos genéricos, los nuestros no se despegan ni descoloran con el uso diario.' },
  { icon: '☀️', title: 'Vinilo premium al sol', text: 'Pensados para autos, motos, termos y objetos de uso cotidiano — no para el cajón.' },
  { icon: '🎨', title: 'Diseños personalizados', text: 'Tu logo, foto o frase. Te mandamos vista previa antes de producir.' },
  { icon: '🔒', title: 'Pago seguro', text: 'Checkout con Mercado Pago. Sin compartir datos de tarjeta.' }
];

export default function Benefits() {
  return (
    <section className="py-16">
      <div className="container-app grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((b, i) => (
          <Reveal key={b.title} delay={i * 100} className="card-glass p-6 flex flex-col items-center text-center">
            <div className="text-5xl mb-3">{b.icon}</div>
            <h3 className="font-semibold text-white mb-1">{b.title}</h3>
            <p className="text-white/60 text-sm">{b.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
