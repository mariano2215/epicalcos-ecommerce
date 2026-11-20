/**
 * ─── POPUP DE BIENVENIDA (spec 026) ───────────────────────────────────────────
 *
 * Todo lo que se puede tocar del popup sin abrir un componente: cuándo aparece,
 * cuánto espera antes de volver, qué ofrece y a dónde lleva.
 *
 * ⚠️ ACÁ NO HAY PRECIOS. El porcentaje y el alcance del cupón los decide
 * `COUPONS` en config/pricing.js (espejado en el servidor). Este archivo solo
 * dice QUÉ código entrega el popup; el texto del "10%" se arma leyendo el
 * descuento de ese cupón, así los dos nunca pueden decir cosas distintas.
 */

export const POPUP_CONFIG = {
  /**
   * Interruptor. Con `false` no hay apertura automática ni acceso manual.
   * El cupón que la gente ya activó sigue andando en el carrito y el checkout:
   * apagar el popup no le saca a nadie un descuento que ya tiene.
   */
  activo: true,
  /** Umbrales del control (`b_12s`). Las variantes del A/B están abajo. */
  escritorio: { demoraMs: 12_000, scrollPct: 30 },
  movil: { demoraMs: 15_000, scrollPct: 50 },
  /** Señales de interés que también abren el popup (se juntan en todo el sitio). */
  intencion: { productosVistos: 2, busqueda: true, categoria: true },
  /** Intención de salida: solo con mouse, y no antes de este tiempo en el sitio. */
  salida: { activa: true, minMsEnSitio: 5_000 },
  /** Nada abre antes de este tiempo en el Home: nunca "apenas carga la página". */
  minMsEnPagina: 5_000,
  /** Después de un bloqueo (escribiendo, carrito abierto, recién agregó algo). */
  graciaMs: 3_000,
  sondeoMs: 1_000,
  /** Corte del envío del mail: pasado esto, se muestra el error y se puede reintentar. */
  timeoutEnvioMs: 10_000,
  cooldownCerradoDias: 7,
  cooldownConvertidoDias: 30
};

/**
 * Variantes del A/B de disparo (EXPERIMENTS.popup_disparo en lib/experiments.js).
 * La primera es el control y es lo que ve todo el mundo mientras el experimento
 * esté apagado. `demoraMs: null` = sin disparo por tiempo (solo scroll,
 * intención y salida).
 *
 * Solo cambian CUÁNDO aparece el popup, nunca la oferta: los experimentos de
 * este repo son de presentación (ver el aviso de lib/experiments.js).
 */
export const POPUP_VARIANTES = {
  b_12s: { escritorio: POPUP_CONFIG.escritorio, movil: POPUP_CONFIG.movil },
  a_8s: { escritorio: { demoraMs: 8_000, scrollPct: 30 }, movil: { demoraMs: 8_000, scrollPct: 50 } },
  c_scroll: { escritorio: { demoraMs: null, scrollPct: 30 }, movil: { demoraMs: null, scrollPct: 50 } }
};

/**
 * Qué ofrece el popup.
 *
 * `tipo` describe el TEXTO, no el precio: hoy el motor solo sabe de cupones en
 * %. Un monto fijo o un mínimo de compra necesitan su spec, con cambio espejado
 * en los dos pricing.js; el día que existan, el popup solo tiene que leer otro
 * tipo acá.
 *
 * `conVentana: false` = el 10% no vence (decisión de Mariano, 25/9/2026, spec
 * 026 P-2). Hasta ese día el popup lo entregaba con 10 minutos (spec 017).
 * Con `true` vuelve ese comportamiento: el contador, la validación del servidor
 * y los eventos de vencimiento siguen existiendo, solo que el popup deja de
 * arrancarlos. Es un sí/no y no una duración a propósito: la duración es
 * `CUPON_VENTANA_MS` de config/pricing.js, espejada con el servidor, y un
 * número distinto acá haría que la pantalla y el cobro no coincidan.
 */
export const POPUP_OFERTA = {
  tipo: 'porcentaje',
  codigo: 'EPICA10',
  conVentana: false
};

