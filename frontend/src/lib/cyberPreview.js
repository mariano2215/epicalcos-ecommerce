import { setCyberPreview } from '../config/pricing.js';

const CLAVE = 'epicalcos.cyberPreview';

/**
 * Vista previa de EPICYBER (spec 036): `?epicyber=preview` la prende para esta
 * pestaña y `?epicyber=off` la apaga.
 *
 * Corre al importarse, y main.jsx lo importa PRIMERO: `selectorCompra.js` y
 * `categories.js` arman sus textos al cargar el módulo, y un `useEffect` llegaría
 * tarde para ellos.
 *
 * Va en sessionStorage para sobrevivir a la navegación interna del SPA. Sin
 * storage (el navegador de Instagram) dura hasta recargar, que para revisar
 * alcanza. Por qué es segura en producción: ver `setCyberPreview`.
 */
export function iniciarCyberPreview(search = window.location.search) {
  const pedido = new URLSearchParams(search).get('epicyber');
  try {
    if (pedido === 'preview') sessionStorage.setItem(CLAVE, '1');
    if (pedido === 'off') sessionStorage.removeItem(CLAVE);
    setCyberPreview(pedido === 'preview' || (pedido !== 'off' && sessionStorage.getItem(CLAVE) === '1'));
  } catch {
    setCyberPreview(pedido === 'preview');
  }
}

if (typeof window !== 'undefined') iniciarCyberPreview();
