import { shipping } from '../../config/site.js';

const PASOS = [
  { icon: '🔍', txt: 'Revisamos tu archivo antes de imprimir.' },
  { icon: '✅', txt: 'Con el pago confirmado, entra directo a producción.' },
  { icon: '🖨️', txt: 'Lo hacemos con el tamaño, el corte y el archivo que elegiste.' },
  {
    icon: '🚚',
    txt: `Entrega: ${shipping.productionDaysRosario} en Rosario, ${shipping.productionDaysInterior} al resto del país.`
  }
];

/** Bloque "Qué pasa después de comprar" — visible en la página, no enterrado en el FAQ. */
export default function QueSigue() {
  return (
    <section className="card-glass p-5">
      <h2 className="font-display font-extrabold text-lg mb-4">Qué pasa después de comprar</h2>
      <ol className="space-y-3">
        {PASOS.map((p, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-xl shrink-0">{p.icon}</span>
            <span className="text-sm text-white/80 pt-0.5">{p.txt}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
