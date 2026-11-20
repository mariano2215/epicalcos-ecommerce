import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CANTIDADES_COTIZADOR,
  CANTIDAD_MAS,
  TAMANOS_ESCALA,
  MATERIALES_ESCALA,
  cotizarPedidoNegocio,
  filasEscala,
  lineaVolumen,
  cuitValido,
  consultaPresupuesto,
  mensajeWhatsappCotizador,
  guardarConsultaCotizar,
  leerConsultaCotizar
} from './cotizadorNegocio.js';
import { ESCALA_VOLUMEN, NEGOCIO, TRANSFER_DISCOUNT, round } from '../config/pricing.js';
import { RECARGO_HOLOGRAFICO } from '../config/personalizados.js';
import { validateAndPriceOrder } from '../../../netlify/functions/lib/pricing.js';

/**
 * El cotizador de /negocio y el armador de /mayorista (spec 034). Lo que este
 * archivo frena antes del deploy: que el sitio muestre un precio que el
 * servidor no cobra. Si eso pasa, el cliente llega al checkout y se le
 * rechaza el pedido con `price_mismatch` (CLAUDE.md, regla 11).
 */
const retiro = { methodValue: 'retiro' };
const TS = 1700000000000;

/** La línea tal como la manda paymentService al servidor. */
const alServidor = (linea, unit_price = linea.basePrice) => ({
  id: linea.id,
  title: linea.name,
  quantity: linea.quantity,
  unit_price
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-17T12:00:00-03:00'));
});
afterEach(() => vi.useRealTimers());

describe('lo que ofrece el cotizador', () => {
  it('los cuatro escalones aprobados y "más de 1.000"', () => {
    expect(CANTIDADES_COTIZADOR).toEqual([100, 250, 500, 1000, CANTIDAD_MAS]);
  });

  it('solo 4 y 6 cm: el 9 cm no se vende por mayor (spec 032 §9.4)', () => {
    expect(TAMANOS_ESCALA).toEqual(['4cm', '6cm']);
  });

  it('los tres materiales, vinilo blanco primero (el recomendado)', () => {
    expect(MATERIALES_ESCALA).toEqual(['vinilo-blanco', 'dtf-uv', 'vinilo-holografico']);
  });
});

describe('paridad con el servidor (RNF-4)', () => {
  it('cada tamaño × material × escalón: el servidor cobra exactamente lo que muestra el cotizador, con MP y con transferencia', () => {
    let casos = 0;
    for (const tamano of TAMANOS_ESCALA) {
      for (const material of MATERIALES_ESCALA) {
        for (const cantidad of CANTIDADES_COTIZADOR.filter((c) => c !== CANTIDAD_MAS)) {
          const c = cotizarPedidoNegocio({ cantidad, tamano, material });
          expect(c.estado).toBe('precio');
          const linea = lineaVolumen({ tamano, material, cantidad, ts: TS });
          expect(linea, `${tamano} ${material} ${cantidad}`).not.toBeNull();
          expect(linea.basePrice).toBe(c.total);

          const mp = validateAndPriceOrder({ items: [alServidor(linea)], shipping: retiro, paymentMethod: 'mercadopago' });
          expect(mp.ok, `${tamano} ${material} ${cantidad}: ${mp.error} ${mp.detail || ''}`).toBe(true);
          expect(mp.itemsTotal).toBe(c.total);

          const tr = validateAndPriceOrder({
            items: [alServidor(linea, c.totalTransferencia)],
            shipping: retiro,
            paymentMethod: 'transferencia'
          });
          expect(tr.ok, `${tamano} ${material} ${cantidad} transferencia: ${tr.error}`).toBe(true);
          expect(tr.itemsTotal).toBe(c.totalTransferencia);
          casos++;
        }
      }
    }
    expect(casos).toBe(2 * 3 * 4);
  });

  it('la línea del armador de /mayorista (cualquier cantidad de 100 a 1.000 que no salte de escalón) también pasa', () => {
    for (const cantidad of [100, 137, 249, 300, 499, 777, 1000]) {
      const linea = lineaVolumen({ tamano: '4cm', cantidad, origen: 'mayorista', ts: TS });
      if (!linea) continue; // las que saltan de escalón no se emiten (ver abajo)
      const mp = validateAndPriceOrder({ items: [alServidor(linea)], shipping: retiro, paymentMethod: 'mercadopago' });
      expect(mp.ok, `${cantidad}: ${mp.error}`).toBe(true);
    }
  });
});

