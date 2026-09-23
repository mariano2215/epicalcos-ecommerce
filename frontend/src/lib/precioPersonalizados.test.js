import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cotizarTanda, convieneNegocio, precioEfectivoTanda } from './precioPersonalizados.js';
import { construirLineas } from './borradorPersonalizado.js';
import {
  TAMANOS,
  CORTES,
  CANTIDAD,
  ARCHIVO,
  clampCantidad,
  formatosLegibles,
  MATERIALES,
  MATERIAL_POR_DEFECTO,
  MATERIAL_HOLOGRAFICO_ID,
  RECARGO_HOLOGRAFICO
} from '../config/personalizados.js';
import { SIZES, NEGOCIO } from '../config/pricing.js';
import { esCustomViejo } from '../context/CartContext.jsx';
// Espejo del backend: la fuente de verdad del servidor que re-precia el checkout.
import { SIZE_PRICES, validateAndPriceOrder } from '../../../netlify/functions/lib/pricing.js';

/** Instantes fijos: sin promos por fecha y con el 3x2 vivo (arranca el 7/9/2026). */
const SIN_PROMO = new Date('2026-08-29T12:00:00-03:00');
const CON_3X2 = new Date('2026-09-15T12:00:00-03:00');

describe('cotizarTanda — precio de lista (mismo que el catálogo, sin mínimo)', () => {
  it('sin tamaño la configuración está incompleta y no hay precio', () => {
    const r = cotizarTanda({});
    expect(r.configuracionCompleta).toBe(false);
    expect(r.total).toBe(0);
    expect(cotizarTanda({ tamano: 'no-existe' }).configuracionCompleta).toBe(false);
  });

  it('el unitario es el precio de lista del tamaño (4cm 1200 · 6cm 1600 · 9cm 2000)', () => {
    for (const s of SIZES) {
      const r = cotizarTanda({ tamano: s.id, unidades: 1 });
      expect(r.configuracionCompleta).toBe(true);
      expect(r.unitario).toBe(s.price);
      expect(r.total).toBe(s.price);
    }
  });

  it('NO hay mínimo: una sola unidad es válida, y sin unidades se asume 1', () => {
    expect(CANTIDAD.min).toBe(1);
    expect(cotizarTanda({ tamano: '9cm', unidades: 1 }).total).toBe(2000);
    expect(cotizarTanda({ tamano: '4cm' }).unidades).toBe(1);
  });

  it('sin promo el total escala lineal y no hay ningún "ahorrás" (RF-Q4)', () => {
    for (const unidades of [1, 3, 10, 57, 250]) {
      const r = cotizarTanda({ tamano: '6cm', unidades, promoActiva: false });
      expect(r.unitario).toBe(1600);
      expect(r.total).toBe(1600 * unidades);
      expect(r.ahorro).toBe(0);
      expect(r.beneficio).toBeNull();
    }
  });

  it('las unidades de la tanda NO se topean en 1.000: son diseños × copias', () => {
    expect(cotizarTanda({ tamano: '4cm', unidades: 5000 }).unidades).toBe(5000);
  });

  it('la cantidad por diseño sí se sanea a los límites (entero, entre min y max)', () => {
    expect(clampCantidad(0)).toBe(CANTIDAD.min);
    expect(clampCantidad(-7)).toBe(CANTIDAD.min);
    expect(clampCantidad('')).toBe(CANTIDAD.min);
    expect(clampCantidad(3.9)).toBe(3);
    expect(clampCantidad(99999)).toBe(CANTIDAD.max);
  });
});

describe('cotizarTanda — con el 3x2 (RF-Q3, Q5)', () => {
  it('10 × 6 cm: $1.120 por unidad, $11.200 en total, ahorrás 30 % (AC-Q2)', () => {
    const r = cotizarTanda({ tamano: '6cm', unidades: 10, promoActiva: true });
    expect(r).toMatchObject({ unitario: 1120, total: 11200, totalLista: 16000, ahorro: 4800, ahorroPct: 30, gratis: 3, beneficio: '3x2' });
  });

  it('con 1 o 2 no hay ninguna gratis todavía, y dice cuántas faltan', () => {
    expect(cotizarTanda({ tamano: '6cm', unidades: 1, promoActiva: true })).toMatchObject({ ahorro: 0, faltanParaGratis: 2 });
    expect(cotizarTanda({ tamano: '6cm', unidades: 2, promoActiva: true })).toMatchObject({ ahorro: 0, faltanParaGratis: 1 });
    expect(cotizarTanda({ tamano: '6cm', unidades: 3, promoActiva: true })).toMatchObject({ gratis: 1, faltanParaGratis: 0 });
  });
});

