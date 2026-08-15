import { shipping } from '../../config/site.js';

const PASOS = [
  { icon: '🔍', txt: 'Revisamos tu archivo antes de imprimir.' },
  { icon: '✅', txt: 'Con el pago confirmado, entra directo a producción.' },
  {
    icon: '🖨️',
    txt: `Lo hacemos con el tamaño, el corte y el archivo que elegiste. Producción: ${shipping.production}.`
  },
  {
    icon: '🚚',
    txt: `Entrega: ${shipping.deliveryRosario} en Rosario, ${shipping.deliveryInterior} al resto del país.`
  }
];

/**
 * Bloque "Qué pasa después de comprar" — visible en la página, no enterrado en el FAQ.
 *
 * Tenía además una card "¿Y si mi archivo no está perfecto?". Se sacó el
 * 15/8/2026 por pedido de Mariano: sembraba la duda de que el archivo podía no
 * servir justo cuando el cliente está por subirlo. El paso 1 de la lista sigue
 * diciendo que revisamos el archivo antes de imprimir, que es la parte que
 * tranquiliza sin plantear el problema.
 */
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
