import { describe, it, expect, vi, afterEach } from 'vitest';
// Frontend: lo que ve el cliente en el resumen del checkout.
import { calculateShipping as feShipping, shipping } from '../config/site.js';
// Backend: el que se cobra de verdad (ignora el shipping.cost del cliente).
import {
  calculateShipping as beShipping,
  FREE_SHIPPING_THRESHOLD_ROSARIO as BE_UMBRAL_ROSARIO,
  FREE_SHIPPING_THRESHOLD_NATIONAL as BE_UMBRAL_NACIONAL,
  validateAndPriceOrder,
  MAYORISTA100_PRICE,
  SIZE_PRICES,
  TRANSFER_DISCOUNT
} from '../../../netlify/functions/lib/pricing.js';

const UMBRAL_ROSARIO = shipping.freeShippingThresholdRosario;
const UMBRAL_NACIONAL = shipping.freeShippingThresholdNational;

const rosario = { city: 'Rosario', province: 'Santa Fe' };
const funes = { city: 'Funes', province: 'Santa Fe' };
const interior = { city: 'Córdoba', province: 'Córdoba' };

/** Ambas puntas tienen que devolver lo mismo, siempre. */
const both = (args) => {
  const fe = feShipping(args);
  const be = beShipping(args);
  expect(fe).toBe(be);
  return fe;
};

describe('costo de envío — paridad frontend ↔ backend', () => {
  it('retiro siempre gratis', () => {
    expect(both({ method: 'retiro', subtotal: 0, ...interior })).toBe(0);
  });

  it('Rosario: se cobra bajo el umbral y es gratis desde el umbral', () => {
    expect(both({ method: 'envio', subtotal: UMBRAL_ROSARIO - 1, ...rosario })).toBe(shipping.costRosario);
    expect(both({ method: 'envio', subtotal: UMBRAL_ROSARIO, ...rosario })).toBe(0);
  });

  it('resto del país: gratis desde el umbral nacional (ciudades próximas e interior)', () => {
    // Debajo del umbral, cada zona paga su costo.
    expect(both({ method: 'envio', subtotal: UMBRAL_NACIONAL - 1, ...funes })).toBe(shipping.costNearby);
    expect(both({ method: 'envio', subtotal: UMBRAL_NACIONAL - 1, ...interior })).toBe(shipping.costInterior);
    // Desde el umbral nacional, gratis a todo el país.
    expect(both({ method: 'envio', subtotal: UMBRAL_NACIONAL, ...funes })).toBe(0);
    expect(both({ method: 'envio', subtotal: UMBRAL_NACIONAL, ...interior })).toBe(0);
    expect(both({ method: 'envio', subtotal: UMBRAL_NACIONAL * 2, ...interior })).toBe(0);
  });

  it('el umbral nacional NO le sube el piso a Rosario', () => {
    // Entre los dos umbrales, Rosario ya viaja gratis.
    const entreLosDos = Math.floor((UMBRAL_ROSARIO + UMBRAL_NACIONAL) / 2);
    expect(entreLosDos).toBeGreaterThanOrEqual(UMBRAL_ROSARIO);
    expect(entreLosDos).toBeLessThan(UMBRAL_NACIONAL);
    expect(both({ method: 'envio', subtotal: entreLosDos, ...rosario })).toBe(0);
  });

  it('los umbrales del config están espejados frontend ↔ backend', () => {
    expect(UMBRAL_ROSARIO).toBe(BE_UMBRAL_ROSARIO);
    expect(UMBRAL_NACIONAL).toBe(BE_UMBRAL_NACIONAL);
    // El de Rosario tiene que ser el más bajo: si se invierten, `calculateShipping`
    // le cobra el envío a Rosario en el tramo en que el interior ya viaja gratis.
    expect(UMBRAL_ROSARIO).toBeLessThan(UMBRAL_NACIONAL);
  });

  it('los umbrales son los que decidió el negocio', () => {
    // Este test es el candado: los umbrales son una decisión comercial, no un
    // número que se toca de paso. Si alguien los cambia, tiene que cambiarlos
    // acá también — y ahí se entera de que está moviendo la oferta.
    expect(UMBRAL_ROSARIO).toBe(35000);
    expect(UMBRAL_NACIONAL).toBe(50000);
  });
});

