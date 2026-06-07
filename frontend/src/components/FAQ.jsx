import { useState } from 'react';

const faqs = [
  { q: '¿Cuál es el pedido mínimo?', a: 'El pedido mínimo es de 10 calcos.' },
  { q: '¿Son resistentes al agua?', a: 'Sí, trabajamos con vinilo premium resistente al agua.' },
  { q: '¿Resisten el sol?', a: 'Sí, están pensadas para uso cotidiano y exposición normal al sol.' },
  { q: '¿Hacen diseños personalizados?', a: 'Sí, podés comprar packs personalizados y luego coordinamos el diseño.' },
  { q: '¿Cómo pago?', a: 'Podés pagar online de forma segura a través de Mercado Pago.' },
  { q: '¿Cuánto tarda la producción?', a: 'Entre 2 y 3 días hábiles después de recibido el pago.' },
  { q: '¿Hacen envíos?', a: 'Sí, coordinamos entregas en Rosario y envíos según zona.' },
  { q: '¿Qué pasa después de pagar?', a: 'Recibimos el pedido, te contactamos para coordinar diseño si corresponde, y entrega.' }
];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="py-20">
      <div className="container-app">
        <div className="text-center mb-10">
          <span className="badge badge-soft mb-3">Preguntas frecuentes</span>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl">Lo que suelen preguntar</h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="card-glass overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full p-5 flex items-center justify-between text-left"
                >
                  <span className="font-semibold">{f.q}</span>
                  <span className={`text-xl transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
                </button>
                {isOpen && <div className="px-5 pb-5 text-white/70">{f.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
