const items = [
  { icon: '💧', title: 'Resistentes al agua', text: 'Vinilo premium pensado para uso cotidiano.' },
  { icon: '☀️', title: 'Resistentes al sol', text: 'No se descoloran con exposición normal.' },
  { icon: '🎨', title: 'Diseños personalizados', text: 'Tu logo, frase o referencia, en pack a medida.' },
  { icon: '🔒', title: 'Pago seguro', text: 'Checkout con Mercado Pago. Sin compartir datos.' }
];

export default function Benefits() {
  return (
    <section className="py-16">
      <div className="container-app grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((b) => (
          <div key={b.title} className="card-glass p-6">
            <div className="text-3xl mb-3">{b.icon}</div>
            <h3 className="font-semibold text-white mb-1">{b.title}</h3>
            <p className="text-white/60 text-sm">{b.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