describe('ninguna promo regala el envío: manda el umbral', () => {
  afterEach(() => vi.useRealTimers());

  /**
   * El pack x100 de la promo solo existe mientras la promo esté viva.
   * ⚠️ Spec 017: la mayorista arranca el 7/9/2026 y ya no vence, así que la
   * fecha se movió de agosto a septiembre. Antes del 7/9 la promo no existe y
   * el pack se rechaza por línea inválida, no por envío.
   */
  const conLaPromoViva = () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-10T12:00:00-03:00'));
  };
  const datos = (dest) => ({ name: 'A', address: 'B', zip: '1000', ...dest });

  /**
   * ⚠️ Desde la spec 029 (1/10/2026) la promo cuesta $52.999 y, pagada con
   * Mercado Pago, CRUZA el umbral nacional ($50.000): viaja gratis a todo el
   * país porque lo dice el umbral (ver el test de abajo). Pagada por
   * transferencia queda en $42.399 y no lo cruza — por eso los casos que
   * prueban "la promo no regala el envío" van por transferencia: es la única
   * forma de que la promo siga por debajo del umbral.
   */
  const PROMO_TRANSFERENCIA = Math.round(MAYORISTA100_PRICE * (1 - TRANSFER_DISCOUNT));

  it('REGRESIÓN: la promo de 100 calcos a precio fijo PAGA envío a Buenos Aires', () => {
    // El caso real que se cobró mal: $39.999 no llegaba al umbral nacional
    // ($50.000), así que el pedido pagaba los $8.500 de Correo Argentino. Antes
    // viajaba gratis porque la línea `pack:mayorista100` traía el envío puesto.
    conLaPromoViva();
    expect(PROMO_TRANSFERENCIA).toBeLessThan(UMBRAL_NACIONAL);
    const pedido = validateAndPriceOrder({
      items: [{ id: 'pack:mayorista100:6cm:1', title: 'Pack Mayorista PROMO x100', quantity: 1, unit_price: PROMO_TRANSFERENCIA }],
      shipping: { methodValue: 'envio', ...datos({ city: 'La Plata', province: 'Buenos Aires' }) },
      paymentMethod: 'transferencia'
    });
    expect(pedido.ok).toBe(true);
    expect(pedido.shippingCost).toBe(shipping.costInterior);
    expect(pedido.itemsTotal + pedido.shippingCost).toBe(PROMO_TRANSFERENCIA + shipping.costInterior);
  });

  it('con Mercado Pago, los $52.999 de la promo cruzan el umbral nacional y viaja gratis (spec 029)', () => {
    // No es la promo regalando el envío: es el umbral. Hasta el 1/10/2026 el
    // precio ($47.999) quedaba abajo y este mismo pedido pagaba $8.500.
    conLaPromoViva();
    expect(MAYORISTA100_PRICE).toBeGreaterThanOrEqual(UMBRAL_NACIONAL);
    const pedido = validateAndPriceOrder({
      items: [{ id: 'pack:mayorista100:6cm:1', title: 'Pack Mayorista PROMO x100', quantity: 1, unit_price: MAYORISTA100_PRICE }],
      shipping: { methodValue: 'envio', ...datos({ city: 'La Plata', province: 'Buenos Aires' }) },
      paymentMethod: 'mercadopago'
    });
    expect(pedido.ok).toBe(true);
    expect(pedido.shippingCost).toBe(0);
  });

  it('la misma promo paga el envío donde no llega al umbral, y solo ahí', () => {
    conLaPromoViva();
    // Desde el 21/8/2026 los umbrales son $35.000 / $50.000, así que la promo
    // pagada por transferencia ($42.399) SÍ cruza el de Rosario y no el del resto
    // del país. El mismo pack viaja gratis en una zona y paga en otra, y lo
    // decide el umbral y no la promo — que es justo lo que este bloque existe
    // para probar.
    const esperado = [
      [rosario, 0],
      [funes, shipping.costNearby],
      [interior, shipping.costInterior]
    ];
    for (const [dest, costo] of esperado) {
      const pedido = validateAndPriceOrder({
        items: [{ id: 'pack:mayorista100:4cm:1', title: 'Pack Mayorista PROMO x100', quantity: 1, unit_price: PROMO_TRANSFERENCIA }],
        shipping: { methodValue: 'envio', ...datos(dest) },
        paymentMethod: 'transferencia'
      });
      expect(pedido.ok).toBe(true);
      expect(pedido.shippingCost).toBe(costo);
    }
  });

  it('el pack mayorista sí viaja gratis cuando su PRECIO cruza el umbral', () => {
    // Control de que el fix no apagó el envío gratis legítimo: 100 calcos de
    // 6 cm al 50 % off quedan arriba del umbral nacional ($105.000 desde la spec 029).
    const unit = Math.round(SIZE_PRICES['6cm'] * 0.5);
    const pedido = validateAndPriceOrder({
      items: [{ id: 'pack:mayorista:6cm:1', title: 'Pack Mayorista x100', quantity: 100, unit_price: unit }],
      shipping: { methodValue: 'envio', ...datos(interior) },
      paymentMethod: 'mercadopago'
    });
    expect(pedido.ok).toBe(true);
    expect(pedido.itemsTotal).toBe(unit * 100);
    expect(pedido.itemsTotal).toBeGreaterThanOrEqual(UMBRAL_NACIONAL);
    expect(pedido.shippingCost).toBe(0);
  });

  it('el flag `envioGratis` del payload no compra nada', () => {
    // Defensa contra un carrito viejo de localStorage (traían el flag) y contra
    // un payload editado a mano: el servidor no lo lee.
    conLaPromoViva();
    const pedido = validateAndPriceOrder({
      items: [
        { id: 'pack:mayorista100:6cm:1', title: 'Pack Mayorista PROMO x100', quantity: 1, unit_price: PROMO_TRANSFERENCIA, envioGratis: true }
      ],
      shipping: { methodValue: 'envio', cost: 0, envioGratis: true, ...datos(interior) },
      paymentMethod: 'transferencia'
    });
    expect(pedido.ok).toBe(true);
    expect(pedido.shippingCost).toBe(shipping.costInterior);
  });

  it('calculateShipping no acepta un atajo al umbral, ni en el front ni en el server', () => {
    // Si alguien repone un parámetro tipo `freeShipping`, este test lo caza:
    // pasarlo tiene que ser irrelevante para las dos puntas.
    //
    // El subtotal va por debajo del umbral MÁS BAJO (Rosario, $35.000): si
    // estuviera arriba, el 0 podría venir del umbral y el test pasaría sin
    // probar nada. Se deriva del config para que mover el umbral no lo afloje.
    const bajoTodoUmbral = UMBRAL_ROSARIO - 1;
    for (const dest of [rosario, funes, interior]) {
      expect(both({ method: 'envio', subtotal: bajoTodoUmbral, freeShipping: true, ...dest })).not.toBe(0);
    }
  });
});
