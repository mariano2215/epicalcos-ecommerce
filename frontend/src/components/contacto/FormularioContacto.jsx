import { useRef, useState } from 'react';
import { provinces, contact } from '../../config/site.js';
import { validarConsulta, TOPES } from '../../lib/contacto.js';
import { trackLeadCapture, trackContactoFormError, trackWhatsappClick } from '../../lib/analytics.js';
import { whatsappHref } from './CardWhatsapp.jsx';

const INICIAL = {
  nombre: '',
  email: '',
  telefono: '',
  ciudad: '',
  provincia: 'Santa Fe', // el mismo default que CheckoutForm: la mayoría compra en Rosario
  consulta: '',
  website: '' // honeypot
};

/**
 * A partir de este largo aparece el contador. Antes es ruido: nadie necesita
 * que le cuenten los caracteres de "hola, tienen calcos de Boca?".
 */
const CONTADOR_DESDE = 1500;

/**
 * Formulario de consultas (spec 012). Reemplaza la card de "Email" que abría un
 * `mailto:` — que en el navegador embebido de Instagram, de donde viene la
 * mayoría del tráfico, muchas veces no abre nada y la consulta se perdía sin
 * que el cliente se enterara.
 *
 * Los `type` + `autoComplete` + `inputMode` de cada campo NO son decoración:
 * son la misma decisión ya tomada en CheckoutForm.jsx, donde está escrito por
 * qué (sin eso, en mobile hay que tipear todo a mano con el teclado equivocado).
 */
