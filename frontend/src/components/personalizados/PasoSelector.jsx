import { Swatch } from './swatches.jsx';

/**
 * Grupo de swatches genérico. Reusado para tamaño y corte.
 *
 * @param {{
 *   paso: number, titulo: string, ayuda?: string,
 *   kind: 'tamano'|'corte',                   // qué swatch dibujar (omitir para no dibujar ninguno)
 *   opciones: Array<{ id, label, descripcion? }>,
 *   value: string|number|null,
 *   onSelect: (id) => void,
 *   renderSub?: (opcion) => React.ReactNode,  // línea secundaria (ej: $/u y % off)
 *   columnas?: string
 * }} props
 */
export default function PasoSelector({
  paso,
  titulo,
  ayuda,
  kind,
  opciones,
  value,
  onSelect,
  renderSub,
  columnas = 'grid-cols-2 sm:grid-cols-4'
}) {
  // Un paso está cumplido cuando ya se eligió una opción. Es lo único que este
  // componente necesita saber para confirmarlo: el estado ya existía
  // (`value`), lo que faltaba era decirlo.
  const cumplido = value != null && value !== '';

  return (
    <section className="card-glass p-5">
      <div className="flex items-baseline gap-2 mb-1">
        {/* El badge del paso pasa de número a "✓" cuando se eligió. Mismo tamaño
            y misma posición —`w-6 h-6`, mismo grid— así que el título de al lado
            no se corre ni un píxel al cambiar.
            `key`: remontar es lo que reinicia la animación de entrada cuando se
            cambia de opción dentro del mismo paso. */}
        <span
          key={cumplido ? 'ok' : 'num'}
          className={`motion-check-in grid place-items-center w-6 h-6 rounded-full text-xs font-bold shrink-0 transition-colors ${
            cumplido
              ? 'bg-emerald-400/20 text-emerald-300'
              : 'bg-brand-fuchsia/20 text-brand-fuchsia'
          }`}
        >
          {cumplido ? '✓' : paso}
        </span>
        <h2 className="font-display font-extrabold text-lg">{titulo}</h2>
      </div>
      {ayuda && <p className="text-white/50 text-sm mb-3 ml-8">{ayuda}</p>}

      <div className={`grid ${columnas} gap-2 mt-3`}>
        {opciones.map((op) => {
          const active = value === op.id;
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => onSelect(op.id)}
              aria-pressed={active}
              // `h-full`: las cards de una fila ya miden igual por el grid, pero
              // el <button> tiene que estirarse para que su borde llegue abajo.
              //
              // `flex flex-col justify-start`: el navegador CENTRA verticalmente
              // el contenido de un <button> por estilo propio. Con las cards
              // estiradas a la misma altura, eso bajaba el contenido de la card
              // más corta 2 px respecto de las otras — poco, pero es exactamente
              // la clase de desprolijidad que se nota en una fila de tres.
              className={`motion-press relative h-full flex flex-col justify-start text-left rounded-2xl border p-3 transition-colors ${
                active
                  ? 'border-brand-fuchsia bg-brand-fuchsia/15'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              }`}
            >
              {/* El check de la opción elegida. Va `absolute` para no empujar
                  nada al aparecer: la card mide lo mismo elegida que sin elegir,
                  y una fila de tres no se reacomoda cuando se toca una.
                  `aria-hidden`: el estado ya lo dice `aria-pressed` en el botón —
                  un lector de pantalla no tiene que oír "✓" además de "activado". */}
              {active && (
                <span
                  aria-hidden
                  className="motion-check-in absolute top-2 right-2 grid place-items-center w-5 h-5 rounded-full bg-brand-fuchsia text-white text-[11px] font-bold leading-none"
                >
                  ✓
                </span>
              )}
              {/* `items-start` y NO `items-center`: con descripciones de largo
                  distinto —"Recorte circular." entra en una línea y las otras dos
                  ocupan dos— centrar verticalmente dejaba el título de Círculo
                  varios píxeles más abajo que el de Silueta y Cuadrado. Las
                  cards medían igual; lo que estaba desalineado era el contenido.
                  Arriba, los tres títulos arrancan siempre a la misma altura. */}
              <div className="flex items-start gap-3">
                {kind && (
                  <span className="shrink-0 rounded-xl overflow-hidden bg-black/20 grid place-items-center w-11 h-11">
                    <Swatch kind={kind} id={op.id} />
                  </span>
                )}
                {/* Sin `justify-center`: centrar el bloque de texto contra el
                    swatch vuelve a bajar el título de la card de descripción
                    corta (Círculo quedaba 7 px por debajo de Silueta), que es
                    justo lo que `items-start` viene a arreglar. El texto arranca
                    arriba y, si sobra alto, sobra abajo — donde no se ve. */}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm leading-tight">{op.label}</div>
                  {op.descripcion && (
                    <div className="text-[11px] text-white/45 leading-tight mt-0.5">{op.descripcion}</div>
                  )}
                  {renderSub && <div className="mt-1">{renderSub(op)}</div>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
