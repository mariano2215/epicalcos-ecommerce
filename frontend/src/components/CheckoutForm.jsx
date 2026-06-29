import { useState, useEffect } from 'react';
import {
  shippingMethods,
  shipping as shippingCfg,
  provinces,
  shippingZone,
  shippingMethodLabel
} from '../config/site.js';

const initial = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: 'Rosario',
  province: 'Santa Fe',
  zipCode: '',
  shippingMethod: 'envio',
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

export default function CheckoutForm({ onSubmit, onShippingChange, submitting, errorMsg }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  // Notificar al parent método + destino (ciudad/provincia) para recalcular el envío automático.
  useEffect(() => {
    onShippingChange?.({ method: form.shippingMethod, city: form.city, province: form.province });
  }, [form.shippingMethod, form.city, form.province, onShippingChange]);

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
        }
      });
    }
  };

  const needsAddress = form.shippingMethod !== 'retiro';
  const zone = shippingZone(form.city, form.province);

  return (
    <form onSubmit={submit} className="card-glass p-6 md:p-8 space-y-5">
      <h3 className="font-display font-extrabold text-xl">Datos del comprador</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-white/70 mb-1.5 block">Nombre completo *</span>
          <input type="text" value={form.name} onChange={change('name')} placeholder="Juan Pérez" className="input-dark" />
          {errors.name && <span className="text-xs text-brand-pink mt-1 block">{errors.name}</span>}
        </label>
        <label className="block">
          <span className="text-sm text-white/70 mb-1.5 block">Email *</span>
          <input type="email" value={form.email} onChange={change('email')} placeholder="tu@email.com" className="input-dark" />
          {errors.email && <span className="text-xs text-brand-pink mt-1 block">{errors.email}</span>}
        </label>
        <label className="block">
          <span className="text-sm text-white/70 mb-1.5 block">Teléfono *</span>
          <input type="text" value={form.phone} onChange={change('phone')} placeholder="3410000000" className="input-dark" />
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
        <div className="rounded-xl p-3 text-sm border border-white/10 bg-white/5 text-white/70">
          📍 {shippingCfg.pickupLabel}. Te contactamos al teléfono que dejes acá.
        </div>
      )}

      {needsAddress && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm text-white/70 mb-1.5 block">Dirección *</span>
              <input type="text" value={form.address} onChange={change('address')} placeholder="Calle 1234, depto 2B" className="input-dark" />
              {errors.address && <span className="text-xs text-brand-pink mt-1 block">{errors.address}</span>}
            </label>
            <label className="block">
              <span className="text-sm text-white/70 mb-1.5 block">Ciudad *</span>
              <input type="text" value={form.city} onChange={change('city')} className="input-dark" />
              {errors.city && <span className="text-xs text-brand-pink mt-1 block">{errors.city}</span>}
            </label>
            <label className="block">
              <span className="text-sm text-white/70 mb-1.5 block">Provincia *</span>
              <select value={form.province} onChange={change('province')} className="input-dark">
                {provinces.map((p) => (
                  <option key={p} value={p} className="bg-bg-deep">{p}</option>
                ))}
              </select>
              {errors.province && <span className="text-xs text-brand-pink mt-1 block">{errors.province}</span>}
            </label>
            <label className="block">
              <span className="text-sm text-white/70 mb-1.5 block">Código postal *</span>
              <input type="text" value={form.zipCode} onChange={change('zipCode')} placeholder="2000" className="input-dark" />
              {errors.zipCode && <span className="text-xs text-brand-pink mt-1 block">{errors.zipCode}</span>}
            </label>
          </div>
          <p className="text-xs text-white/50">
            📦 Calculamos el envío automáticamente según tu ciudad y provincia — lo ves en el resumen del pedido.
          </p>
          <p className="text-xs text-white/50">
            ⏱️ Plazos: <strong className="text-white/70">{zone === 'interior' ? shippingCfg.productionDaysInterior : shippingCfg.productionDaysRosario}</strong>
          </p>
        </>
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

      <button type="submit" disabled={submitting} className="btn-primary w-full !py-4 text-base">
        {submitting ? 'Generando pago…' : '🔒 Pagar seguro con Mercado Pago'}
      </button>
      <p className="text-xs text-white/50 text-center">
        Vas a ser redirigido a Mercado Pago para completar tu compra de forma segura.
      </p>
    </form>
  );
}
