import { useState, useEffect } from 'react';
import {
  shippingMethods,
  shipping as shippingCfg,
  provinces,
  shippingZone,
  shippingMethodLabel,
  bankTransfer,
  contact
} from '../config/site.js';
import { useCart } from '../context/CartContext.jsx';

const paymentMethods = [
  { value: 'mercadopago', label: 'Mercado Pago', icon: '💳', blurb: 'Tarjetas, dinero en cuenta, Rapipago o Pago Fácil.' },
  { value: 'transferencia', label: 'Transferencia bancaria', icon: '🏦', blurb: '10% off desde 10 calcos totales.' }
];

const initial = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: 'Rosario',
  province: 'Santa Fe',
  zipCode: '',
  shippingMethod: 'envio',
  paymentMethod: 'mercadopago',
  comments: ''
};

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Ingresá tu nombre';
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Email inválido';
  if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 8) errors.phone = 'Teléfono incompleto';
  const needsAddress = form.shippingMethod !== 'retiro';
  if (needsAddress) {
    if (!form.address.trim()) errors.address = 'Dirección requerida';
    if (!form.city.trim()) errors.city = 'Ciudad requerida';
    if (!form.zipCode.trim()) errors.zipCode = 'Código postal requerido';
  }
  return errors;
}

/**
 * `percentBlocked` = hay un cupón de bundle (2x1) aplicado, que NO se acumula
 * con el 10 % por transferencia ni con el 10 % por volumen: con eso en true no
 * se promete ningún % acá adentro.
 */
