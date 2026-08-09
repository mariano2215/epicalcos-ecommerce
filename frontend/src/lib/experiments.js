import { useEffect, useState } from 'react';
import { trackExperimentView } from './analytics.js';

/**
 * A/B testing sin dependencias.
 *
 * POR QUÉ PROPIO Y NO UNA HERRAMIENTA: Google Optimize está discontinuado desde
 * 2023, y VWO/Optimizely inyectan un script bloqueante en el <head> justo para
 * evitar el parpadeo — que es exactamente lo contrario del trabajo de
 * performance de P2 (el Home bajó de 820 KB a 103 KB y Clarity se difirió).
 * Pagar eso para testear el color de un badge no cierra.
 *
 * Acá la asignación es SINCRÓNICA (localStorage + hash), así que el componente
 * ya renderiza con su variante en el primer paint: no hay parpadeo que tapar.
 *
 * ⚠️ REGLA DURA: los experimentos son SOLO DE PRESENTACIÓN.
 * Nunca testear un PRECIO. El servidor revalida cada línea del carrito contra
 * netlify/functions/lib/pricing.js y rechaza el pedido con `price_mismatch` si
 * no coincide: un A/B de precios dejaría a media tienda sin poder comprar.
 * Se puede testear CÓMO se muestra un precio (monto vs porcentaje), nunca cuánto
 * vale.
 */

const STORAGE_KEY = 'epicalcos.exp.v1';

/**
 * Experimentos declarados.
 *
 * `active: false` es el interruptor de emergencia: todo el mundo pasa a
 * `control` al instante, sin tocar el componente ni redeployar la lógica.
 * `variants[0]` es SIEMPRE el control.
 */
export const EXPERIMENTS = {
  /**
   * CRO-007 — ¿el ahorro pesa más en pesos o en porcentaje?
   * Hipótesis: en tickets altos, "Ahorrás $3.200" mueve más que "10% off".
   * KPI: pack_builder_start / vistas de /armar-pack. Secundario: purchase.
   */
  ahorro_pack: {
    active: true,
    variants: ['porcentaje', 'monto'],
    descripcion: 'PackCard: badge de ahorro en % (control) vs en $'
  },

  /**
   * ¿Resolver la duda del tamaño sin que la pidan sube el add-to-cart?
   * Hipótesis: "no sé qué tamaño elegir" frena más de lo que molesta un bloque
   * abierto de más. KPI: add_to_cart / view_item.
   */
  guia_tamano: {
    active: true,
    variants: ['colapsada', 'abierta'],
    descripcion: 'SizeGuide en la ficha: colapsada (control) vs abierta de entrada'
  }
};

/** Hash entero y estable de un string (FNV-1a). Determinista entre sesiones. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function leerEstado() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Merge sobre lo que YA está guardado, releyendo primero.
 *
 * No es un detalle: `getVariant` leía el estado, después `visitorId()` escribía
 * el `_vid`, y al guardar la variante se pisaba con el snapshot viejo — el
 * `_vid` se perdía en cada asignación. Con el id de visitante volátil, dos
 * experimentos asignados en momentos distintos usan semillas distintas y se
 * pierde la coherencia del bucketing.
 */
function guardarEstado(cambios) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...leerEstado(), ...cambios }));
  } catch {
    /* modo incógnito o storage lleno: se cae a control, no rompe nada */
  }
}

/**
 * Id anónimo y estable del visitante. NO es PII: es un random propio que solo
 * sirve para que la misma persona vea siempre la misma variante. Sin esto, cada
 * recarga podría cambiarle la variante y el test no mediría nada.
 */
function visitorId() {
  const guardado = leerEstado()._vid;
  if (guardado) return guardado;
  const vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
  guardarEstado({ _vid: vid });
  return vid;
}

/**
 * Variante asignada para este visitante. Sincrónica y estable.
 *
 * Override para QA: `?exp_ahorro_pack=monto` en la URL fuerza esa variante y la
 * deja fija (así se puede revisar una variante sin tocar código ni esperar a
 * caer en el bucket).
 */
export function getVariant(id) {
  const exp = EXPERIMENTS[id];
  if (!exp) return null;
  if (!exp.active) return exp.variants[0]; // kill switch → todos a control

  if (typeof window === 'undefined') return exp.variants[0];

  const estado = leerEstado();

  // Override manual por query param (QA / revisión).
  try {
    const forzada = new URLSearchParams(window.location.search).get(`exp_${id}`);
    if (forzada && exp.variants.includes(forzada)) {
      if (estado[id] !== forzada) guardarEstado({ [id]: forzada });
      return forzada;
    }
  } catch {
    /* ignore */
  }

  // Ya asignada: se respeta aunque cambien los pesos.
  if (estado[id] && exp.variants.includes(estado[id])) return estado[id];

  // Asignación nueva: hash del visitante + id del experimento, así dos
  // experimentos distintos no reparten a la misma gente del mismo lado.
  const variante = exp.variants[hash(`${visitorId()}:${id}`) % exp.variants.length];
  guardarEstado({ [id]: variante });
  return variante;
}

/**
 * Experimentos ya reportados en esta carga de página. La exposición es "esta
 * persona vio el experimento", NO "montó un componente": `/armar-pack` renderiza
 * cuatro `PackCard`, y sin esta guarda el denominador del test quedaría
 * multiplicado por cuatro. También cubre el doble efecto de StrictMode.
 */
const reportados = new Set();

/**
 * Hook de exposición. Devuelve la variante y manda `experiment_view` UNA vez
 * por experimento y por carga de página.
 *
 * El evento se dispara en la EXPOSICIÓN, no al arrancar la app: contar a todos
 * los visitantes en vez de a los que realmente vieron el componente inflaría el
 * denominador y diluiría cualquier diferencia.
 */
export function useExperiment(id) {
  const [variant] = useState(() => getVariant(id));

  useEffect(() => {
    if (!variant || reportados.has(id)) return;
    reportados.add(id);
    trackExperimentView({ id, variant });
  }, [id, variant]);

  return variant;
}

/** ¿Está el visitante en esta variante? Azúcar para leer mejor en el JSX. */
export const esVariante = (id, variante) => getVariant(id) === variante;
