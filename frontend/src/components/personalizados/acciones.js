import { trackPersonalizedUploadStart } from '../../lib/analytics.js';

/**
 * Acciones que se disparan desde cualquier punto de /personalizados: el CTA del
 * hero, la barra fija, el bloque editorial y el CTA final abren el MISMO
 * selector de archivos, que vive en la zona de subida del hero.
 *
 * Van por id del DOM y no por contexto de React: son cuatro disparadores
 * repartidos por toda la página y un solo destino, y el `click()` del input
 * tiene que ocurrir DENTRO del gesto del usuario (si pasa por un efecto, iOS
 * no abre el selector).
 */
export const IDS = {
  configurador: 'configurador',
  input: 'input-diseno',
  tamano: 'selector-tamano',
  lista: 'lista-disenos',
  ctaHero: 'cta-hero',
  ctaFinal: 'cta-final'
};

const suave = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  } catch {
    return 'auto';
  }
};

/**
 * Abre el selector de archivos. `origen` separa en GA4 qué CTA empuja las
 * subidas: hero / sticky / editorial / cta_final.
 */
export function abrirSelector(origen = 'hero') {
  trackPersonalizedUploadStart(origen);
  // Desde abajo de la página, primero se vuelve al configurador: el diseño que
  // elija aparece ahí, y si no lo ve, no sabe que pasó algo.
  if (origen !== 'hero') {
    document.getElementById(IDS.configurador)?.scrollIntoView({ behavior: suave(), block: 'start' });
  }
  document.getElementById(IDS.input)?.click();
}

/** Lleva a un bloque del configurador y, si se pide, enfoca un control adentro. */
export function irA(id, selectorFoco) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: suave(), block: 'center' });
  if (selectorFoco) el.querySelector(selectorFoco)?.focus({ preventScroll: true });
}
