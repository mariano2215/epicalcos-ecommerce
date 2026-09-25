import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  popupPermitido,
  accesoVisible,
  porcentajeOferta,
  beneficioActivo,
  puedeAbrirSolo,
  disparoCumplido,
  porcentajeScroll,
  destinoInteres,
  tipoVisitante,
  migrarEstadoViejo
} from './popupReglas.js';
import {
  POPUP_CONFIG,
  POPUP_VARIANTES,
  POPUP_OFERTA,
  INTERESES,
  RUTAS_FLUJO_COMPRA,
  RUTAS_SIN_DESCUENTO
} from '../config/popup.js';
import { EXPERIMENTS } from './experiments.js';
import { COUPONS, CUPON_VENTANA_MS } from '../config/pricing.js';
import { LANDING_SLUGS } from '../config/landings.js';
import { COUPONS as BE_COUPONS } from '../../../netlify/functions/lib/pricing.js';
import { WELCOME_COUPON_CODE } from '../../../netlify/functions/capture-lead.js';

/**
 * Las reglas del popup de bienvenida (spec 026): cuándo abre, dónde, cuánto
 * espera antes de volver y a dónde lleva. Ver design §9.
 */

const AHORA = Date.parse('2026-09-25T12:00:00-03:00');
const DIA = 24 * 60 * 60 * 1000;
const CONTROL = POPUP_VARIANTES.b_12s;

const vacio = { primeraVisitaEn: null, vistoEn: null, cerradoEn: null, convertidoEn: null, compradoEn: null };
const puede = (over = {}) =>
  puedeAbrirSolo({
    estado: vacio,
    sesion: { autoAbierto: false },
    cuponActivo: false,
    storageOk: true,
    ahora: AHORA,
    ...over
  });

const disparo = (over = {}) =>
  disparoCumplido({
    umbrales: CONTROL,
    esMovil: false,
    msEnSitio: 6_000,
    msEnPagina: 6_000,
    scrollPct: 0,
    senales: { productos: 0, busqueda: false, categoria: false },
    salida: false,
    ...over
  });

describe('dónde aparece (P-6)', () => {
  it('el popup solo se abre en el Home', () => {
    expect(popupPermitido('/')).toBe(true);
    for (const ruta of ['/categorias', '/categoria/boca', '/producto/boca/3', '/calcos-termo', '/checkout', '/contacto']) {
      expect(popupPermitido(ruta), ruta).toBe(false);
    }
  });

  it('el acceso "oferta" también vive solo en el Home', () => {
    expect(accesoVisible('/', 'oferta')).toBe(true);
    expect(accesoVisible('/categorias', 'oferta')).toBe(false);
  });

  it('el acceso "activo" acompaña la tienda, pero no el pago ni lo que no tiene descuento', () => {
    for (const ruta of ['/', '/categorias', '/categoria/boca', '/producto/boca/3', '/calcos-termo', '/categorias/']) {
      expect(accesoVisible(ruta, 'activo'), ruta).toBe(true);
    }
    for (const ruta of [...RUTAS_FLUJO_COMPRA, ...RUTAS_SIN_DESCUENTO]) {
      expect(accesoVisible(ruta, 'activo'), ruta).toBe(false);
    }
    expect(RUTAS_FLUJO_COMPRA).toHaveLength(6);
    expect(RUTAS_SIN_DESCUENTO).toHaveLength(7);
  });

  it('un tipo desconocido no muestra nada', () => expect(accesoVisible('/', 'otro')).toBe(false));
});

describe('frecuencia', () => {
  it('estado limpio: puede abrir', () => expect(puede()).toBe(true));
  it('sin storage no abre solo (no hay cómo respetar los 7 días)', () => expect(puede({ storageOk: false })).toBe(false));
  it('una sola apertura automática por sesión', () => expect(puede({ sesion: { autoAbierto: true } })).toBe(false));
  it('después de comprar, nunca', () => expect(puede({ estado: { ...vacio, compradoEn: AHORA - 90 * DIA } })).toBe(false));
  it('con el 10% activo, nunca', () => expect(puede({ cuponActivo: true })).toBe(false));
  it('el interruptor lo apaga', () =>
    expect(puede({ config: { ...POPUP_CONFIG, activo: false } })).toBe(false));

  it('cerrado: 7 días', () => {
    expect(puede({ estado: { ...vacio, cerradoEn: AHORA - 6 * DIA } })).toBe(false);
    expect(puede({ estado: { ...vacio, cerradoEn: AHORA - 8 * DIA } })).toBe(true);
  });

  it('visto y abandonado sin cerrar cuenta como cerrado', () => {
    expect(puede({ estado: { ...vacio, vistoEn: AHORA - 6 * DIA } })).toBe(false);
    expect(puede({ estado: { ...vacio, vistoEn: AHORA - 8 * DIA } })).toBe(true);
  });

  it('dejó el mail: 30 días', () => {
    expect(puede({ estado: { ...vacio, vistoEn: AHORA - 29 * DIA, convertidoEn: AHORA - 29 * DIA } })).toBe(false);
    expect(puede({ estado: { ...vacio, vistoEn: AHORA - 31 * DIA, convertidoEn: AHORA - 31 * DIA } })).toBe(true);
  });

  it('convirtió hace 40 días y lo volvió a cerrar hace 2: espera sus 7 días', () => {
    const estado = { ...vacio, convertidoEn: AHORA - 40 * DIA, cerradoEn: AHORA - 2 * DIA };
    expect(puede({ estado })).toBe(false);
  });
});

