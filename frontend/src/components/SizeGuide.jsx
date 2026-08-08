import { useState } from 'react';
import { SIZES } from '../config/pricing.js';

/**
 * Resuelve la objeción "no sé qué tamaño elegir".
 *
 * Dibuja los tres tamaños A ESCALA REAL entre sí (4 : 6 : 9) sobre la silueta
 * de un objeto de referencia, y lista para qué sirve cada uno. No usa fotos
 * porque no las tenemos: una comparación proporcional es honesta y se entiende
 * igual, y no promete un render que después el producto no cumple.
 */
const USOS = {
  '4cm': { tag: 'Chica', para: ['celular', 'llavero', 'detalles', 'objetos chicos'] },
  '6cm': { tag: 'Mediana · la más elegida', para: ['termo', 'notebook', 'botella', 'mate'] },
  '9cm': { tag: 'Grande', para: ['auto', 'casco', 'vidriera', 'objetos grandes'] }
};

/** Lado del cuadrado en px, proporcional a los cm reales (9 cm = 72 px). */
const px = (sizeId) => (parseInt(sizeId, 10) / 9) * 72;

export default function SizeGuide({ selectedSize, onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-sm text-white/60 hover:text-white underline decoration-white/30 underline-offset-2"
      >
        📏 ¿Qué tamaño me conviene?
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          {/* Comparación a escala */}
          <div className="flex items-end justify-center gap-5 pb-4 border-b border-white/10">
            {SIZES.map((s) => {
              const side = px(s.id);
              const active = s.id === selectedSize;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect?.(s.id)}
                  className="flex flex-col items-center gap-2 group"
                  aria-label={`Elegir ${s.label}`}
                  aria-pressed={active}
                >
                  <div
                    style={{ width: side, height: side }}
                    className={`rounded-lg border-2 transition-colors ${
                      active
                        ? 'border-brand-fuchsia bg-brand-fuchsia/20'
                        : 'border-white/25 bg-white/5 group-hover:border-white/50'
                    }`}
                  />
                  <span className={`text-xs font-bold ${active ? 'text-white' : 'text-white/60'}`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Para qué sirve cada uno */}
          <ul className="mt-4 space-y-2.5">
            {SIZES.map((s) => (
              <li key={s.id} className="text-sm">
                <span className="font-bold text-white">{s.label}</span>
                <span className="text-white/40"> · {USOS[s.id].tag}</span>
                <div className="text-white/60 text-xs mt-0.5">
                  Ideal para: {USOS[s.id].para.join(', ')}.
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