export default function CheckoutForm({ onSubmit, onShippingChange, onPaymentMethodChange, onEmailValid, submitting, errorMsg, percentBlocked = false }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const { bulkEligible, unitsToBulk } = useCart();

  // Notificar al parent método + destino (ciudad/provincia) para recalcular el envío automático.
  useEffect(() => {
    onShippingChange?.({ method: form.shippingMethod, city: form.city, province: form.province });
  }, [form.shippingMethod, form.city, form.province, onShippingChange]);

  // Notificar al parent el medio de pago elegido para recalcular el total (10% off por transferencia).
  useEffect(() => {
    onPaymentMethodChange?.(form.paymentMethod);
  }, [form.paymentMethod, onPaymentMethodChange]);

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      const methodLabel = shippingMethodLabel(form.shippingMethod, form.city, form.province);
      onSubmit({
        payer: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim()
        },
        shipping: {
          methodValue: form.shippingMethod,
          method: methodLabel,
          city: form.city.trim(),
          province: form.province.trim(),
          zipCode: form.zipCode.trim(),
          comments: form.comments.trim() || undefined
        },
        paymentMethod: form.paymentMethod
      });
    }
  };

  const needsAddress = form.shippingMethod !== 'retiro';
  const zone = shippingZone(form.city, form.province);
  const isTransfer = form.paymentMethod === 'transferencia';

  return (
    <form onSubmit={submit} className="card-glass p-6 md:p-8 space-y-5">
      <h3 className="font-display font-extrabold text-xl">Datos del comprador</h3>

      {/* `autoComplete` + `inputMode` + `type` en todos los campos: el formulario
          no tenía ninguno, así que en mobile había que tipear nombre, mail,
          teléfono y dirección a mano, con el teclado equivocado. Es la fricción
          más barata de sacar de todo el checkout. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-white/70 mb-1.5 block">Nombre completo *</span>
          <input
            type="text"
            value={form.name}
            onChange={change('name')}
            placeholder="Juan Pérez"
            autoComplete="name"
            className="input-dark"
          />
          {errors.name && <span className="text-xs text-brand-pink mt-1 block">{errors.name}</span>}
        </label>
        <label className="block">
          <span className="text-sm text-white/70 mb-1.5 block">Email *</span>
          <input
            type="email"
            value={form.email}
            onChange={change('email')}
            // Al salir del campo con un mail válido se registra el carrito para
            // el recordatorio de abandono. En blur y no en cada tecla: mientras
            // tipea, "juan@g" es un mail distinto en cada pulsación.
            onBlur={(e) => {
              const email = e.target.value.trim();
              if (/^\S+@\S+\.\S+$/.test(email)) onEmailValid?.(email, form.name.trim());
            }}
            placeholder="tu@email.com"
            autoComplete="email"
            inputMode="email"
            className="input-dark"
          />
          {errors.email && <span className="text-xs text-brand-pink mt-1 block">{errors.email}</span>}
        </label>
        <label className="block">
          <span className="text-sm text-white/70 mb-1.5 block">Teléfono *</span>
          <input
            type="tel"
            value={form.phone}
            onChange={change('phone')}
            placeholder="3410000000"
            autoComplete="tel"
            inputMode="tel"
            className="input-dark"
          />
          {errors.phone && <span className="text-xs text-brand-pink mt-1 block">{errors.phone}</span>}
        </label>
      </div>

      <h3 className="font-display font-extrabold text-xl pt-2">Entrega</h3>

      <label className="block">
        <span className="text-sm text-white/70 mb-1.5 block">Método de entrega</span>
        <select value={form.shippingMethod} onChange={change('shippingMethod')} className="input-dark">
          {shippingMethods.map((s) => (
            <option key={s.value} value={s.value} className="bg-bg-deep">{s.label}</option>
          ))}
        </select>
      </label>

      {form.shippingMethod === 'retiro' && (
        <div className="rounded-xl p-3 text-sm border border-brand-pink/40 bg-brand-pink/10 text-white/80">
          📍 El retiro es en la zona de <strong className="text-white">{shippingCfg.pickupZone}</strong>.
          Si no podés acercarte hasta ahí, elegí una opción de envío.
          <span className="block mt-1 text-white/60">{shippingCfg.pickupLabel}. Te contactamos al teléfono que dejes acá.</span>
        </div>
      )}

      {needsAddress && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm text-white/70 mb-1.5 block">Dirección *</span>
              <input
                type="text"
                value={form.address}
                onChange={change('address')}
                placeholder="Calle 1234, depto 2B"
                autoComplete="street-address"
                className="input-dark"
              />
              {errors.address && <span className="text-xs text-brand-pink mt-1 block">{errors.address}</span>}
            </label>
            <label className="block">
              <span className="text-sm text-white/70 mb-1.5 block">Ciudad *</span>
              <input
                type="text"
                value={form.city}
                onChange={change('city')}
                autoComplete="address-level2"
                className="input-dark"
              />
              {errors.city && <span className="text-xs text-brand-pink mt-1 block">{errors.city}</span>}
            </label>
            <label className="block">
              <span className="text-sm text-white/70 mb-1.5 block">Provincia *</span>
              <select value={form.province} onChange={change('province')} autoComplete="address-level1" className="input-dark">
                {provinces.map((p) => (
                  <option key={p} value={p} className="bg-bg-deep">{p}</option>
                ))}
              </select>
              {errors.province && <span className="text-xs text-brand-pink mt-1 block">{errors.province}</span>}
            </label>
            <label className="block">
              <span className="text-sm text-white/70 mb-1.5 block">Código postal *</span>
              <input
                type="text"
                value={form.zipCode}
                onChange={change('zipCode')}
                placeholder="2000"
                autoComplete="postal-code"
                inputMode="numeric"
                className="input-dark"
              />
              {errors.zipCode && <span className="text-xs text-brand-pink mt-1 block">{errors.zipCode}</span>}
            </label>
          </div>
          <p className="text-xs text-white/50">
            📦 Calculamos el envío automáticamente según tu ciudad y provincia — lo ves en el resumen del pedido.
          </p>
          <p className="text-xs text-white/50">
            ⚡ Producción: <strong className="text-white/70">{shippingCfg.production}</strong> · 🚚 entrega estimada:{' '}
            <strong className="text-white/70">
              {zone === 'interior' ? shippingCfg.deliveryInterior : shippingCfg.deliveryRosario}
            </strong>
            {zone === 'interior' && ' (incluye el correo)'}
          </p>
        </>
      )}

      <h3 className="font-display font-extrabold text-xl pt-2">Forma de pago</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {paymentMethods.map((m) => {
          const active = form.paymentMethod === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, paymentMethod: m.value }))}
              className={`text-left rounded-xl p-4 border transition-colors ${
                active
                  ? 'border-brand-fuchsia bg-brand-fuchsia/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              }`}
              aria-pressed={active}
            >
              <div className="flex items-center gap-2 font-semibold">
                <span aria-hidden>{m.icon}</span> {m.label}
              </div>
              <div className="text-xs text-white/50 mt-1">{m.blurb}</div>
            </button>
          );
        })}
      </div>

      {isTransfer && (
        <div className="rounded-xl p-4 border border-white/10 bg-white/5 space-y-2 text-sm">
          {percentBlocked ? (
            <div className="text-white/60">Ya tenés un cupón aplicado: no se le suma el 10% por transferencia.</div>
          ) : bulkEligible ? (
            <div className="text-emerald-400 font-semibold">🎉 Tu pedido ya tiene 10% off por transferencia.</div>
          ) : unitsToBulk > 0 ? (
            <div className="text-white/60">Sumá {unitsToBulk} calco{unitsToBulk === 1 ? '' : 's'} más para el 10% off.</div>
          ) : null}
          <p className="text-white/70">Transferí el total del pedido a:</p>
          <dl className="space-y-1 text-white/80">
            <div className="flex justify-between gap-3"><dt className="text-white/50">CVU</dt><dd className="font-mono">{bankTransfer.cvu}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-white/50">Alias</dt><dd className="font-mono">{bankTransfer.alias}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-white/50">Titular</dt><dd className="text-right">{bankTransfer.titular}</dd></div>
          </dl>
          <p className="text-white/70 pt-1">
            Después de confirmar el pedido, enviá el comprobante por WhatsApp al{' '}
            <a href={contact.whatsappUrl} target="_blank" rel="noreferrer" className="text-brand-fuchsia font-semibold">
              {contact.whatsappDisplay}
            </a>{' '}
            para que empecemos a producir.
          </p>
        </div>
      )}

      <label className="block">
        <span className="text-sm text-white/70 mb-1.5 block">Comentarios (opcional)</span>
        <textarea
          rows={3}
          value={form.comments}
          onChange={change('comments')}
          placeholder="Notas para el pedido, referencias de diseño, horario de entrega…"
          className="input-dark resize-none"
        />
      </label>

      {errorMsg && (
        <div className="rounded-xl p-3 text-sm border border-brand-pink/40 bg-brand-pink/10 text-brand-pink">
          {errorMsg}
        </div>
      )}

      {/* Confianza justo antes de confirmar. Solo afirmaciones verificables:
          MP procesa el pago (nunca vemos la tarjeta), los datos van por HTTPS,
          y el envío a todo el país es real. Nada de garantías inventadas — la
          política de cambios está en /politicas/cambios. */}
      <ul className="grid grid-cols-2 gap-2 text-xs text-white/60">
        {[
          isTransfer ? '🏦 Transferencia directa' : '🔒 Pago procesado por Mercado Pago',
          '🛡️ No guardamos datos de tarjeta',
          '🇦🇷 Envíos a todo el país',
          '💬 Te escribimos por WhatsApp'
        ].map((t) => (
          <li key={t} className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-2">
            {t}
          </li>
        ))}
      </ul>

      <button type="submit" disabled={submitting} className="btn-primary w-full !py-4 text-base">
        {submitting
          ? (isTransfer ? 'Confirmando pedido…' : 'Generando pago…')
          : (isTransfer ? '📤 Confirmar pedido por transferencia' : '🔒 Pagar seguro con Mercado Pago')}
      </button>
      <p className="text-xs text-white/50 text-center">
        {isTransfer
          ? 'Confirmamos tu pedido y te esperamos el comprobante por WhatsApp.'
          : 'Vas a ser redirigido a Mercado Pago para completar tu compra de forma segura.'}
      </p>
    </form>
  );
}
