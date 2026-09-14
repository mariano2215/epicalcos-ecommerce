import { textosGarantia } from '../lib/garantia.js';
import { trackGarantiaCondiciones } from '../lib/analytics.js';

/**
 * La garantía del carrito, arriba del botón de pagar (spec 021).
 *
 * Es el PRIMER ítem de la lista de confianza del checkout y ocupa las dos
 * columnas: responde la duda más cara del momento de pagar ("¿y si no me
 * gusta?"). Como quinto chip quedaba huérfano en la grilla y se leía como uno más.
 *
 * El texto depende de lo que hay en el carrito (`tipo`, de lib/garantia.js):
 * lo de catálogo se devuelve por cualquier motivo, lo hecho con el archivo del
 * cliente solo se repone por falla, y con un carrito solo digital no se promete
 * nada (`tipo` null → no se renderiza).
 *
 * Las condiciones van en un <details> PLEGADO:
 * - Plegado, porque tres o cuatro renglones entre el formulario y el botón
 *   empujan el botón y le hacen dudar a quien no tenía la duda. Está para quien
 *   la tiene.
 * - <details> nativo, porque ya es accesible (teclado, lector de pantalla,
 *   estado abierto/cerrado) sin estado de React. React solo escucha `onToggle`
 *   para el evento.
 * - SIN link a /politicas/cambios: el formulario del checkout no guarda lo
 *   tipeado, así que salir de la página le borra los datos, y en el navegador de
 *   Instagram —de donde viene la mayoría— un `target="_blank"` no garantiza una
 *   pestaña aparte. La política completa sigue en el footer.
 */
export default function GarantiaCheckout({ tipo }) {
  const textos = textosGarantia(tipo);
  if (!textos) return null;

  // `toggle` también dispara al cerrar: el evento es solo para quien la ABRE.
  const onToggle = (e) => {
    if (e.currentTarget.open) trackGarantiaCondiciones(tipo);
  };

  return (
    <li className="col-span-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-3 pt-2.5">
      <p className="flex items-start gap-2 text-sm font-semibold leading-snug text-white">
        <span aria-hidden="true">{textos.icono}</span>
        <span>{textos.titulo}</span>
      </p>
      <details className="group" onToggle={onToggle}>
        {/* 44 px de alto: es un blanco táctil en el celular, pegado al botón de
            pagar. `list-none` + el marcador de WebKit escondido para que no
            aparezca el triángulo nativo además del nuestro. */}
        <summary className="inline-flex min-h-[44px] cursor-pointer list-none items-center gap-1 rounded text-xs font-medium text-emerald-300 hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 [&::-webkit-details-marker]:hidden">
          Ver condiciones
          <span aria-hidden="true" className="transition-transform motion-reduce:transition-none group-open:rotate-180">
            ▾
          </span>
        </summary>
        <ul className="list-disc space-y-1 pb-3 pl-4 text-xs leading-relaxed text-white/70">
          {textos.condiciones.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </details>
    </li>
  );
}
