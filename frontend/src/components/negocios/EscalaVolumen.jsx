import { useState } from 'react';
import { formatPrice } from '../../lib/formato.js';
import { ESCALA, MUESTRA_GRATIS } from '../../config/negocios.js';
import { MATERIAL_HOLOGRAFICO_ID, getMaterial } from '../../config/personalizados.js';
import { filasEscala, TAMANOS_ESCALA, MATERIALES_ESCALA } from '../../lib/cotizadorNegocio.js';

const num = (n) => Number(n).toLocaleString('es-AR');

/**
 * "Mientras más cantidad, más barato te sale" (spec 031 RF-E1; en el pedido,
 * *WholesaleTable* / *BulkDiscount*). Una card por escalón con el total, el
 * precio por calco, el de transferencia y su etiqueta.
 *
 * Todo sale de la escala de la spec 032 (`filasEscala()`): si mañana cambia un
 * escalón, cambian el total, el por calco y el % sin tocar este archivo.
 *
 * Etiquetas verificables y nada más (031 RF-E3): 100 → MUESTRA GRATIS (ese
 * escalón no tiene descuento), 250/500/1.000 → su %, y "mejor precio por
 * calco" solo en el último, que lo es por definición. Ningún "más elegido":
 * no hay dato que lo respalde.
 *
 * Cards y no tabla: a 375 px una tabla de cuatro columnas con montos de seis
 * dígitos no entra sin scroll horizontal.
 *
 * Dos filas de precios: vinilo blanco y DTF UV comparten una (valen lo mismo),
 * el holográfico tiene la suya. 4 y 6 cm valen lo mismo en la escala.
 */
export default function EscalaVolumen({ id = 'precios', titulo = ESCALA.titulo, conHolografico = true }) {
  const tamano = TAMANOS_ESCALA[TAMANOS_ESCALA.length - 1];
  // En /mayorista no se vende holográfico (el armador es de catálogo y diseños
  // propios en vinilo): mostrar su precio ahí sería ofrecer algo que no se puede
  // agregar. Va `conHolografico={false}` y desaparece el selector.
  const opciones = [
    { id: 'comun', material: MATERIALES_ESCALA[0], label: MATERIALES_ESCALA.filter((m) => m !== MATERIAL_HOLOGRAFICO_ID).map((m) => getMaterial(m)?.label).join(' o ') },
    ...(conHolografico ? [{ id: 'holo', material: MATERIAL_HOLOGRAFICO_ID, label: ESCALA.holografico }] : [])
  ];
  const [elegida, setElegida] = useState(opciones[0].id);
  const filas = filasEscala({ tamano, material: opciones.find((o) => o.id === elegida).material });

  return (
    <section id={id} className="seccion scroll-mt-24">
      <div className="container-app">
        <div className="seccion-encabezado text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-5xl">{titulo}</h2>
          <p className="text-white/70 mt-3">{ESCALA.bajada}</p>
        </div>

        {opciones.length > 1 && (
        <div role="group" aria-label="Material" className="flex flex-wrap justify-center gap-2 mb-6">
          {opciones.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={elegida === o.id}
              onClick={() => setElegida(o.id)}
              className={`px-4 min-h-[44px] rounded-full text-sm border transition-colors ${
                elegida === o.id ? 'border-brand-fuchsia bg-brand-fuchsia/15 text-white' : 'border-white/10 text-white/65 hover:border-white/25'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        )}

        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-live="polite">
          {filas.map((f, i) => {
            const ultima = i === filas.length - 1;
            return (
              <li
                key={f.cantidad}
                className={`card-glass p-4 md:p-5 flex flex-col ${ultima ? 'border border-brand-fuchsia/40' : ''}`}
              >
                <span className="text-xs uppercase tracking-wider text-white/50">{num(f.cantidad)} calcos</span>
                <span className="font-display font-black text-2xl md:text-3xl mt-1">{formatPrice(f.total)}</span>
                <span className="text-sm text-white/80 mt-1">
                  <strong className="text-white">{formatPrice(f.unitario)}</strong> por calco
                </span>
                <span className="text-xs text-emerald-300 mt-1">
                  {formatPrice(f.totalTransferencia)} por transferencia
                </span>
                <span className="mt-3">
                  {f.pct > 0 ? (
                    <span className="badge badge-hot">−{f.pct}% por calco</span>
                  ) : (
                    <span className="badge badge-new" title={MUESTRA_GRATIS.aclaracion}>
                      {MUESTRA_GRATIS.titulo}
                    </span>
                  )}
                </span>
                {f.pct === 0 && <span className="text-[11px] text-white/50 mt-1 leading-tight">{MUESTRA_GRATIS.aclaracion}</span>}
                {ultima && <span className="text-[11px] text-brand-fuchsia font-semibold mt-1">{ESCALA.mejorPrecio}</span>}
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-white/50 text-center mt-5 max-w-2xl mx-auto">{ESCALA.nota}</p>
      </div>
    </section>
  );
}
