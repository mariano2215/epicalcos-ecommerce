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
 * Incluye la objeción que faltaba responder: "¿y si mi archivo no está bueno?".
 * No es una promesa nueva — es lo que el sitio YA hace y dice en /pago-exitoso
 * ("revisamos tu archivo… si algo no da, te escribimos por WhatsApp"). Estaba
 * dicho recién DESPUÉS de pagar, que es tarde para que sirva de algo.
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

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
        <div className="text-sm font-semibold">¿Y si mi archivo no está perfecto?</div>
        <p className="text-sm text-white/65 mt-1">
          No lo imprimimos y listo. Miramos cada diseño antes de producir y, si la calidad no da o hay
          algo raro con el corte, te escribimos por WhatsApp para resolverlo antes de que se imprima
          nada. No hace falta que mandes el archivo perfecto.
        </p>
      </div>
    </section>
  );
}