describe('convieneNegocio — la recomendación de Negocio sale de las reglas (P-9)', () => {
  /** Primera cantidad de copias de UN diseño desde la que conviene Negocio. */
  const umbral = (tamano, promoActiva) => {
    for (let n = 1; n <= 200; n++) if (convieneNegocio({ tamano, copias: n, promoActiva })) return n;
    return null;
  };

  it('con el 3x2: 38 copias en 6 cm, 31 en 9 cm, 50 en 4 cm', () => {
    expect(umbral('6cm', true)).toBe(38);
    expect(umbral('9cm', true)).toBe(31);
    expect(umbral('4cm', true)).toBe(50);
  });

  it('en el umbral el configurador ya cuesta lo mismo o más que la Promo Negocio', () => {
    for (const s of SIZES) {
      const n = umbral(s.id, true);
      expect(cotizarTanda({ tamano: s.id, unidades: n, promoActiva: true }).total).toBeGreaterThanOrEqual(NEGOCIO.price);
      expect(cotizarTanda({ tamano: s.id, unidades: n - 1, promoActiva: true }).total).toBeLessThan(NEGOCIO.price);
    }
  });

  it('sin tamaño no recomienda nada', () => {
    expect(convieneNegocio({ tamano: null, copias: 500, promoActiva: true })).toBe(false);
  });
});

describe('paridad frontend ↔ backend (evita price_mismatch en el checkout)', () => {
  /**
   * Reloj fijado en un instante SIN promos por fecha vivas.
   *
   * Estos tests mandan al servidor el precio de LISTA del configurador. Sin
   * fijar el reloj pasaban por casualidad —porque no había promo corriendo— y
   * se pusieron en rojo solos al reactivar la 3x2, que le cambia el precio
   * esperado a las líneas `custom`. La suite es el gate del build de Netlify:
   * un test que depende del día en que se corre bloquea deploys sin aviso.
   */
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(SIN_PROMO);
  });
  afterEach(() => vi.useRealTimers());
  it('los precios por tamaño son idénticos a los del servidor', () => {
    expect(Object.fromEntries(TAMANOS.map((t) => [t.id, t.precio]))).toEqual(SIZE_PRICES);
  });

  it('el servidor acepta el precio del configurador para toda combinación', () => {
    for (const t of TAMANOS) {
      for (const c of CORTES) {
        for (const cantidad of [1, 2, 10, 137]) {
          const precio = cotizarTanda({ tamano: t.id, unidades: cantidad, promoActiva: false });
          const res = validateAndPriceOrder({
            items: [
              {
                id: `custom:${t.id}:${c.id}:1`,
                title: `Personalizado ${t.label} ${c.label}`,
                quantity: cantidad,
                unit_price: precio.unitario
              }
            ],
            shipping: { methodValue: 'retiro' },
            paymentMethod: 'mercadopago'
          });
          expect(res.ok).toBe(true);
          expect(res.itemsTotal).toBe(precio.total);
        }
      }
    }
  });

  it('el servidor acepta UNA línea por diseño con el tope de archivos lleno', () => {
    // El configurador manda una línea por archivo subido (hasta ARCHIVO.maxArchivos):
    // si MAX_LINES del servidor quedara por debajo, el checkout se caería con too_many_lines.
    const items = Array.from({ length: ARCHIVO.maxArchivos }, (_, i) => ({
      id: `custom:4cm:silueta:f${i}`,
      title: `Personalizado 4 cm Silueta diseño-${i}.png`,
      quantity: 1,
      unit_price: SIZE_PRICES['4cm']
    }));
    const res = validateAndPriceOrder({
      items,
      shipping: { methodValue: 'retiro' },
      paymentMethod: 'mercadopago'
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(SIZE_PRICES['4cm'] * ARCHIVO.maxArchivos);
  });

  it('el servidor rechaza un tamaño inventado o un precio adulterado', () => {
    const base = {
      shipping: { methodValue: 'retiro' },
      paymentMethod: 'mercadopago'
    };
    const tamanoTrucho = validateAndPriceOrder({
      ...base,
      items: [{ id: 'custom:99cm:silueta:1', title: 'X', quantity: 1, unit_price: 10 }]
    });
    expect(tamanoTrucho.ok).toBe(false);

    const precioTrucho = validateAndPriceOrder({
      ...base,
      items: [{ id: 'custom:6cm:silueta:1', title: 'X', quantity: 1, unit_price: 1 }]
    });
    expect(precioTrucho.ok).toBe(false);
    expect(precioTrucho.error).toBe('price_mismatch');
  });
});

