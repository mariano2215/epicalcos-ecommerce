import { CORTES, getCorte } from '../../config/personalizados.js';
import { OPCIONES } from '../../config/personalizadosLanding.js';
import { Swatch } from './swatches.jsx';

/**
 * Corte e instrucciones, plegados (RF-C3, D-5). La primera etapa del
 * configurador es imagen, tamaño y cantidad; el corte no cambia el precio y va
 * con silueta por defecto. `<details>` y no un acordeón propio: teclado y
 * lector de pantalla funcionan solos.
 */
export default function OpcionesExtra({ corte, instrucciones, onCorte, onInstrucciones }) {
  const resumen = `${OPCIONES.corte}: ${getCorte(corte)?.label || ''}${instrucciones.trim() ? ' · con notas' : ''}`;
  return (
    <details className="group rounded-2xl border border-white/10 bg-white/[0.02]">
      <summary className="list-none cursor-pointer min-h-[44px] px-4 flex items-center justify-between gap-3 text-sm [&::-webkit-details-marker]:hidden">
        <span className="font-semibold">{OPCIONES.titulo}</span>
        <span className="flex items-center gap-2 text-xs text-white/50">
          {resumen}
          <span className="transition-transform group-open:rotate-180" aria-hidden="true">
            ▾
          </span>
        </span>
      </summary>
      <div className="px-4 pb-4">
        <div className="text-xs text-white/60 mb-2" id="titulo-corte">
          {OPCIONES.corte}
        </div>
        <div role="radiogroup" aria-labelledby="titulo-corte" className="grid grid-cols-3 gap-2">
          {CORTES.map((c) => {
            const activo = corte === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => onCorte(c.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 min-h-[44px] text-xs transition-colors ${
                  activo ? 'border-brand-fuchsia bg-brand-fuchsia/15' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <Swatch kind="corte" id={c.id} />
                <span className="font-semibold">{c.label}</span>
              </button>
            );
          })}
        </div>
        <label className="block mt-4">
          <span className="text-xs text-white/60">{OPCIONES.instrucciones}</span>
          <textarea
            value={instrucciones}
            onChange={(e) => onInstrucciones(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={OPCIONES.placeholder}
            className="input-dark mt-1.5 resize-none text-sm"
          />
        </label>
      </div>
    </details>
  );
}
