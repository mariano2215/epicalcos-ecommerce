import { useRef } from 'react';
import { TAMANOS, MATERIAL_HOLOGRAFICO_ID, PACK_HOLOGRAFICO, RECARGO_HOLOGRAFICO, tamanoPermitido } from '../../config/personalizados.js';
import { TAMANO, TAMANO_MAS_ELEGIDO } from '../../config/personalizadosLanding.js';
import { usoCorto } from '../../lib/usosPorTamano.js';
import { formatPrice } from '../../lib/formato.js';
import { trackPersonalizedSizeSelected } from '../../lib/analytics.js';
import { Swatch } from './swatches.jsx';
import { IDS } from './acciones.js';

/**
 * Tamaño, como grupo de radios (RF-C4, C5).
 *
 * NO viene elegido (D-4): un personalizado solo se devuelve por falla, así que
 * el tamaño tiene que ser una decisión que el cliente vio, no un default que se
 * le pasó. El de 6 cm lleva "Más elegido", que es lo mismo que ya dice el sitio
 * del catálogo (`usosPorTamano.js`).
 *
 * Cada card dice para qué sirve, con la misma tabla que la grilla y la guía de
 * tamaños: "6 cm" solo, no le dice nada a alguien que nunca midió una calco.
 * Es el ÚNICO selector de tamaño de la página (D-6).
 *
 * Con Vinilo Holográfico (enmienda 26/9/2026, RF-MAT13) 9 cm queda deshabilitado
 * y los tamaños que sí van muestran el precio del pack, no el "c/u": el
 * holográfico no tiene precio por unidad, y un "c/u" al lado del total del
 * pack se leería como un error.
 */
export default function SelectorTamano({ valor, material, onElegir }) {
  const refs = useRef([]);
  const esHolografico = material === MATERIAL_HOLOGRAFICO_ID;
  const habilitado = (id) => tamanoPermitido(id, material);

  const elegir = (id) => {
    if (!habilitado(id)) return;
    if (id !== valor) trackPersonalizedSizeSelected(id);
    onElegir(id);
  };

  // Radio group de verdad: las flechas mueven la selección (y el foco),
  // salteando los tamaños deshabilitados.
  const onKeyDown = (e, i) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    let j = i;
    do j = (j + delta + TAMANOS.length) % TAMANOS.length;
    while (!habilitado(TAMANOS[j].id) && j !== i);
    elegir(TAMANOS[j].id);
    refs.current[j]?.focus();
  };

  const conFoco = valor ? TAMANOS.findIndex((t) => t.id === valor) : TAMANOS.findIndex((t) => habilitado(t.id));

  return (
    <div id={IDS.tamano} className="scroll-mt-28">
      <div className="font-display font-extrabold text-sm" id="titulo-tamano">
        {TAMANO.titulo}
      </div>
      <div role="radiogroup" aria-labelledby="titulo-tamano" className="grid grid-cols-3 gap-2 mt-3">
        {TAMANOS.map((t, i) => {
          const activo = valor === t.id;
          const disponible = habilitado(t.id);
          return (
            <button
              key={t.id}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={activo}
              disabled={!disponible}
              tabIndex={i === conFoco ? 0 : -1}
              onClick={() => elegir(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative h-full flex flex-col items-center justify-start text-center rounded-2xl border px-2 pt-4 pb-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                activo ? 'border-brand-fuchsia bg-brand-fuchsia/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              }`}
            >
              {t.id === TAMANO_MAS_ELEGIDO && (
                <span className="badge badge-hot absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap !text-[9px]">
                  {TAMANO.masElegido}
                </span>
              )}
              <Swatch kind="tamano" id={t.id} />
              <span className="font-display font-extrabold text-base mt-1">{t.label}</span>
              {!disponible ? (
                <span className="text-[10px] text-white/70 leading-tight mt-0.5">No disponible en holográfico</span>
              ) : esHolografico ? (
                <span className="text-[11px] text-white/70">
                  {PACK_HOLOGRAFICO.qty} por {formatPrice(PACK_HOLOGRAFICO.precio + RECARGO_HOLOGRAFICO.precio)}
                </span>
              ) : (
                <span className="text-[11px] text-white/70">{formatPrice(t.precio)} c/u</span>
              )}
              {disponible && <span className="text-[10px] text-white/45 leading-tight mt-0.5">{usoCorto(t.id)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