describe('disparo', () => {
  it('RF-5: nada abre antes de 5 s en el Home, aunque se cumpla todo', () => {
    expect(
      disparo({
        msEnPagina: 4_999,
        msEnSitio: 60_000,
        scrollPct: 90,
        salida: true,
        senales: { productos: 5, busqueda: true, categoria: true }
      })
    ).toBeNull();
  });

  it('compu: 12 s o 30% de scroll', () => {
    expect(disparo({ msEnSitio: 11_999 })).toBeNull();
    expect(disparo({ msEnSitio: 12_000 })).toBe('time');
    expect(disparo({ scrollPct: 29.9 })).toBeNull();
    expect(disparo({ scrollPct: 30 })).toBe('scroll');
  });

  it('celular: 15 s o 50% de scroll', () => {
    expect(disparo({ esMovil: true, msEnSitio: 12_000 })).toBeNull();
    expect(disparo({ esMovil: true, msEnSitio: 15_000 })).toBe('time');
    expect(disparo({ esMovil: true, scrollPct: 40 })).toBeNull();
    expect(disparo({ esMovil: true, scrollPct: 50 })).toBe('scroll');
  });

  it('una página que no scrollea no dispara por scroll', () => expect(disparo({ scrollPct: null })).toBeNull());

  it('intención: 2 productos, una búsqueda o una categoría', () => {
    expect(disparo({ senales: { productos: 1 } })).toBeNull();
    expect(disparo({ senales: { productos: 2 } })).toBe('product_views');
    expect(disparo({ senales: { busqueda: true } })).toBe('search');
    expect(disparo({ senales: { categoria: true } })).toBe('category');
  });

  it('salida solo con mouse y con 5 s en el sitio', () => {
    expect(disparo({ salida: true })).toBe('exit_intent');
    expect(disparo({ salida: true, esMovil: true })).toBeNull();
    expect(disparo({ salida: true, msEnSitio: 4_000, msEnPagina: 6_000 })).toBeNull();
  });

  it('c_scroll no dispara por tiempo', () => {
    const umbrales = POPUP_VARIANTES.c_scroll;
    expect(disparo({ umbrales, msEnSitio: 120_000 })).toBeNull();
    expect(disparo({ umbrales, scrollPct: 30 })).toBe('scroll');
  });

  it('a_8s dispara a los 8 s en los dos dispositivos', () => {
    const umbrales = POPUP_VARIANTES.a_8s;
    expect(disparo({ umbrales, msEnSitio: 8_000 })).toBe('time');
    expect(disparo({ umbrales, esMovil: true, msEnSitio: 8_000 })).toBe('time');
  });
});

describe('porcentajeScroll', () => {
  it('mitad de lo recorrible = 50', () => expect(porcentajeScroll({ scrollY: 500, alto: 1800, altoVentana: 800 })).toBe(50));
  it('página más corta que la pantalla → null', () =>
    expect(porcentajeScroll({ scrollY: 0, alto: 700, altoVentana: 800 })).toBeNull());
  it('no pasa de 100 (rebote de iOS)', () =>
    expect(porcentajeScroll({ scrollY: 1200, alto: 1800, altoVentana: 800 })).toBe(100));
});