describe('paridad con el 3x2 vivo — lo que muestra el configurador es lo que cobra el servidor (RF-Q7)', () => {
  /**
   * El "ahorrás" del configurador (spec 023) se calcula en el cliente. Si el
   * redondeo o la regla difirieran del servidor, la pantalla prometería un total
   * y el checkout se rechazaría con `price_mismatch` o cobraría otro. Acá se
   * mandan al servidor REAL las líneas que arma el borrador, con el unitario
   * que muestra `cotizarTanda`.
   */
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(CON_3X2);
  });
  afterEach(() => vi.useRealTimers());

  const estado = (tamano, copias, n) => ({
    tamano,
    corte: 'silueta',
    copias,
    instrucciones: '',
    disenos: Array.from({ length: n }, (_, i) => ({
      id: `f${i}`,
      nombre: `d${i}.png`,
      extSubida: 'png',
      pesoMB: 1,
      url: `https://res.cloudinary.com/x/d${i}.png`,
      estado: 'listo'
    }))
  });

  it('para todo tamaño × {1,2,3,5,10,25,50,100} copias × 1 o 3 diseños', () => {
    for (const t of TAMANOS) {
      for (const copias of [1, 2, 3, 5, 10, 25, 50, 100]) {
        for (const n of [1, 3]) {
          const lineas = construirLineas(estado(t.id, copias, n));
          const c = cotizarTanda({ tamano: t.id, unidades: copias * n, promoActiva: true });
          const res = validateAndPriceOrder({
            items: lineas.map((l) => ({ id: l.id, title: l.name, quantity: l.quantity, unit_price: c.unitario })),
            shipping: { methodValue: 'retiro' },
            paymentMethod: 'mercadopago'
          });
          expect(res.ok, `${t.id} × ${copias} × ${n}: ${res.error} ${res.detail || ''}`).toBe(true);
          expect(res.itemsTotal).toBe(c.total);
        }
      }
    }
  });

  it('las líneas del borrador son las de siempre: el servidor las acepta al precio de lista sin promo', () => {
    vi.setSystemTime(SIN_PROMO);
    const lineas = construirLineas(estado('9cm', 4, 2));
    const res = validateAndPriceOrder({
      items: lineas.map((l) => ({ id: l.id, title: l.name, quantity: l.quantity, unit_price: l.basePrice })),
      shipping: { methodValue: 'retiro' },
      paymentMethod: 'mercadopago'
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(2000 * 8);
  });
});

