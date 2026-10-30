import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CYBER,
  CYBER_START_MS,
  CYBER_END_MS,
  TRANSFER_DISCOUNT,
  isCyberActive,
  packsCyberVigentes,
  packCyberDeLinea,
  precioHabitualPack,
  precioPackCyber,
  precioVidrieraLinea,
  priceForSize,
  round,
  setCyberPreview
} from '../config/pricing.js';
import {
  CYBER as SERVIDOR,
  isCyberActive as isCyberActiveServidor,
  precioHabitualPack as precioHabitualServidor,
  precioPackCyber as precioPackServidor,
  validateAndPriceOrder
} from '../../../netlify/functions/lib/pricing.js';
import { calcosDeLinea, esPedidoVolumen } from './plazoProduccion.js';
import { calcosDeLinea as calcosServidor } from '../../../netlify/functions/lib/plazoProduccion.js';
import { precioBaseVigente } from './precioVigente.js';
import { separarPacks, sugerenciaCyber } from '../config/epicyber.js';

/**
 * Spec 036. Los interruptores vienen apagados: acá se prenden LOS DOS objetos
 * del espejo y se corre el flujo real contra `validateAndPriceOrder`. Si se
 * saltearan con `it.runIf`, como los del 3x2, justo el camino que se va a
 * publicar quedaría sin probar hasta el día que se prende.
 *
 * ⚠️ Los costos viven SOLO acá: `config/pricing.js` se publica en el bundle.
 * Fórmula de Mariano (30/10/2026), con el fijo una vez por pedido.
 */
const costo = (qty) => 5000 + 119 * qty;

const MARTES = '2026-11-03T12:00:00-03:00';
const retiro = { methodValue: 'retiro' };
const rosario = { methodValue: 'envio', city: 'Rosario', province: 'Santa Fe' };
const interior = { methodValue: 'envio', city: 'Córdoba', province: 'Córdoba' };
const linea = (qty, size = '4cm', ts = 1) => `pack:cyber:${size}:${qty}:${ts}`;
const orden = (id, unit_price, extra = {}) => ({
  items: [{ id, title: 'Pack Cyber', quantity: 1, unit_price }],
  shipping: retiro,
  ...extra
});

const original = {
  front: JSON.parse(JSON.stringify(CYBER)),
  server: JSON.parse(JSON.stringify(SERVIDOR))
};

/** Prende los dos lados del espejo. `sinAprobar` deja esas cantidades como candidatas. */
function prender({ sinAprobar = [] } = {}) {
  CYBER.activa = true;
  SERVIDOR.activa = true;
  for (const p of CYBER.packs) {
    p.aprobado = !sinAprobar.includes(p.qty);
    SERVIDOR.packs[p.qty].aprobado = p.aprobado;
  }
}

const enFecha = (fecha) => vi.setSystemTime(new Date(fecha));

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.useRealTimers();
  setCyberPreview(false);
  CYBER.activa = original.front.activa;
  SERVIDOR.activa = original.server.activa;
  CYBER.packs.forEach((p, i) => {
    p.aprobado = original.front.packs[i].aprobado;
    SERVIDOR.packs[p.qty].aprobado = original.server.packs[p.qty].aprobado;
  });
});

describe('EPICYBER — espejo', () => {
  it('los dos lados tienen la misma tabla, fechas, tamaños e interruptores', () => {
    const delFront = Object.fromEntries(
      CYBER.packs.map((p) => [p.qty, { price: p.price, aprobado: p.aprobado }])
    );
    expect(SERVIDOR.packs).toEqual(delFront);
    expect(SERVIDOR.activa).toBe(CYBER.activa);
    expect(SERVIDOR.sizes).toEqual(CYBER.sizes);
    expect(SERVIDOR.startMs).toBe(CYBER_START_MS);
    expect(SERVIDOR.endMs).toBe(CYBER_END_MS);
  });

  it('el habitual da igual de los dos lados, en cada pack y tamaño', () => {
    for (const { qty } of CYBER.packs) {
      for (const size of CYBER.sizes) {
        expect(precioHabitualServidor({ qty, size })).toBe(precioHabitualPack({ qty, size }));
      }
    }
  });

  it('la ventana es del 2/11 00:00 al 8/11 23:59:59, hora Argentina', () => {
    expect(new Date(CYBER_START_MS).toISOString()).toBe('2026-11-02T03:00:00.000Z');
    expect(new Date(CYBER_END_MS).toISOString()).toBe('2026-11-09T02:59:59.000Z');
  });
});

