import { describe, it, expect } from 'vitest';
import { calcosDelPedido, calcosDeLinea, esPedidoVolumen } from './plazoProduccion.js';
import * as server from '../../../netlify/functions/lib/plazoProduccion.js';
import { customerTimeline } from '../../../netlify/functions/lib/notify.js';
import { shipping } from '../config/site.js';
import { NEGOCIO, PROMO_MAYORISTA_100 } from '../config/pricing.js';

/**
 * Plazo de producción de los pedidos de 100+ (spec 031, RF-P3). El sitio
 * (checkout, carrito) y el mail al cliente tienen que decir lo mismo: los dos
 * cuentan las calcos desde el id de cada línea, cada uno con su copia.
 */
const L = (id, quantity = 1) => ({ id, quantity });

const CASOS = [
  [[L('sticker:goku:6cm', 30)], 30],
  [[L('sticker:goku:6cm', 99)], 99],
  [[L('sticker:goku:6cm', 60), L('custom:6cm:silueta:vinilo-blanco:f1', 40)], 100],
  [[L('negocio:1')], NEGOCIO.qty],
  [[L('negocio:dtf-uv:1')], NEGOCIO.qty],
  [[L('negocio:vinilo-holografico:4cm:7'), L('fixed:material-holografico:7')], NEGOCIO.qty],
  [[L('pack:mayorista100:6cm:1', 2)], 2 * PROMO_MAYORISTA_100.qty],
  [[L('pack:mayorista:9cm:1', 150)], 150],
  [[L('pack:personalizados:6cm:1', 10)], 10],
  [[L('volumen:6cm:vinilo-blanco:250:1')], 250],
  [[L('fixed:polaroid-x10-5x8', 5), L('fixed:tatuajes-hoja', 3), L('digital:pack-stickers')], 0],
  [[L('sticker:goku:6cm', 99), L('shipping', 1)], 99]
];

describe('cuántas calcos trae un pedido', () => {
  it.each(CASOS)('%j → %i', (items, esperado) => {
    expect(calcosDelPedido(items)).toBe(esperado);
  });

  it('el servidor cuenta igual que el sitio, línea por línea', () => {
    for (const [items] of CASOS) {
      for (const linea of items) expect(server.calcosDeLinea(linea), linea.id).toBe(calcosDeLinea(linea));
    }
  });

  it('el plazo y el umbral están espejados', () => {
    expect(server.PRODUCCION_VOLUMEN).toBe(shipping.produccionVolumen);
    expect(server.PRODUCCION_VOLUMEN_DESDE).toBe(shipping.produccionVolumenDesde);
    expect(shipping.produccionVolumen).toBe('3 a 5 días hábiles');
    expect(shipping.produccionVolumenDesde).toBe(100);
  });

  it('99 calcos es pedido chico; 100 ya es pedido grande', () => {
    expect(esPedidoVolumen([L('sticker:goku:6cm', 99)])).toBe(false);
    expect(esPedidoVolumen([L('sticker:goku:6cm', 100)])).toBe(true);
    expect(server.esPedidoVolumen([L('sticker:goku:6cm', 99)])).toBe(false);
    expect(server.esPedidoVolumen([L('sticker:goku:6cm', 100)])).toBe(true);
  });

  it('tolera datos rotos sin tirar', () => {
    expect(calcosDelPedido([{}, { id: null }, { id: 'sticker:x:6cm', quantity: 'abc' }])).toBe(0);
    expect(server.calcosDelPedido(undefined)).toBe(0);
  });
});

describe('el mail al cliente (customerTimeline)', () => {
  const envio = { shippingMethod: 'Envío al resto del país' };
  const retiro = { shippingMethod: 'Retiro en Rosario' };

  it('con 100+ promete 3 a 5 días hábiles de producción, sin inventar un total de entrega', () => {
    const t = customerTimeline({ ...envio, items: [L('negocio:1')] });
    expect(t).toContain(shipping.produccionVolumen);
    expect(t).not.toMatch(/5 a 7|2 a 3/);
    expect(customerTimeline({ ...retiro, items: [L('sticker:goku:6cm', 120)] })).toContain(shipping.produccionVolumen);
  });

  it('con menos de 100 sigue igual que antes', () => {
    expect(customerTimeline({ ...envio, items: [L('sticker:goku:6cm', 3)] })).toBe(
      'Tu pedido llega en 5 a 7 días hábiles. Te avisamos cuando lo despachemos.'
    );
    expect(customerTimeline({ ...retiro, items: [L('sticker:goku:6cm', 3)] })).toBe(
      'Tu pedido va a estar listo en 2 a 3 días hábiles. Te escribimos por WhatsApp para coordinar el retiro.'
    );
    // Un pedido sin items (vista armada sin pedido ni pago) no rompe.
    expect(customerTimeline({ ...envio })).toMatch(/5 a 7 días hábiles/);
  });
});