describe('material — Vinilo Blanco / DTF UV / Vinilo Holográfico (enmienda 22/9/2026)', () => {
  it('Vinilo Blanco y DTF UV: mismo precio de siempre, sin recargo', () => {
    for (const m of MATERIALES.filter((x) => x.id !== MATERIAL_HOLOGRAFICO_ID)) {
      const r = cotizarTanda({ tamano: '6cm', unidades: 10, material: m.id, disenos: 1 });
      expect(r.recargo).toBe(0);
      expect(r.total).toBe(16000);
    }
  });

  it('Vinilo Holográfico: recargo FIJO por diseño, no por copia (RF-MAT3, AC-MAT3)', () => {
    const r = cotizarTanda({ tamano: '6cm', unidades: 10, material: MATERIAL_HOLOGRAFICO_ID, disenos: 1 });
    expect(r.recargo).toBe(RECARGO_HOLOGRAFICO.precio);
    expect(r.total).toBe(16000 + 15000); // 10 copias × $1.600 + $15.000, no ×10
    expect(r.unitario).toBe(1600); // el unitario NO cambia
  });

  it('con varios diseños el recargo escala por diseño, no por copia total', () => {
    const r = cotizarTanda({ tamano: '4cm', unidades: 3 * 5, material: MATERIAL_HOLOGRAFICO_ID, disenos: 3 });
    expect(r.recargo).toBe(RECARGO_HOLOGRAFICO.precio * 3);
    expect(r.total).toBe(1200 * 15 + 15000 * 3);
  });

  it('el recargo no se mueve con el 3x2 vivo: descuenta el precio por tamaño, no el recargo (RF-MAT6)', () => {
    const sinRecargo = cotizarTanda({ tamano: '6cm', unidades: 10, promoActiva: true });
    const conRecargo = cotizarTanda({ tamano: '6cm', unidades: 10, promoActiva: true, material: MATERIAL_HOLOGRAFICO_ID, disenos: 1 });
    expect(conRecargo.total).toBe(sinRecargo.total + RECARGO_HOLOGRAFICO.precio);
    expect(conRecargo.unitario).toBe(sinRecargo.unitario);
    expect(conRecargo.ahorro).toBe(sinRecargo.ahorro); // el "ahorrás" tampoco cuenta el recargo
  });

  it('sin material (default) se comporta exactamente como antes de la enmienda', () => {
    const sinMaterial = cotizarTanda({ tamano: '9cm', unidades: 4 });
    const conDefault = cotizarTanda({ tamano: '9cm', unidades: 4, material: MATERIAL_POR_DEFECTO, disenos: 1 });
    expect(sinMaterial).toEqual(conDefault);
  });

  it('construirLineas: el material viaja en el id (4º segmento) y en meta', () => {
    const estado = {
      tamano: '6cm',
      corte: 'silueta',
      material: MATERIAL_HOLOGRAFICO_ID,
      copias: 2,
      instrucciones: '',
      disenos: [{ id: 'fabc1', nombre: 'd.png', extSubida: 'png', pesoMB: 1, url: 'https://res.cloudinary.com/x/d.png', estado: 'listo' }]
    };
    const [linea] = construirLineas(estado);
    expect(linea.id).toBe('custom:6cm:silueta:vinilo-holografico:fabc1');
    expect(linea.meta.material).toBe(MATERIAL_HOLOGRAFICO_ID);
    expect(linea.basePrice).toBe(1600); // el material no toca basePrice de la línea
  });
});

describe('validateAndPriceOrder — recargo del holográfico (RF-MAT7, enmienda 22/9/2026)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(SIN_PROMO);
  });
  afterEach(() => vi.useRealTimers());

  const base = { shipping: { methodValue: 'retiro' }, paymentMethod: 'mercadopago' };
  const lineaCustom = (over = {}) => ({
    id: 'custom:6cm:silueta:vinilo-holografico:f1',
    title: 'Personalizado 6 cm Silueta',
    quantity: 10,
    unit_price: 1600,
    ...over
  });
  const lineaRecargo = (over = {}) => ({
    id: 'fixed:material-holografico:f1',
    title: 'Recargo · Vinilo Holográfico',
    quantity: 1,
    unit_price: RECARGO_HOLOGRAFICO.precio,
    ...over
  });

  it('acepta el par custom holográfico + su recargo, y suma el recargo una sola vez', () => {
    const res = validateAndPriceOrder({ ...base, items: [lineaCustom(), lineaRecargo()] });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(1600 * 10 + 15000);
  });

  it('rechaza un diseño holográfico SIN su línea de recargo (manipulación de carrito)', () => {
    const res = validateAndPriceOrder({ ...base, items: [lineaCustom()] });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('recargo_material_faltante');
  });

  it('rechaza un recargo huérfano (sin su diseño holográfico)', () => {
    const res = validateAndPriceOrder({
      ...base,
      items: [lineaCustom({ id: 'custom:6cm:silueta:vinilo-blanco:f1' }), lineaRecargo()]
    });
    expect(res.ok).toBe(false);
  });

  it('rechaza el recargo con cantidad distinta de 1', () => {
    const res = validateAndPriceOrder({ ...base, items: [lineaCustom(), lineaRecargo({ quantity: 2, unit_price: 7500 })] });
    expect(res.ok).toBe(false);
  });

  it('una línea `custom:` de 4 segmentos (formato de antes de esta enmienda) sigue aceptándose como Vinilo Blanco, sin recargo (ANF-4)', () => {
    const res = validateAndPriceOrder({
      ...base,
      items: [{ id: 'custom:6cm:silueta:f1', title: 'Personalizado 6 cm Silueta', quantity: 10, unit_price: 1600 }]
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(16000);
  });

  it('rechaza un material desconocido en el id', () => {
    const res = validateAndPriceOrder({ ...base, items: [lineaCustom({ id: 'custom:6cm:silueta:oro:f1' })] });
    expect(res.ok).toBe(false);
  });
});

