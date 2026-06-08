import { useState, useEffect } from 'react';
import { shippingMethods, shipping as shippingCfg } from '../config/site.js';

const initial = {
  name: '',
  email: '',
  phone: '',
  dni: '',
  address: '',
  city: 'Rosario',
  province: 'Santa Fe',
  zipCode: '',
  shippingMethod: 'envio-rosario',
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

export default function CheckoutForm({ onSubmit, onMethodChange, submitting, errorMsg }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  // Notificar cambios de método al parent (para recalcular total)
  useEffect(() => {
    onMethodChange?.(form.shippingMethod);
  }, [form.shippingMethod, onMethodChange]);

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      const methodLabel = shippingMethods.find((s) => s.value === form.shippingMethod)?.label;
      onSubmit({
        payer: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          dni: form.dni.trim() || undefined,
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

  const Field = ({ label, name, type = 'text', placeholder, ...rest }) => (
    <label className="block">
      <span className="text-sm text-white/70 mb-1.5 block">{label}</span>
      <input
        type={type}
        value={form[name]}
        onChange={change(name)}
        placeholder={placeholder}
        className="input-dark"
        {...rest}
      />
      {errors[name] && <span className="text-xs text-brand-pink mt-1 block">{errors[name]}</span>}
    </label>
  );

  const needsAddress = form.shippingMethod !== 'retiro';

  return (
    <form onSubmit={submit} className="card-glass p-6 md:p-8 space-y-5">
      <h3 className="font-display font-extrabold text-xl">Datos del comprador</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo *" name="name" placeholder="Juan Pérez" />
        <Field label="Email *" name="email" type="email" placeholder="tu@email.com" />
        <Field label="Teléfono *" name="phone" placeholder="3410000000" />
        <Field label="DNI (opcional)" name="dni" placeholder="00.000.000" />
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
            <Field label="Dirección *" name="address" placeholder="Calle 1234, depto 2B" />
            <Field label="Ciudad *" name="city" />
            <Field label="Provincia *" name="province" />
            <Field label="Código postal *" name="zipCode" placeholder="2000" />
          </div>
          <p className="text-xs text-white/50">
            ⏱️ Plazos: <strong className="text-white/70">{form.shippingMethod === 'envio-rosario' ? shippingCfg.productionDaysRosario : shippingCfg.productionDaysInterior}</strong>
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
