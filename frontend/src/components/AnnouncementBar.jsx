import { anunciosVigentes } from '../config/site.js';

/**
 * Tira de arriba: pasa en continuo las respuestas a las dudas de compra (envío
 * gratis, promo vigente, garantía). Spec 020.
 *
 * Fue marquesina, después un mensaje por vez (spec 014) y volvió a ser
 * marquesina: la historia y el porqué de cada vuelta están en
 * `anunciosVigentes()` (config/site.js). El texto tampoco se escribe acá — sale
 * de ahí, que a su vez lee los umbrales y los días del config. Acá solo vive la
 * mecánica.
 *
 * MECÁNICA (la misma de `.marcas-ticker`, spec 007): la pista lleva DOS grupos
 * idénticos y la animación la corre `-50 %`, que es exactamente el ancho de un
 * grupo. Cuando el primero termina de salir, el segundo está donde arrancó el
 * primero, y el salto de vuelta a 0 no se ve. Cada grupo mide como mínimo el
 * ancho de la pantalla (ver el CSS): si no, en un monitor ancho quedaba un hueco
 * vacío entre la última frase y la primera.
 *
 * Todo es CSS: ni timers ni requestAnimationFrame. Anda igual en el navegador
 * embebido de Instagram y no le cuesta nada al hilo principal.
 *
 * ACCESIBILIDAD
 * - El segundo grupo es relleno visual: va `aria-hidden` para que el lector de
 *   pantalla lea cada mensaje UNA vez.
 * - Sin `aria-live`. La barra anterior lo tenía porque rotaba; esta no cambia de
 *   contenido, se mueve, y con `aria-live` se leería en loop.
 * - Se frena con el mouse encima. En el celular no hay cómo frenarla (WCAG 2.2.2
 *   lo pide para lo que se mueve más de 5 s): es el mismo compromiso que ya tomó
 *   el ticker de marcas. Con `prefers-reduced-motion` se entrega quieta, con
 *   todos los mensajes a la vista y sin la copia.
 * - Los mensajes son texto, no links: un blanco táctil que se mueve no se puede
 *   acertar en el celular. La política de cambios ya está enlazada desde la
 *   ficha de producto, el footer y el FAQ.
 */
export default function AnnouncementBar() {
  // Se recalcula en cada render a propósito: el header re-renderiza al
  // scrollear, y así un 2x1 que se apaga deja de anunciarse sin recargar.
  const anuncios = anunciosVigentes();
  if (!anuncios.length) return null;

  const grupo = (copia) => (
    <ul className="anuncio-ticker__grupo" aria-hidden={copia ? 'true' : undefined}>
      {anuncios.map((texto) => (
        <li key={texto} className="anuncio-ticker__item">
          {texto}
        </li>
      ))}
    </ul>
  );

  return (
    <section className="anuncio-ticker" aria-label="Envíos, promos y garantía">
      <div className="anuncio-ticker__pista">
        {grupo(false)}
        {grupo(true)}
      </div>
    </section>
  );
}
