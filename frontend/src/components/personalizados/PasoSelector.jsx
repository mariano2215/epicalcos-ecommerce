import { Swatch } from './swatches.jsx';

/**
 * Grupo de swatches genérico. Reusado para material, tamaño, corte y cantidad.
 *
 * @param {{
 *   paso: number, titulo: string, ayuda?: string,
 *   kind: 'material'|'tamano'|'corte',       // qué swatch dibujar (omitir para cantidad)
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
  return (
    <section className="card-glass p-5">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="grid place-items-center w-6 h-6 rounded-full bg-brand-fuchsia/20 text-brand-fuchsia text-xs font-bold shrink-0">
          {paso}
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
              className={`text-left rounded-2xl border p-3 transition-colors ${
                active
                  ? 'border-brand-fuchsia bg-brand-fuchsia/15'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              }`}
            >
              <div className="flex items-center gap-3">
                {kind && (
                  <span className="shrink-0 rounded-xl overflow-hidden bg-black/20 grid place-items-center w-11 h-11">
                    <Swatch kind={kind} id={op.id} />
                  </span>
                )}
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