describe('lo que hoy ya se vendía cuesta lo mismo (RF-1, RF-3)', () => {
  it('100 · 6 cm · vinilo blanco = la Promo Negocio', () => {
    const c = cotizarPedidoNegocio({ cantidad: NEGOCIO.qty, tamano: NEGOCIO.size, material: 'vinilo-blanco' });
    expect(c.total).toBe(NEGOCIO.price);
  });

  it('100 holográficas = Negocio + tornasolado de la spec 033 (el tornasolado no se pierde)', () => {
    const c = cotizarPedidoNegocio({ cantidad: NEGOCIO.qty, tamano: NEGOCIO.size, material: 'vinilo-holografico' });
    expect(c.total).toBe(NEGOCIO.price + RECARGO_HOLOGRAFICO.precio);
  });

  it('DTF UV vale lo mismo que vinilo blanco (spec 032 P-4)', () => {
    for (const cantidad of [100, 250, 500, 1000]) {
      expect(cotizarPedidoNegocio({ cantidad, tamano: '6cm', material: 'dtf-uv' }).total).toBe(
        cotizarPedidoNegocio({ cantidad, tamano: '6cm', material: 'vinilo-blanco' }).total
      );
    }
  });
});

describe('cotizarPedidoNegocio', () => {
  it('más de 1.000 → presupuesto, sin precio (N-8)', () => {
    expect(cotizarPedidoNegocio({ cantidad: CANTIDAD_MAS, tamano: '6cm' })).toEqual({ estado: 'presupuesto', motivo: 'mas_de_1000' });
    expect(cotizarPedidoNegocio({ cantidad: 1500, tamano: '6cm' }).motivo).toBe('mas_de_1000');
  });

  it('9 cm → presupuesto: no hay precio online', () => {
    expect(cotizarPedidoNegocio({ cantidad: 100, tamano: '9cm' })).toEqual({ estado: 'presupuesto', motivo: 'sin_precio_online' });
  });

  it('el % sale del monto (10/20/30) y el de 100 es 0: ahí va MUESTRA GRATIS', () => {
    expect([100, 250, 500, 1000].map((cantidad) => cotizarPedidoNegocio({ cantidad, tamano: '6cm' }).pct)).toEqual([0, 10, 20, 30]);
  });

  it('transferencia con el mismo redondeo que el servidor', () => {
    const c = cotizarPedidoNegocio({ cantidad: 250, tamano: '4cm' });
    expect(c.totalTransferencia).toBe(round(ESCALA_VOLUMEN['4cm'][250] * (1 - TRANSFER_DISCOUNT)));
    expect(c.unitarioTransferencia).toBe(Math.round(c.totalTransferencia / 250));
  });
});

describe('filasEscala (la tabla de precios)', () => {
  it('una fila por escalón, con el precio por calco bajando', () => {
    const filas = filasEscala({ tamano: '6cm' });
    expect(filas.map((f) => f.cantidad)).toEqual([100, 250, 500, 1000]);
    for (let i = 1; i < filas.length; i++) expect(filas[i].unitario).toBeLessThan(filas[i - 1].unitario);
    expect(filas[0].total).toBe(ESCALA_VOLUMEN['6cm'][100]);
  });

  it('sin filas para lo que no se vende por mayor', () => {
    expect(filasEscala({ tamano: '9cm' })).toEqual([]);
  });
});

