import { shipping } from '../../config/site.js';

const PASOS = [
  { icon: '🔍', txt: 'Revisamos tu archivo antes de imprimir.' },
  { icon: '💬', txt: 'Te mandamos la vista previa por WhatsApp.' },
  { icon: '✅', txt: 'Recién cuando das el OK, entra a producción.' },
  { icon: '🚚', txt: `Producción en ${shipping.productionDaysRosario}, después despacho.` }
];

/** Bloque "Qué pasa después de comprar" — visible en la página, no enterrado en el FAQ. */
export default function QueSigue() {
  return (
    <section className="card-glass p-5">
      <h2 className="font-display font-extrabold text-lg mb-1">Qué pasa después de comprar</h2>
      <p className="text-white/50 text-sm mb-4">
        No producimos nada sin tu OK. Si algo del archivo no da, te escribimos y lo resolvemos.
      </p>
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