describe('precioEfectivoTanda — topear el precio a la Promo Negocio (enmienda 22/9/2026)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(CON_3X2);
  });
  afterEach(() => vi.useRealTimers());

  it('un solo diseño en 6 cm, en el umbral de Negocio (38 copias): topea a $39.999, no a lo que daría el 3x2', () => {
    const tresPorDos = cotizarTanda({ tamano: '6cm', unidades: 38, promoActiva: true });
    expect(tresPorDos.total).toBeGreaterThanOrEqual(NEGOCIO.price); // por eso topea
    const c = precioEfectivoTanda({ tamano: '6cm', copias: 38, disenos: 1, promoActiva: true });
    expect(c).toMatchObject({ esNegocio: true, total: NEGOCIO.price, unidades: NEGOCIO.qty, recargo: 0 });
  });

  it('menos copias (50) o exactamente 100: el total es siempre $39.999 — "se paga el monto de la promo" (Mariano, 14/9/2026)', () => {
    expect(precioEfectivoTanda({ tamano: '6cm', copias: 50, disenos: 1, promoActiva: true })).toMatchObject({ esNegocio: true, total: NEGOCIO.price });
    expect(precioEfectivoTanda({ tamano: '6cm', copias: 100, disenos: 1, promoActiva: true })).toMatchObject({ esNegocio: true, total: NEGOCIO.price });
  });

  it('Vinilo Holográfico: el recargo se SUMA arriba de Negocio, no lo reemplaza (Mariano, 22/9/2026)', () => {
    const c = precioEfectivoTanda({ tamano: '6cm', copias: 100, disenos: 1, promoActiva: true, material: MATERIAL_HOLOGRAFICO_ID });
    expect(c).toMatchObject({ esNegocio: true, recargo: RECARGO_HOLOGRAFICO.precio, total: NEGOCIO.price + RECARGO_HOLOGRAFICO.precio });
  });

  it('debajo del umbral: sin tope, igual que cotizarTanda de siempre', () => {
    const c = precioEfectivoTanda({ tamano: '6cm', copias: 10, disenos: 1, promoActiva: true });
    expect(c.esNegocio).toBe(false);
    expect(c).toMatchObject(cotizarTanda({ tamano: '6cm', unidades: 10, promoActiva: true, disenos: 1 }));
  });

  it('con más de un diseño no topea, aunque el total combinado supere a Negocio (la promo es "100 de UN diseño")', () => {
    const c = precioEfectivoTanda({ tamano: '6cm', copias: 50, disenos: 3, promoActiva: true });
    expect(c.esNegocio).toBe(false);
    expect(c.total).toBeGreaterThan(NEGOCIO.price);
  });

  it('en otro tamaño no topea (Negocio entrega específicamente 6 cm)', () => {
    expect(precioEfectivoTanda({ tamano: '9cm', copias: 40, disenos: 1, promoActiva: true }).esNegocio).toBe(false);
    expect(precioEfectivoTanda({ tamano: '4cm', copias: 60, disenos: 1, promoActiva: true }).esNegocio).toBe(false);
  });
});