describe('lineaVolumen', () => {
  it('nunca emite lo que el servidor rechazaría', () => {
    expect(lineaVolumen({ tamano: '6cm', cantidad: 99, ts: TS })).toBeNull();
    expect(lineaVolumen({ tamano: '6cm', cantidad: 1001, ts: TS })).toBeNull();
    expect(lineaVolumen({ tamano: '9cm', cantidad: 100, ts: TS })).toBeNull();
    // 240 cuesta lo mismo que 250: el servidor solo acepta el id de 250 (spec 032 D-5 / spec 034 D-5).
    expect(lineaVolumen({ tamano: '6cm', cantidad: 240, ts: TS })).toBeNull();
  });

  it('el nombre no lleva la razón social ni nombres de archivo (viaja a GA4 y Meta)', () => {
    const l = lineaVolumen({
      tamano: '6cm',
      cantidad: 250,
      razonSocial: 'Bar La Esquina SRL',
      archivos: [{ nombre: 'logo-secreto.png', url: 'https://res.cloudinary.com/x/logo.png' }],
      ts: TS
    });
    expect(l.name).not.toMatch(/Esquina|logo-secreto/);
    expect(l.name).toBe('Calcos para negocio · 250 u · 6 cm · Vinilo Blanco');
  });

  it('meta: cantidad para el carrito, escala, razón social, indicaciones y sin `material` suelto', () => {
    const l = lineaVolumen({ tamano: '4cm', material: 'dtf-uv', cantidad: 500, disenos: 3, razonSocial: '  Bar  ', cuit: '20-12345678-3', ts: TS });
    expect(l.id).toBe(`volumen:4cm:dtf-uv:500:${TS}`);
    expect(l.quantity).toBe(1);
    expect(l.meta.qty).toBe(500);
    expect(l.meta.escala).toEqual({ tamano: '4cm', tamanoLabel: '4 cm', material: 'dtf-uv', materialLabel: 'DTF UV' });
    expect(l.meta.razonSocial).toBe('Bar');
    expect(l.meta.disenos).toBe(3);
    // Sin indicaciones no se inventa un reparto (N-9 sin confirmar).
    expect(l.meta.indicaciones).toBeNull();
    expect(l.meta).not.toHaveProperty('material');
    const largo = lineaVolumen({ tamano: '4cm', cantidad: 100, indicaciones: 'x'.repeat(1000), ts: TS });
    expect(largo.meta.indicaciones).toHaveLength(300);
  });

  it('desde /mayorista: catálogo en meta.items y sin material en el nombre', () => {
    const l = lineaVolumen({
      tamano: '4cm',
      cantidad: 100,
      origen: 'mayorista',
      items: [{ id: 'anime-1', name: 'Anime #1', qty: 100 }],
      ts: TS
    });
    expect(l.name).toBe('Pack por mayor · 100 calcos · 4 cm');
    expect(l.categoryLabel).toBe('Pack Mayorista');
    expect(l.meta.items).toHaveLength(1);
    expect(l.meta.disenos).toBeNull();
  });
});

describe('cuitValido', () => {
  it('opcional; si viene, 11 dígitos con o sin guiones', () => {
    expect(cuitValido('')).toBe(true);
    expect(cuitValido('20-12345678-3')).toBe(true);
    expect(cuitValido('20123456783')).toBe(true);
    expect(cuitValido('2012345678')).toBe(false);
    expect(cuitValido('abc')).toBe(false);
  });
});

describe('presupuesto y WhatsApp con la configuración (RF-8, 031 RF-C13)', () => {
  it('la consulta lleva cantidad, tamaño, material y diseños, y deja la razón social para completar', () => {
    const t = consultaPresupuesto({ cantidad: CANTIDAD_MAS, tamano: '6cm', material: 'vinilo-blanco', disenos: 2 });
    expect(t).toMatch(/más de 1\.000/);
    expect(t).toMatch(/Tamaño: 6 cm/);
    expect(t).toMatch(/Material: Vinilo Blanco/);
    expect(t).toMatch(/Cantidad de diseños: 2/);
    expect(t).toMatch(/razón social: $/);
  });

  it('el WhatsApp dice lo que estaba mirando', () => {
    expect(mensajeWhatsappCotizador({ cantidad: 250, tamano: '4cm', material: 'dtf-uv', disenos: 3 })).toBe(
      'Hola EPICALCOS. Estoy cotizando calcos para mi negocio: 250 calcos, 4 cm, DTF UV, 3 diseños.'
    );
  });

  it('la consulta guardada se lee mientras está vigente, y un storage roto no rompe nada', () => {
    const mem = new Map();
    const storage = { setItem: (k, v) => mem.set(k, v), getItem: (k) => mem.get(k) ?? null };
    const t0 = Date.now();
    guardarConsultaCotizar('hola', t0, storage);
    expect(leerConsultaCotizar(t0 + 1000, storage)).toBe('hola');
    expect(leerConsultaCotizar(t0 + 31 * 60 * 1000, storage)).toBeNull();

    const roto = { setItem: () => { throw new Error('quota'); }, getItem: () => { throw new Error('denied'); } };
    expect(() => guardarConsultaCotizar('x', t0, roto)).not.toThrow();
    expect(leerConsultaCotizar(t0, roto)).toBeNull();
  });
});
