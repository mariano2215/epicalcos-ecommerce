import { useId, useRef } from 'react';

/**
 * Grupo de opciones del cotizador (cantidad, tamaño, material, diseños) —
 * spec 031, en el pedido *QuantitySelector* / *SizeSelector* /
 * *MaterialSelector*. Un radiogroup real, con el mismo patrón que
 * `personalizados/SelectorMaterial`: las flechas mueven la selección y el
 * foco, y solo la opción elegida entra en el orden de tabulación (un Tab salta
 * el grupo entero, no sus cinco botones).
 *
 * No se reusan los selectores de /personalizados: traen el copy y el tracking
 * de esa página adentro, y tocarlos es tocar código de la spec 023 en curso.
 *
 * @param {{ titulo: string, opciones: Array<{ valor: any, label: string, detalle?: string,
 *           etiqueta?: string, visual?: import('react').ReactNode }>,
 *           valor: any, onElegir: (v:any) => void, columnas?: string }} props
 */
export default function GrupoOpciones({
  titulo,
  opciones,
  valor,
  onElegir,
  columnas = 'grid-cols-2 sm:grid-cols-4',
  // Más chico cuando el rótulo es largo y van tres por fila: "VINILO
  // HOLOGRÁFICO" en mayúsculas no entraba en un tercio de 375 px.
  rotulo = 'text-base'
}) {
  const tituloId = useId();
  const refs = useRef([]);
  const elegida = Math.max(0, opciones.findIndex((o) => o.valor === valor));

  const onKeyDown = (e, i) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const j = (i + delta + opciones.length) % opciones.length;
    onElegir(opciones[j].valor);
    refs.current[j]?.focus();
  };

  return (
    <fieldset className="min-w-0">
      <legend id={tituloId} className="font-display font-extrabold text-sm mb-3">
        {titulo}
      </legend>
      <div role="radiogroup" aria-labelledby={tituloId} className={`grid gap-2 ${columnas}`}>
        {opciones.map((o, i) => {
          const activa = o.valor === valor;
          return (
            <button
              key={String(o.valor)}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={activa}
              tabIndex={i === elegida ? 0 : -1}
              onClick={() => onElegir(o.valor)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative flex flex-col items-center justify-center text-center rounded-2xl border px-2 py-3 min-h-[56px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-fuchsia focus-visible:ring-offset-2 focus-visible:ring-offset-[#111] ${
                activa ? 'border-brand-fuchsia bg-brand-fuchsia/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              }`}
            >
              {o.etiqueta && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-extrabold tracking-wide px-1.5 py-0.5 rounded-full bg-brand-fuchsia text-white">
                  {o.etiqueta}
                </span>
              )}
              {o.visual}
              <span className={`font-display font-extrabold ${rotulo} leading-tight break-words max-w-full`}>{o.label}</span>
              {o.detalle && <span className="text-[11px] text-white/55 leading-tight mt-0.5">{o.detalle}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
