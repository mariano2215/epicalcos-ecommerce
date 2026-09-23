import { useRef } from 'react';
import { MATERIALES, MATERIAL_HOLOGRAFICO_ID, RECARGO_HOLOGRAFICO } from '../../config/personalizados.js';
import { MATERIAL_COPY } from '../../config/personalizadosLanding.js';
import { formatPrice } from '../../lib/formato.js';
import { trackPersonalizedMaterialSelected } from '../../lib/analytics.js';
import { Swatch } from './swatches.jsx';

/**
 * Material, como grupo de radios (RF-MAT1, enmienda 22/9/2026). Mismo patrón
 * de interacción que `SelectorTamano` (radio group real: las flechas mueven
 * la selección y el foco).
 *
 * El recargo del Vinilo Holográfico se muestra en LA CARD, no escondido en el
 * total de más abajo (RF-MAT5): quien elige tiene que ver el "+$15.000" en el
 * momento de elegir, no descubrirlo recién en el total.
 */
export default function SelectorMaterial({ valor, onElegir }) {
  const refs = useRef([]);

  const elegir = (id) => {
    if (id !== valor) trackPersonalizedMaterialSelected(id);
    onElegir(id);
  };

  const onKeyDown = (e, i) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const j = (i + delta + MATERIALES.length) % MATERIALES.length;
    elegir(MATERIALES[j].id);
    refs.current[j]?.focus();
  };

  const conFoco = valor ? MATERIALES.findIndex((m) => m.id === valor) : 0;

  return (
    <div className="scroll-mt-28">
      <div className="font-display font-extrabold text-sm" id="titulo-material">
        {MATERIAL_COPY.titulo}
      </div>
      <div role="radiogroup" aria-labelledby="titulo-material" className="grid grid-cols-3 gap-2 mt-3">
        {MATERIALES.map((m, i) => {
          const activo = valor === m.id;
          const esHolografico = m.id === MATERIAL_HOLOGRAFICO_ID;
          return (
            <button
              key={m.id}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={activo}
              tabIndex={i === conFoco ? 0 : -1}
              onClick={() => elegir(m.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative h-full flex flex-col items-center justify-start text-center rounded-2xl border px-2 pt-4 pb-3 transition-colors ${
                activo ? 'border-brand-fuchsia bg-brand-fuchsia/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              }`}
            >
              <Swatch kind="material" id={m.id} />
              <span className="font-display font-extrabold text-base mt-1">{m.label}</span>
              {esHolografico ? (
                <span className="text-[11px] text-brand-fuchsia font-semibold">+{formatPrice(RECARGO_HOLOGRAFICO.precio)}</span>
              ) : (
                <span className="text-[11px] text-white/45">Sin recargo</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