describe('destinos del paso 2 (P-4)', () => {
  it('mate y celular a categorías, termo y notebook a su landing', () => {
    expect(destinoInteres('mate')).toBe('/categorias');
    expect(destinoInteres('termo')).toBe('/calcos-termo');
    expect(destinoInteres('notebook')).toBe('/calcos-notebook');
    expect(destinoInteres('celular')).toBe('/categorias');
    expect(destinoInteres('otro')).toBe('/categorias');
  });

  it('todos los destinos existen como ruta', () => {
    const app = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../App.jsx'), 'utf8');
    for (const { to } of INTERESES) {
      const esLanding = LANDING_SLUGS.includes(to.slice(1));
      const esRuta = app.includes(`path="${to}"`);
      expect(esLanding || esRuta, to).toBe(true);
    }
  });

  it('ningún interés preelige tamaño: la persona elige tamaño y diseño', () => {
    for (const i of INTERESES) expect(i.tamano, i.id).toBeUndefined();
  });
});

describe('visitante nuevo o recurrente', () => {
  it('sin rastro previo es nuevo', () => expect(tipoVisitante(null)).toBe('new'));
  it('con cualquier rastro previo es recurrente', () => {
    expect(tipoVisitante({ ...vacio, primeraVisitaEn: AHORA - DIA })).toBe('returning');
    expect(tipoVisitante({ ...vacio, cerradoEn: AHORA })).toBe('returning');
  });
});

describe('migración del popup anterior', () => {
  it('seen + cupón guardado → dejó el mail', () => {
    const e = migrarEstadoViejo({ seen: '1', cupon: { code: 'EPICA10' }, ahora: AHORA });
    expect(e.convertidoEn).toBe(AHORA);
    expect(e.cerradoEn).toBeNull();
  });
  it('seen sin cupón → lo cerró (7 días desde hoy)', () => {
    const e = migrarEstadoViejo({ seen: '1', cupon: null, ahora: AHORA });
    expect(e.cerradoEn).toBe(AHORA);
    expect(puede({ estado: e, ahora: AHORA + 6 * DIA })).toBe(false);
    expect(puede({ estado: e, ahora: AHORA + 8 * DIA })).toBe(true);
  });
  it('sin seen no hay nada que migrar', () => expect(migrarEstadoViejo({ seen: null, cupon: null, ahora: AHORA })).toBeNull());
});

describe('beneficio activo', () => {
  it('EPICA10 sin instante de emisión (P-2) sigue activo para siempre', () => {
    expect(beneficioActivo({ code: 'EPICA10', emitidoEn: null }, AHORA + 365 * DIA)).toBe(true);
  });
  it('un EPICA10 viejo con la ventana vencida no está activo', () => {
    expect(beneficioActivo({ code: 'EPICA10', emitidoEn: AHORA - CUPON_VENTANA_MS - 1 }, AHORA)).toBe(false);
  });
  it('un código que no existe no está activo', () => expect(beneficioActivo({ code: 'NOPE', emitidoEn: null })).toBe(false));
  it('sin cupón no hay beneficio', () => expect(beneficioActivo(null)).toBe(false));
});

describe('paridad de la oferta', () => {
  it('el código del popup es el que devuelve capture-lead y existe en los dos COUPONS', () => {
    expect(POPUP_OFERTA.codigo).toBe(WELCOME_COUPON_CODE);
    expect(COUPONS[POPUP_OFERTA.codigo]).toBeTruthy();
    expect(BE_COUPONS[POPUP_OFERTA.codigo]).toBeTruthy();
    expect(BE_COUPONS[POPUP_OFERTA.codigo].discount).toBe(COUPONS[POPUP_OFERTA.codigo].discount);
  });

  it('el % del copy sale del cupón, no de un número escrito a mano', () => {
    expect(porcentajeOferta()).toBe(Math.round(COUPONS[POPUP_OFERTA.codigo].discount * 100));
    expect(porcentajeOferta({ ...POPUP_OFERTA, codigo: 'NOPE' })).toBeNull();
    // Un tipo que el motor de precios todavía no cobra no se ofrece.
    expect(porcentajeOferta({ ...POPUP_OFERTA, tipo: 'monto' })).toBeNull();
  });

  it('P-2: el popup entrega el cupón sin ventana', () => expect(POPUP_OFERTA.conVentana).toBe(false));
});

describe('A/B de disparo', () => {
  it('las variantes de config coinciden con el experimento, y el control es producción', () => {
    const exp = EXPERIMENTS.popup_disparo;
    expect(Object.keys(POPUP_VARIANTES).sort()).toEqual([...exp.variants].sort());
    expect(exp.variants[0]).toBe('b_12s');
    expect(POPUP_VARIANTES.b_12s.escritorio).toEqual(POPUP_CONFIG.escritorio);
    expect(POPUP_VARIANTES.b_12s.movil).toEqual(POPUP_CONFIG.movil);
  });

  it('arranca apagado', () => expect(EXPERIMENTS.popup_disparo.active).toBe(false));
});