export default function FormularioContacto() {
  const [form, setForm] = useState(INICIAL);
  const [errores, setErrores] = useState({});
  const [estado, setEstado] = useState('idle'); // idle | enviando | ok | error

  /**
   * ⚠️ EL CANDADO ES UN ref, NO EL ESTADO. `setEstado('enviando')` no se aplica
   * hasta el próximo render, así que dos clicks en el MISMO tick leen los dos
   * `estado === 'idle'` y mandan la consulta dos veces — y el `disabled` del
   * botón tampoco existe todavía, por lo mismo. Con un click humano casi
   * siempre da tiempo a renderizar, pero "casi siempre" acá significa que un
   * doble tap en un celular lento le duplica la consulta a Mariano.
   * Probado: con el guard por estado, tres clicks seguidos = tres requests.
   */
  const enviando = useRef(false);

  const cambiar = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    // El error se limpia al tocar el campo: dejarlo puesto mientras corrige es
    // decirle que sigue mal cuando ya lo está arreglando.
    setErrores((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando.current) return; // doble click: una sola request

    const errs = validarConsulta(form);
    setErrores(errs);
    if (Object.keys(errs).length) {
      trackContactoFormError('validacion');
      // Foco en el primer campo que falla: en mobile el error puede quedar
      // arriba del pliegue y el botón "no hace nada" desde donde está mirando.
      document.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }

    enviando.current = true;
    setEstado('enviando');
    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 400 && Array.isArray(data.campos)) {
          // El servidor rechazó algo que el navegador dejó pasar: se muestra
          // como error de campo, no como "falló el envío".
          setErrores(Object.fromEntries(data.campos.map((c) => [c, 'Revisá este dato'])));
          setEstado('idle');
          trackContactoFormError('validacion');
          return;
        }
        throw new Error(`http_${res.status}`);
      }
      setEstado('ok');
      trackLeadCapture('contacto_form');
    } catch (err) {
      setEstado('error');
      // 'red' si el fetch ni salió; 'servidor' si contestó mal.
      trackContactoFormError(err?.message?.startsWith('http_') ? 'servidor' : 'red');
    } finally {
      // Se suelta SIEMPRE: si quedara trabado, el que tuvo un error de red no
      // podría reintentar nunca y la consulta se perdería igual.
      enviando.current = false;
    }
  };

  if (estado === 'ok') {
    return (
      <div className="card-glass p-8 text-center" role="status" aria-live="polite">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="font-display font-extrabold text-2xl">Consulta enviada</h2>
        <p className="text-white/75 mt-3">
          Te respondemos <strong className="text-white">en el día</strong> al mail que dejaste.
        </p>
        <p className="text-white/45 text-sm mt-2">
          Si lo necesitás para hoy, escribinos por WhatsApp y lo vemos al toque.
        </p>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackWhatsappClick('contacto_form_ok')}
          className="btn-secondary mt-6 min-h-[44px]"
        >
          Abrir WhatsApp
        </a>
      </div>
    );
  }

  const estaEnviando = estado === 'enviando';

  return (
    <form onSubmit={enviar} noValidate className="card-glass p-6 md:p-8 space-y-5">
      <div>
        <h2 className="font-display font-extrabold text-xl">Dejanos tu consulta</h2>
        <p className="text-white/55 text-sm mt-1.5">
          Te respondemos en el día. Con tu ciudad y provincia ya te cotizamos el envío en la
          primera respuesta.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          label="Nombre y apellido"
          name="nombre"
          value={form.nombre}
          onChange={cambiar('nombre')}
          error={errores.nombre}
          placeholder="Juan Pérez"
          autoComplete="name"
          maxLength={TOPES.nombre}
        />
        <Campo
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={cambiar('email')}
          error={errores.email}
          placeholder="tu@email.com"
          autoComplete="email"
          inputMode="email"
          maxLength={TOPES.email}
        />
        <Campo
          label="Teléfono"
          name="telefono"
          type="tel"
          value={form.telefono}
          onChange={cambiar('telefono')}
          error={errores.telefono}
          placeholder="3410000000"
          autoComplete="tel"
          inputMode="tel"
          maxLength={TOPES.telefono}
        />
        <Campo
          label="Ciudad"
          name="ciudad"
          value={form.ciudad}
          onChange={cambiar('ciudad')}
          error={errores.ciudad}
          placeholder="Rosario"
          autoComplete="address-level2"
          maxLength={TOPES.ciudad}
        />
      </div>

      <label className="block">
        <span className="text-sm text-white/70 mb-1.5 block">Provincia *</span>
        <select
          name="provincia"
          value={form.provincia}
          onChange={cambiar('provincia')}
          autoComplete="address-level1"
          className="input-dark min-h-[44px]"
          aria-invalid={errores.provincia ? 'true' : undefined}
        >
          {provinces.map((p) => (
            <option key={p} value={p} className="bg-bg-deep">{p}</option>
          ))}
        </select>
        {errores.provincia && <span className="text-xs text-brand-pink mt-1 block">{errores.provincia}</span>}
      </label>

      <label className="block">
        <span className="text-sm text-white/70 mb-1.5 block">Tu consulta *</span>
        <textarea
          name="consulta"
          value={form.consulta}
          onChange={cambiar('consulta')}
          rows={5}
          maxLength={TOPES.consulta}
          placeholder="Ej: quiero 200 calcos con el logo de mi bar, en 6 cm. ¿Cuánto sale y cuánto tardan?"
          className="input-dark resize-y"
          aria-invalid={errores.consulta ? 'true' : undefined}
          aria-describedby={errores.consulta ? 'error-consulta' : undefined}
        />
        <div className="flex justify-between gap-3 mt-1">
          {errores.consulta
            ? <span id="error-consulta" className="text-xs text-brand-pink">{errores.consulta}</span>
            : <span />}
          {form.consulta.length >= CONTADOR_DESDE && (
            <span className="text-xs text-white/40 tabular-nums shrink-0">
              {form.consulta.length}/{TOPES.consulta}
            </span>
          )}
        </div>
      </label>

      {/* Honeypot. `hidden` a secas no alcanza: hay bots que lo detectan. Lo que
          lo hace funcionar es que un humano no puede llegar acá — ni con el dedo
          ni con Tab — y un bot que completa "todos los campos" sí. */}
      <div aria-hidden="true" className="absolute w-px h-px -left-[9999px] overflow-hidden">
        <label>
          No completar este campo
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={cambiar('website')}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      {estado === 'error' && (
        <div role="alert" className="rounded-xl p-4 text-sm border border-brand-pink/40 bg-brand-pink/10">
          <p className="text-white/85">
            <strong className="text-white">No pudimos enviar tu consulta.</strong> Probá de nuevo
            en un minuto — o escribinos por WhatsApp, que es instantáneo.
          </p>
          {/* Con su propio contexto: el que llega acá es EXACTAMENTE la persona
              que hay que poder contar — se le rompió el formulario y hay que
              saber si logró escaparse a WhatsApp o si la consulta se perdió. */}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsappClick('contacto_form_error')}
            className="btn-secondary mt-3 min-h-[44px] w-full"
          >
            Escribinos por WhatsApp
          </a>
        </div>
      )}

      <button type="submit" disabled={estaEnviando} className="btn-primary w-full min-h-[44px]">
        {estaEnviando ? 'Enviando…' : 'Enviar consulta'}
      </button>

      <p className="text-xs text-white/45 text-center">
        Te llega a <strong className="text-white/70">{contact.email}</strong>. Usamos tus datos
        solo para responderte.
      </p>
    </form>
  );
}

/** Un campo de texto con su label, su error y los atributos de teclado de mobile. */
function Campo({ label, name, error, type = 'text', ...props }) {
  const idError = `error-${name}`;
  return (
    <label className="block">
      <span className="text-sm text-white/70 mb-1.5 block">{label} *</span>
      <input
        type={type}
        name={name}
        className="input-dark min-h-[44px]"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? idError : undefined}
        {...props}
      />
      {error && <span id={idError} className="text-xs text-brand-pink mt-1 block">{error}</span>}
    </label>
  );
}