describe('EPICYBER — ninguna oferta miente', () => {
  it.each(CYBER.packs.map((p) => [p.qty, p.price]))(
    'x%i a $%i: rebaja real y sin vender a pérdida, en 4 y 6 cm',
    (qty, price) => {
      for (const size of CYBER.sizes) {
        expect(price).toBeLessThan(precioHabitualPack({ qty, size }));
      }
      expect(price).toBeGreaterThan(costo(qty));
      expect(round(price * (1 - TRANSFER_DISCOUNT))).toBeGreaterThan(costo(qty));
    }
  );

  it('cuanto más calcos, más sube el total y más baja el precio por calco', () => {
    CYBER.packs.slice(1).forEach((p, i) => {
      const previo = CYBER.packs[i];
      expect(p.price).toBeGreaterThan(previo.price);
      expect(p.price / p.qty).toBeLessThan(previo.price / previo.qty);
    });
  });

  it('el habitual desde 100 es la escala, no la lista', () => {
    expect(precioHabitualPack({ qty: 100, size: '4cm' })).toBe(52999);
    expect(precioHabitualPack({ qty: 200, size: '6cm' })).toBe(105998);
    expect(precioHabitualPack({ qty: 500, size: '4cm' })).toBe(211999);
    expect(precioHabitualPack({ qty: 10, size: '4cm' })).toBe(priceForSize('4cm') * 10);
  });

  it('el costo no está en el código que se publica', () => {
    expect(JSON.stringify(CYBER)).not.toMatch(/costo|margen/i);
  });
});

/**
 * ⚠️ Este bloque APAGA a mano y no mira cómo vienen los interruptores: `npm test`
 * es una barrera del deploy. Un test que exigiera "campaña apagada" frenaría el
 * push que la prende.
 */
describe('EPICYBER — apagada', () => {
  beforeEach(() => {
    prender();
    CYBER.activa = false;
    SERVIDOR.activa = false;
  });

  it('no hay campaña aunque la fecha y las aprobaciones estén', () => {
    enFecha(MARTES);
    expect(isCyberActive()).toBe(false);
    expect(isCyberActiveServidor()).toBe(false);
    expect(packsCyberVigentes()).toEqual([]);
  });

  it('el servidor rechaza el precio de campaña y acepta el habitual', () => {
    enFecha(MARTES);
    expect(validateAndPriceOrder(orden(linea(10), 9990)).error).toBe('price_mismatch');
    expect(validateAndPriceOrder(orden(linea(10), 16000)).ok).toBe(true);
  });
});

describe('EPICYBER — ventana, en los cuatro bordes', () => {
  beforeEach(() => prender());

  it.each([
    ['un ms antes de empezar', CYBER_START_MS - 1, false],
    ['al empezar', CYBER_START_MS, true],
    ['al terminar', CYBER_END_MS, true],
    ['un ms después', CYBER_END_MS + 1, false]
  ])('%s', (_, ms, vigente) => {
    enFecha(ms);
    const esperado = vigente ? 9990 : 16000;
    expect(isCyberActive()).toBe(vigente);
    expect(isCyberActiveServidor()).toBe(vigente);
    expect(precioPackCyber({ qty: 10, size: '4cm' })).toBe(esperado);
    expect(precioPackServidor({ qty: 10, size: '4cm' })).toBe(esperado);
    expect(validateAndPriceOrder(orden(linea(10), esperado)).ok).toBe(true);
  });
});

describe('EPICYBER — aprobación por pack', () => {
  it('sin aprobar no se muestra ni se cobra, aunque la campaña esté prendida', () => {
    prender({ sinAprobar: [15] });
    enFecha(MARTES);
    expect(packsCyberVigentes().map((p) => p.qty)).not.toContain(15);
    expect(precioPackCyber({ qty: 15, size: '4cm' })).toBe(24000);
    expect(validateAndPriceOrder(orden(linea(15), 10990)).error).toBe('price_mismatch');
    expect(validateAndPriceOrder(orden(linea(15), 24000)).ok).toBe(true);
  });

  it('sin ningún pack aprobado no hay campaña', () => {
    prender({ sinAprobar: CYBER.packs.map((p) => p.qty) });
    enFecha(MARTES);
    expect(isCyberActive()).toBe(false);
    expect(isCyberActiveServidor()).toBe(false);
  });
});

