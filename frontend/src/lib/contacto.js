/**
 * Validación del formulario de contacto (spec 012).
 *
 * POR QUÉ VIVE ACÁ Y NO ADENTRO DEL COMPONENTE: `CheckoutForm.validate()` hace
 * lo mismo pero está declarada dentro del .jsx, y por eso no tiene un solo test
 * — no se puede importar sin React, y la suite no tiene con qué renderizar
 * componentes. Un módulo puro entra a `npm test`, que es la barrera del deploy.
 *
 * Las mismas reglas se repiten en netlify/functions/contacto.js: el navegador
 * valida para no hacer perder el viaje, el servidor valida porque no le cree a
 * nadie. Si cambiás una regla acá, cambiala allá — no hay espejo automático.
 */

/** Topes por campo. Espejados en netlify/functions/contacto.js. */
export const TOPES = {
  nombre: 120,
  email: 254,
  telefono: 40,
  ciudad: 80,
  provincia: 60,
  consulta: 2000
};

/**
 * Mínimo de caracteres de la consulta. Diez es suficiente para que "hola" y
 * "info" no pasen, y bajo como para no rebotar a alguien apurado con una
 * pregunta corta y legítima ("tienen calcos de Boca?").
 */
export const CONSULTA_MIN = 10;

/** Dígitos mínimos de un teléfono argentino sin código de país (341 5123456). */
const TELEFONO_MIN_DIGITOS = 8;

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * @param {{nombre?:string,email?:string,telefono?:string,ciudad?:string,provincia?:string,consulta?:string}} form
 * @returns {Record<string,string>} vacío si está todo bien; si no, campo → mensaje
 */
export function validarConsulta(form = {}) {
  const errores = {};
  const val = (k) => String(form[k] ?? '').trim();

  const nombre = val('nombre');
  if (!nombre) errores.nombre = 'Poné tu nombre y apellido';
  else if (nombre.length > TOPES.nombre) errores.nombre = 'Es demasiado largo';

  const email = val('email');
  if (!email) errores.email = 'Ingresá tu email';
  else if (!EMAIL_RE.test(email) || email.length > TOPES.email) errores.email = 'Email inválido';

  // El teléfono se valida por CANTIDAD DE DÍGITOS, no por formato: la gente lo
  // escribe como quiere (+54 9 341..., 341-680-6675, con o sin 15) y rebotar
  // por un guion es fricción pura en el paso donde nos están por escribir.
  const telefono = val('telefono');
  if (!telefono) errores.telefono = 'Ingresá tu teléfono';
  else if (telefono.replace(/\D/g, '').length < TELEFONO_MIN_DIGITOS) errores.telefono = 'Teléfono incompleto';
  else if (telefono.length > TOPES.telefono) errores.telefono = 'Teléfono inválido';

  const ciudad = val('ciudad');
  if (!ciudad) errores.ciudad = 'Ingresá tu ciudad';
  else if (ciudad.length > TOPES.ciudad) errores.ciudad = 'Es demasiado largo';

  // Ciudad y provincia no son un capricho: con eso se puede cotizar el envío en
  // la PRIMERA respuesta en vez de en la tercera (requirements.md US-4).
  const provincia = val('provincia');
  if (!provincia) errores.provincia = 'Elegí tu provincia';
  else if (provincia.length > TOPES.provincia) errores.provincia = 'Provincia inválida';

  const consulta = val('consulta');
  if (!consulta) errores.consulta = 'Contanos qué necesitás';
  else if (consulta.length < CONSULTA_MIN) errores.consulta = `Contanos un poco más (mínimo ${CONSULTA_MIN} caracteres)`;
  else if (consulta.length > TOPES.consulta) errores.consulta = `Máximo ${TOPES.consulta} caracteres`;

  return errores;
}

/** true si el formulario está listo para enviarse. */
export function esValida(form) {
  return Object.keys(validarConsulta(form)).length === 0;
}
