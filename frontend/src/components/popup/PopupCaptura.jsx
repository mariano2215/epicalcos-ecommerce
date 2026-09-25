/**
 * Paso 1 del popup de bienvenida (spec 026): solo el mail.
 *
 * Jerarquía pedida: descuento → beneficio → campo → botón → aclaración. Nada
 * de nombre, teléfono ni fecha de nacimiento: cada campo extra es gente que no
 * termina el formulario.
 *
 * ⚠️ El campo va con `text-base` (16 px). `.input-dark` tiene 15,2 px, y en
 * iPhone cualquier campo de menos de 16 px hace zoom al tocarlo: la persona
 * queda con el popup ampliado y tiene que pellizcar para ver el botón. El
 * resto de los campos del sitio siguen así (hallazgo aparte de la spec 026).
 */

const MENSAJES = {
  email: 'Ingresá un email válido.',
  servidor: 'No pudimos activar el descuento. Intentá nuevamente.'
};

export default function PopupCaptura({ pct, email, error, enviando, onEmail, onSubmit, tituloRef }) {
  return (
    <>
      <h2
        id="popup-titulo"
        ref={tituloRef}
        tabIndex={-1}
        className="font-display font-extrabold leading-tight outline-none px-1 pt-5 sm:px-6 sm:pt-0"
      >
        {/* En el celular el título baja (pt-5) para pasar por debajo de la ✕ y
            usa todo el ancho: con los márgenes laterales, "Tenés 10% OFF" se
            partía en dos renglones a 375 px y el descuento dejaba de leerse de
            un vistazo. */}
        <span className="block text-3xl sm:text-5xl font-black">Tenés {pct}% OFF</span>
        <span className="block text-lg sm:text-2xl mt-1">en tu primer pedido 🎁</span>
      </h2>
      <p id="popup-bajada" className="text-white/70 text-sm mt-3">
        Elegí tus calcos favoritas y usá tu descuento en tu primera compra.
      </p>

      {/* noValidate: el globito nativo del navegador cambia de idioma y de
          forma según el navegador (en el de Instagram ni se ve). El mensaje lo
          damos nosotros. */}
      <form noValidate onSubmit={onSubmit} className="mt-5 flex flex-col gap-2.5">
        <label htmlFor="popup-email" className="sr-only">
          Tu email
        </label>
        <input
          id="popup-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          placeholder="Tu email"
          aria-invalid={error === 'email' || undefined}
          aria-describedby={error ? 'popup-error' : undefined}
          className="input-dark text-center text-base min-h-[48px]"
        />
        <button
          type="submit"
          disabled={enviando}
          aria-busy={enviando || undefined}
          className="btn-primary w-full min-h-[48px] text-base"
        >
          {enviando ? 'Activando…' : `Activar mi ${pct}% OFF`}
        </button>
      </form>

      {error && (
        <p id="popup-error" role="alert" className="text-brand-pink text-sm mt-2">
          {MENSAJES[error]}
        </p>
      )}

      <p className="text-white/45 text-xs mt-3">
        Te mandamos novedades y promos. Podés darte de baja cuando quieras.
      </p>
    </>
  );
}
