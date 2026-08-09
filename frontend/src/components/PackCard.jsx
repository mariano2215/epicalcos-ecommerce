import { Link } from 'react-router-dom';
import { formatPrice } from '../context/CartContext.jsx';
import {
  priceForSize,
  sizeLabel,
  BULK_THRESHOLD,
  BULK_DISCOUNT,
  round
} from '../config/pricing.js';
import { shipping } from '../config/site.js';
import { useExperiment } from '../lib/experiments.js';

/**
 * Tarjeta de un tamaño de pack (x10 / x20 / x50 / x100).
 *
 * TODOS los números salen de config/pricing.js — no hay ni un precio escrito a
 * mano acá. Los packs de catálogo NO son una regla de precio nueva: son el
 * precio de lista más el 10 % por transferencia que ya existe desde 10 calcos.
 * Por eso el card muestra las dos cifras y dice de dónde sale el descuento, en
 * vez de inventar un "precio de pack".
 *
 * @param {{ qty:number, size:string, label:string, tagline:string,
 *           to:string, destacado?:boolean, precioFijo?:number, nota?:string }} props
 *        `precioFijo` es para el x100, que sí tiene regla propia en el servidor
 *        (mayorista 50 % off, o la promo de precio fijo por fecha).
 */
export default function PackCard({
  qty, size, label, tagline, to, destacado = false, precioFijo, nota
}) {
  const varianteAhorro = useExperiment('ahorro_pack');

  const unitLista = priceForSize(size);
  const lista = unitLista * qty;

  // Con precio fijo (mayorista/promo) manda ese; si no, el 10 % por
  // transferencia — que solo corre a partir de BULK_THRESHOLD calcos.
  const aplicaVolumen = qty >= BULK_THRESHOLD;
  const conDescuento =
    precioFijo ?? (aplicaVolumen ? round(unitLista * (1 - BULK_DISCOUNT)) * qty : lista);

  const ahorro = lista - conDescuento;
  // El % SIEMPRE se deriva del ahorro real. Tomarlo de una constante hacía que
  // el x100 con la promo mostrara "Ahorrás $120.001 · 10% off" — el monto era
  // correcto y el porcentaje mentía. Derivándolo, no pueden contradecirse.
  const off = lista > 0 ? Math.round((ahorro / lista) * 100) : 0;
  const unitario = Math.round(conDescuento / qty);

  // Señal comercial real: a partir de estos montos el envío no se cobra.
  const envioGratisPais = conDescuento >= shipping.freeShippingThresholdNational;
  const envioGratisRosario = conDescuento >= shipping.freeShippingThresholdRosario;

  return (
    <Link
      to={to}
      className={`card-glass card-glass-hover p-5 flex flex-col h-full relative overflow-hidden ${
        destacado ? 'border-brand-fuchsia/50' : ''
      }`}
    >
      {destacado && (
        <span className="absolute top-0 right-0 text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-bl-xl bg-brand-fuchsia text-white">
          MÁS ELEGIDO
        </span>
      )}

      <div className="font-display font-black text-3xl leading-none">x{qty}</div>
      <div className="font-semibold text-sm mt-1">{label}</div>
      <p className="text-xs text-white/55 mt-1 flex-1">{tagline}</p>

      <div className="mt-4">
        {ahorro > 0 && (
          <div className="text-xs text-white/40 line-through">{formatPrice(lista)}</div>
        )}
        <div className="font-display font-extrabold text-2xl gradient-text leading-none">
          {formatPrice(conDescuento)}
        </div>
        <div className="text-xs text-white/55 mt-1">{formatPrice(unitario)} por calco · {sizeLabel(size)}</div>

        {/* CRO-007: ¿el ahorro pesa más en pesos o en porcentaje?
            Cada variante muestra UNA de las dos formas, no las dos reordenadas
            —si no, no hay nada que medir—. Ninguna esconde información: el card
            ya muestra el precio de lista tachado y el final, así que el cliente
            puede sacar la cuenta en cualquiera de las dos. */}
        {ahorro > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] text-emerald-400 font-semibold">
            {varianteAhorro === 'monto' ? `Ahorrás ${formatPrice(ahorro)}` : `${off}% off`}
          </div>
        )}

        {/* La condición SIEMPRE al lado del número: es el error que ya cometía
            "10% off automático" en /categorias. */}
        <p className="text-[11px] text-white/45 mt-2">
          {nota || (aplicaVolumen ? 'Pagando por transferencia bancaria.' : 'Sin descuento por volumen todavía.')}
        </p>

        {(envioGratisPais || envioGratisRosario) && (
          <p className="text-[11px] text-emerald-400 mt-1">
            🚚 {envioGratisPais ? 'Envío gratis a todo el país' : 'Envío gratis en Rosario'}
          </p>
        )}
      </div>

      <span className="mt-4 btn-primary w-full !py-2.5 text-sm text-center">Armar este pack</span>
    </Link>
  );
}