/**
 * ─── OFERTA DE EPICYBER (spec 037) ────────────────────────────────────────────
 *
 * Mientras esté vigente reemplaza al 10 %: EPICA10 no se aplica a los packs Cyber,
 * así que anunciarlo durante la campaña sería prometer algo que el producto
 * principal no recibe. El cupón de quien ya lo tiene sigue andando.
 *
 * Es otra oferta sobre este mismo popup, como dejó anotado la spec 025. Vence sola
 * con la campaña (`CYBER_END_MS`) y vuelve el 10 %.
 *
 * `disparo` abre a los 3 s y no a los 12 o 15: el pedido es que salga "cuando la
 * gente ingrese". No baja de ahí a propósito: antes de eso no compite con la carga
 * de la página. Lo demás (no abrir mientras escribe o agrega algo) es lo de siempre.
 *
 * `cooldownCerradoDias`: la campaña dura días, no semanas. Con los 7 del popup
 * normal, el que lo cierra hoy no lo vuelve a ver hasta que terminó.
 *
 * ⚠️ `activo`, `qty`, `tamano` y `minimoCompra` están espejados en `REGALO_CYBER` de
 * netlify/functions/lib/regaloCyber.js: lo que el popup promete lo cumple el servidor.
 * El test `regaloCyber.test.js` frena el deploy si se separan.
 */
export const POPUP_CYBER = {
  activo: true,
  variante: 'cyber_regalo',
  regalo: { qty: 10, tamano: '4 cm', minimoCompra: 8000 },
  umbrales: {
    escritorio: { demoraMs: 3_000, scrollPct: 30 },
    movil: { demoraMs: 3_000, scrollPct: 50 }
  },
  disparo: { ...POPUP_CONFIG, minMsEnPagina: 3_000 },
  cooldownCerradoDias: 2,
  /** Además del Home: `/epicyber` es a donde van los anuncios de la campaña. */
  rutas: ['/', '/epicyber']
};

/**
 * "¿Qué querés personalizar?" del paso 2.
 *
 * Mate y celular no tienen landing propia (spec 026 P-4): van al catálogo de
 * categorías, sin preelegir tamaño, para que la persona elija tamaño y diseño.
 * Si `popup_interest_selected` muestra volumen en alguno, ese es el dato para
 * hacerle una landing.
 */
export const INTERESES = [
  { id: 'mate', emoji: '🧉', label: 'Mate', to: '/categorias' },
  { id: 'termo', emoji: '☕', label: 'Termo', to: '/calcos-termo' },
  { id: 'notebook', emoji: '💻', label: 'Notebook', to: '/calcos-notebook' },
  { id: 'celular', emoji: '📱', label: 'Celular', to: '/categorias' }
];

/**
 * El juego del hero (spec 028, ampliaciones A y C): "Pegá las 4 calcos y ganate
 * 10% OFF". El premio es el MISMO cupón de `POPUP_OFERTA`: acá no hay precios.
 *
 * `piezas`: cuántas calcos hay que pegar para ganar.
 * `jugandoMs`: mientras la persona haya tocado una calco hace menos que esto,
 *   el popup no se abre solo (ni por tiempo, ni por scroll, ni por intención).
 * `demoraPremioMs`: entre la última calco y el popup, para que se vea el termo
 *   terminado antes de taparlo.
 */
export const POPUP_JUEGO = {
  piezas: 4,
  jugandoMs: 20_000,
  demoraPremioMs: 1_200
};

/** El popup (solo o a mano) aparece únicamente acá (spec 026 P-6). */
export const RUTAS_POPUP = ['/'];

/**
 * Donde el acceso "10% OFF activo" NO se muestra.
 *
 * El camino de pago: ahí el checkout ya muestra el cupón aplicado, y cualquier
 * cosa flotando compite con el botón de pagar.
 */
export const RUTAS_FLUJO_COMPRA = [
  '/carrito',
  '/checkout',
  '/pago-exitoso',
  '/pago-transferencia',
  '/pago-pendiente',
  '/pago-error'
];

/**
 * Y las secciones cuyos productos no reciben EPICA10 (packs, precios fijos,
 * personalizados fuera de una promo): recordarle "tenés 10%" a alguien que mira
 * algo que no lo tiene es prometerle un descuento que el checkout no le da.
 */
export const RUTAS_SIN_DESCUENTO = [
  '/personalizados',
  '/mayorista',
  '/negocio',
  '/polaroid',
  '/tatuajes',
  '/archivos-imprimibles',
  '/armar-pack'
];
