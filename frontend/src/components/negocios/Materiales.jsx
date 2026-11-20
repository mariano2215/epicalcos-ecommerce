import { MATERIALES_NEGOCIO, COTIZADOR } from '../../config/negocios.js';
import { Swatch } from '../personalizados/swatches.jsx';

/**
 * Materiales (spec 031 RF-M1/M2; en el pedido, *MaterialCard*). Nombre y
 * descripción salen de `MATERIALES` de config/personalizados.js, el mismo que
 * usan /personalizados y el cotizador: un material no puede llamarse distinto
 * en dos páginas.
 *
 * Sin foto: la foto de cada material se muestra solo si existe (RF-M3), y hoy
 * no existe ninguna (N-6). Va el swatch de /personalizados, que es un dibujo
 * del material y no pretende ser una foto.
 */
export default function Materiales() {
  return (
    <section className="seccion pt-0">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">{MATERIALES_NEGOCIO.titulo}</h2>
          <p className="text-white/70 mt-3">{MATERIALES_NEGOCIO.bajada}</p>
        </div>
        <ul className="grid gap-3 md:grid-cols-3">
          {MATERIALES_NEGOCIO.items.map((m) => (
            <li key={m.id} className={`card-glass p-5 md:p-6 ${m.recomendado ? 'border border-brand-fuchsia/40' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="shrink-0" aria-hidden>
                  <Swatch kind="material" id={m.id} />
                </span>
                <h3 className="font-display font-extrabold text-lg">{m.label}</h3>
                {m.recomendado && <span className="badge badge-new ml-auto">{COTIZADOR.recomendado}</span>}
              </div>
              <p className="text-sm text-white/70 mt-3">{m.descripcion}</p>
              {m.nota && <p className="text-xs text-white/50 mt-2">{m.nota}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