describe('EPICYBER — compra contra el servidor', () => {
  beforeEach(() => {
    prender();
    enFecha(MARTES);
  });

  it.each(CYBER.packs.map((p) => [p.qty, p.price]))('x%i cobra exacto $%i', (qty, price) => {
    for (const size of CYBER.sizes) {
      const res = validateAndPriceOrder(orden(linea(qty, size), price));
      expect(res.ok).toBe(true);
      expect(res.itemsTotal).toBe(price);
    }
  });

  it('la vidriera y el servidor dan el mismo precio', () => {
    const id = linea(30, '6cm');
    const line = { id, basePrice: precioBaseVigente({ id, basePrice: 0 }) };
    expect(precioVidrieraLinea(line)).toBe(13990);
    expect(line.basePrice).toBe(63000);
  });

  it('la transferencia corre sobre el precio de campaña', () => {
    const unit = round(9990 * (1 - TRANSFER_DISCOUNT));
    expect(unit).toBe(8991);
    const res = validateAndPriceOrder(orden(linea(10), unit, { paymentMethod: 'transferencia' }));
    expect(res.ok).toBe(true);
  });

  it('EPICA10 no toca el pack', () => {
    expect(validateAndPriceOrder(orden(linea(10), 9990, { couponCode: 'EPICA10' })).ok).toBe(true);
    expect(validateAndPriceOrder(orden(linea(10), 8991, { couponCode: 'EPICA10' })).error).toBe('price_mismatch');
  });

  it('EPI50 no toca el pack y anula la transferencia', () => {
    const res = validateAndPriceOrder(
      orden(linea(10), 9990, { couponCode: 'EPI50', paymentMethod: 'transferencia' })
    );
    expect(res.ok).toBe(true);
  });

  it.each([
    ['9 cm', 'pack:cyber:9cm:10:1', 1],
    ['cantidad fuera de tabla', 'pack:cyber:4cm:12:1', 1],
    ['sin cantidad', 'pack:cyber:4cm', 1]
  ])('rechaza %s', (_, id, quantity) => {
    const res = validateAndPriceOrder({
      items: [{ id, title: 'x', quantity, unit_price: 9990 }],
      shipping: retiro
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('item_invalid');
  });

  it('rechaza dos unidades en una misma línea', () => {
    const res = validateAndPriceOrder({
      items: [{ id: linea(10), title: 'x', quantity: 2, unit_price: 9990 }],
      shipping: retiro
    });
    expect(res.error).toBe('item_invalid');
  });

  it('el envío sigue las reglas de siempre', () => {
    expect(validateAndPriceOrder({ ...orden(linea(30), 13990), shipping: rosario }).shippingCost).toBe(4500);
    expect(validateAndPriceOrder({ ...orden(linea(30), 13990), shipping: interior }).shippingCost).toBe(8500);
    expect(validateAndPriceOrder({ ...orden(linea(100), 39900), shipping: rosario }).shippingCost).toBe(0);
    expect(validateAndPriceOrder({ ...orden(linea(100), 39900), shipping: interior }).shippingCost).toBe(8500);
    expect(validateAndPriceOrder({ ...orden(linea(200), 74900), shipping: interior }).shippingCost).toBe(0);
  });

  it('dos packs en el carrito son dos líneas válidas', () => {
    const res = validateAndPriceOrder({
      items: [
        { id: linea(10, '4cm', 1), title: 'a', quantity: 1, unit_price: 9990 },
        { id: linea(20, '6cm', 2), title: 'b', quantity: 1, unit_price: 11990 }
      ],
      shipping: retiro
    });
    expect(res.itemsTotal).toBe(21980);
  });

  it('de 1 a 9 calcos sueltas el precio no cambia', () => {
    const res = validateAndPriceOrder({
      items: [{ id: 'sticker:anime-1:4cm', title: 'Goku', quantity: 7, unit_price: priceForSize('4cm') }],
      shipping: retiro
    });
    expect(res.itemsTotal).toBe(priceForSize('4cm') * 7);
  });
});

describe('EPICYBER — carrito guardado después de la campaña', () => {
  it('vale el habitual y compra sin error', () => {
    prender();
    enFecha(CYBER_END_MS + 3_600_000);
    const id = linea(20);
    const line = { id, basePrice: 32000, quantity: 1 };
    expect(precioVidrieraLinea(line)).toBe(32000);
    expect(validateAndPriceOrder(orden(id, 32000)).ok).toBe(true);
    expect(validateAndPriceOrder(orden(id, 11990)).error).toBe('price_mismatch');
  });

  it('el pack de 100 vuelve a $52.999, no a la lista', () => {
    prender();
    enFecha(CYBER_END_MS + 1);
    expect(precioPackCyber({ qty: 100, size: '4cm' })).toBe(52999);
    expect(validateAndPriceOrder(orden(linea(100), 52999)).ok).toBe(true);
  });
});

describe('EPICYBER — vista previa', () => {
  it('prende la campaña en el navegador y muestra hasta lo sin aprobar', () => {
    enFecha('2026-10-30T12:00:00-03:00');
    setCyberPreview(true);
    expect(isCyberActive()).toBe(true);
    expect(packsCyberVigentes()).toHaveLength(CYBER.packs.length);
  });

  it('el servidor no se entera: el precio Cyber se rechaza igual', () => {
    enFecha('2026-10-30T12:00:00-03:00');
    setCyberPreview(true);
    expect(isCyberActiveServidor()).toBe(false);
    expect(validateAndPriceOrder(orden(linea(10), 9990)).error).toBe('price_mismatch');
  });
});

describe('EPICYBER — plazo de producción', () => {
  it('cuenta las calcos del id, igual de los dos lados', () => {
    const chico = { id: linea(50), quantity: 1 };
    const grande = { id: linea(100), quantity: 1 };
    expect(calcosDeLinea(chico)).toBe(50);
    expect(calcosServidor(chico)).toBe(50);
    expect(calcosDeLinea(grande)).toBe(100);
    expect(calcosServidor(grande)).toBe(100);
    expect(esPedidoVolumen([chico])).toBe(false);
    expect(esPedidoVolumen([grande])).toBe(true);
  });
});

describe('EPICYBER — línea y upsell', () => {
  const packs = CYBER.packs;
  const sticker = (id, size, quantity, price = priceForSize(size)) => ({
    id: `sticker:${id}:${size}`,
    type: 'sticker',
    size,
    name: `${id} · ${size}`,
    image: `/${id}.webp`,
    category: 'anime',
    catalogSku: `sku-${id}`,
    price,
    quantity
  });
  const lineaPack = (qty, price, meta = {}) => ({
    id: linea(qty),
    type: 'pack',
    price,
    quantity: 1,
    meta: { items: [{ id: 'anime-1', name: 'Goku', qty }], customCount: 0, ...meta }
  });

  it('parsea la línea y deja afuera todo lo demás', () => {
    expect(packCyberDeLinea('pack:cyber:6cm:30:123')).toEqual({ size: '6cm', qty: 30 });
    expect(packCyberDeLinea('pack:mayorista100:6cm:1')).toBeNull();
    expect(packCyberDeLinea('sticker:anime-1:6cm')).toBeNull();
  });

  it('separa chicos y mayoristas', () => {
    const { chicos, mayoristas } = separarPacks(packs);
    expect(chicos.map((p) => p.qty)).toEqual([10, 15, 20, 25, 30, 40, 50]);
    expect(mayoristas.map((p) => p.qty)).toEqual([100, 200, 300, 500]);
  });

  it('con un pack en el carrito sugiere el siguiente con la diferencia real', () => {
    const s = sugerenciaCyber([lineaPack(20, 11990)], packs);
    expect(s.pack.qty).toBe(25);
    expect(s.diferencia).toBe(1000);
    expect(s.semilla.reemplazar).toEqual([linea(20)]);
    expect(s.semilla.size).toBe('4cm');
  });

  it('con diseños propios no sugiere: se perderían los archivos', () => {
    expect(sugerenciaCyber([lineaPack(20, 11990, { customCount: 2 })], packs)).toBeNull();
  });

  it('el último pack no tiene siguiente', () => {
    expect(sugerenciaCyber([lineaPack(500, 164900)], packs)).toBeNull();
  });

  it('con 7 calcos de 4 cm, el pack de 10 es más barato y lo dice', () => {
    const s = sugerenciaCyber([sticker('a', '4cm', 4), sticker('b', '4cm', 3)], packs);
    expect(s.pack.qty).toBe(10);
    expect(s.diferencia).toBe(9990 - 7 * 1600);
    expect(s.diferencia).toBeLessThan(0);
    expect(s.semilla.size).toBe('4cm');
    expect(s.semilla.items).toHaveLength(2);
    expect(s.semilla.reemplazar).toHaveLength(2);
  });

  it('con 2 calcos, muestra cuánto más sale el pack', () => {
    const s = sugerenciaCyber([sticker('a', '6cm', 2)], packs);
    expect(s.diferencia).toBe(9990 - 4200);
  });

  it('el 9 cm queda afuera y con tamaños mezclados siembra el que más pesa', () => {
    expect(sugerenciaCyber([sticker('a', '9cm', 3)], packs)).toBeNull();
    const s = sugerenciaCyber([sticker('a', '4cm', 1), sticker('b', '6cm', 3)], packs);
    expect(s.semilla.size).toBe('6cm');
    expect(s.semilla.reemplazar).toEqual(['sticker:b:6cm']);
  });

  it('sin packs vigentes no sugiere nada', () => {
    expect(sugerenciaCyber([sticker('a', '4cm', 3)], [])).toBeNull();
  });
});