describe('validateAndPriceOrder — Promo Negocio topeada desde personalizados (enmienda 22/9/2026)', () => {
  const base = { shipping: { methodValue: 'retiro' }, paymentMethod: 'mercadopago' };

  it('acepta negocio:{ts} de siempre (formulario estándar de /negocio), sin material', () => {
    const res = validateAndPriceOrder({
      ...base,
      items: [{ id: `negocio:${Date.now()}`, title: 'Negocio · Bar La Esquina · 100u 6 cm', quantity: 1, unit_price: NEGOCIO.price }]
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(NEGOCIO.price);
  });

  it('acepta negocio:{material}:{ts} holográfico + su recargo, y no lo confunde con un huérfano', () => {
    const ts = Date.now();
    const res = validateAndPriceOrder({
      ...base,
      items: [
        { id: `negocio:vinilo-holografico:${ts}`, title: 'Negocio · 100u 6 cm', quantity: 1, unit_price: NEGOCIO.price },
        { id: `fixed:material-holografico:${ts}`, title: 'Recargo · Vinilo Holográfico', quantity: 1, unit_price: RECARGO_HOLOGRAFICO.precio }
      ]
    });
    expect(res.ok).toBe(true);
    expect(res.itemsTotal).toBe(NEGOCIO.price + RECARGO_HOLOGRAFICO.precio);
  });

  it('rechaza un negocio: holográfico SIN su recargo (mismo mecanismo que un custom: holográfico)', () => {
    const res = validateAndPriceOrder({
      ...base,
      items: [{ id: `negocio:vinilo-holografico:${Date.now()}`, title: 'Negocio · 100u 6 cm', quantity: 1, unit_price: NEGOCIO.price }]
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('recargo_material_faltante');
  });

  it('rechaza un material desconocido en una línea negocio:', () => {
    const res = validateAndPriceOrder({
      ...base,
      items: [{ id: `negocio:oro:${Date.now()}`, title: 'Negocio · 100u 6 cm', quantity: 1, unit_price: NEGOCIO.price }]
    });
    expect(res.ok).toBe(false);
  });
});

describe('esCustomViejo — migración de material (enmienda 22/9/2026, design.md §8)', () => {
  it('purga los 4 ids de material del modelo viejo (commit 1a32e6c), material PRIMERO', () => {
    for (const materialViejo of ['vinilo-blanco', 'transparente', 'holografico', 'dtf-uv']) {
      expect(esCustomViejo(`custom:${materialViejo}:6cm:silueta:167000000`)).toBe(true);
    }
  });

  it('acepta el formato de 4 segmentos (sin material, default Vinilo Blanco)', () => {
    expect(esCustomViejo('custom:6cm:silueta:f1')).toBe(false);
  });

  it('acepta el formato nuevo de 5 segmentos con material (tamaño sigue en parts[1])', () => {
    expect(esCustomViejo('custom:6cm:silueta:vinilo-holografico:f1')).toBe(false);
    expect(esCustomViejo('custom:9cm:circulo:dtf-uv:f2')).toBe(false);
  });

  it('no toca líneas que no son custom', () => {
    expect(esCustomViejo('sticker:goku-1:6cm')).toBe(false);
    expect(esCustomViejo('fixed:material-holografico:f1')).toBe(false);
  });
});

describe('formatosLegibles — el texto de ayuda no puede contradecir al validador', () => {
  /**
   * POR QUÉ ESTE TEST: la zona de subida anunciaba "PNG, JPG o PDF" escrito a
   * mano mientras `ARCHIVO.formatos` aceptaba además SVG y AI. El sitio le
   * negaba al cliente un formato que después le aceptaba igual. Ahora el texto
   * se deriva de la lista, y esto lo mantiene atado.
   */
  it('nombra TODOS los formatos que el validador acepta', () => {
    const texto = formatosLegibles();
    for (const f of ARCHIVO.formatos) {
      if (f === 'jpeg') continue; // se acepta, pero se lista como JPG
      expect(texto, `falta ${f} en "${texto}"`).toContain(f.toUpperCase());
    }
  });

  it('no nombra ningún formato que el validador rechace', () => {
    const aceptados = ARCHIVO.formatos.map((f) => f.toUpperCase());
    for (const nombre of formatosLegibles().split(/,\s*|\s+o\s+/)) {
      expect(aceptados, `${nombre} no está en ARCHIVO.formatos`).toContain(nombre);
    }
  });

  it('no lista JPEG aparte de JPG (es la misma extensión)', () => {
    expect(formatosLegibles()).not.toContain('JPEG');
    expect(ARCHIVO.formatos).toContain('jpeg'); // pero se sigue aceptando
  });

  it('respeta una lista restringida (ej. las fotos Polaroid: sin PDF ni vectoriales)', () => {
    expect(formatosLegibles(['png', 'jpg', 'jpeg'])).toBe('PNG o JPG');
  });

  it('arma la enumeración en castellano, con "o" antes del último', () => {
    expect(formatosLegibles(['png', 'jpg', 'pdf'])).toBe('PNG, JPG o PDF');
    expect(formatosLegibles(['png'])).toBe('PNG');
  });
});
