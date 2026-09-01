/**
 * buildOrderView — el armado del aviso de pedido (netlify/functions/lib/notify.js).
 *
 * Cubre el caso que se llevó puesto un pedido real: con Netlify Blobs caído,
 * `getOrder` devuelve null y el webhook igual tiene que poder decir QUÉ se
 * vendió y escribirle AL MAIL QUE DEJÓ EL CLIENTE. Los dos datos estaban en el
 * objeto `payment`; el armado no los miraba.
 *
 * Vive acá, como entregaDigital.test.js, porque es donde corre Vitest.
 */
import { describe, it, expect } from 'vitest';
import { buildOrderView } from '../../../netlify/functions/lib/notify.js';

/**
 * Pago aprobado tal como lo devuelve Mercado Pago, calcado del pedido
 * EPI-1788120580793-yir3k (30/8/2026): el comprador cargó su mail en el
 * checkout y pagó con la cuenta de MP de otra persona. Los números vienen como
 * strings, igual que en la API real.
 */
const pagoMP = {
  id: 175451986111,
  status: 'approved',
  external_reference: 'EPI-1788120580793-yir3k',
  transaction_amount: 20100,
  payer: { email: 'lolaecheverria11@gmail.com', first_name: null },
  metadata: {
    buyer_name: 'Marcelo Echeverría',
    buyer_email: 'marcelo@echeverriamassoud.com.ar',
    buyer_phone: '3416024333',
    shipping_method: 'Envío a Rosario',
    shipping_cost: 4500,
    shipping_city: 'Rosario',
    shipping_address: 'colon 2261'
  },
  additional_info: {
    items: [
      { id: 'sticker:disney-3:6cm', title: 'Disney #3 · 6 cm', quantity: '1', unit_price: '1600' },
      { id: 'sticker:viajes-4:4cm', title: 'Viajes #4 · 4 cm', quantity: '2', unit_price: '1200' },
      { id: 'shipping', title: 'Envío — Envío a Rosario', quantity: '1', unit_price: '4500' }
    ]
  }
};

describe('buildOrderView · el detalle del pedido nunca queda vacío', () => {
  it('sin el pedido guardado, arma el detalle con los items del pago', () => {
    const v = buildOrderView(null, pagoMP);

    expect(v.items).toHaveLength(3);
    expect(v.items[0]).toMatchObject({ title: 'Disney #3 · 6 cm', quantity: 1, unit_price: 1600 });
  });

  it('normaliza a número las cantidades y precios que MP manda como string', () => {
    const v = buildOrderView(null, pagoMP);

    for (const i of v.items) {
      expect(typeof i.quantity).toBe('number');
      expect(typeof i.unit_price).toBe('number');
    }
  });

  it('itemsTotal suma los productos y deja afuera la línea de envío', () => {
    const v = buildOrderView(null, pagoMP);

    // 1600 + (1200 × 2) = 4000. Los 4500 del envío no son mercadería.
    expect(v.itemsTotal).toBe(4000);
  });

  it('el pedido guardado tiene prioridad sobre los items del pago', () => {
    const guardado = {
      orderId: 'EPI-1',
      items: [{ id: 'sticker:anime-1:6cm', title: 'Anime #1 · 6 cm', quantity: 3, unit_price: 1600 }],
      itemsTotal: 4800
    };

    const v = buildOrderView(guardado, pagoMP);

    expect(v.items).toHaveLength(1);
    expect(v.items[0].title).toBe('Anime #1 · 6 cm');
    expect(v.itemsTotal).toBe(4800);
  });

  it('un pedido guardado con items vacíos igual se completa con los del pago', () => {
    const v = buildOrderView({ orderId: 'EPI-1', items: [] }, pagoMP);

    expect(v.items).toHaveLength(3);
  });

  it('una transferencia (sin pago de MP) sigue mostrando lo que guardó el checkout', () => {
    const guardado = {
      orderId: 'EPI-2',
      paymentMethod: 'transferencia',
      status: 'pendiente_transferencia',
      items: [{ id: 'custom:4cm:silueta:foto.jpg', title: 'Personalizado · 4 cm', quantity: 1, unit_price: 800 }],
      itemsTotal: 800,
      total: 5300,
      payer: { email: 'abs@example.com' }
    };

    const v = buildOrderView(guardado, null);

    expect(v.items).toHaveLength(1);
    expect(v.itemsTotal).toBe(800);
    expect(v.total).toBe(5300);
    expect(v.email).toBe('abs@example.com');
  });

  it('sin pedido guardado ni items en el pago, el detalle queda vacío pero no rompe', () => {
    const v = buildOrderView(null, { id: 1, status: 'approved', transaction_amount: 900 });

    expect(v.items).toEqual([]);
    expect(v.itemsTotal).toBeUndefined();
    expect(v.total).toBe(900);
  });
});

describe('buildOrderView · a qué mail se le confirma', () => {
  it('le escribe al mail del checkout, no al de la cuenta con la que pagó', () => {
    const v = buildOrderView(null, pagoMP);

    expect(v.email).toBe('marcelo@echeverriamassoud.com.ar');
    expect(v.email).not.toBe('lolaecheverria11@gmail.com');
  });

  it('el mail del pedido guardado gana sobre los dos del pago', () => {
    const v = buildOrderView({ payer: { email: 'delformulario@example.com' } }, pagoMP);

    expect(v.email).toBe('delformulario@example.com');
  });

  it('si el checkout no dejó mail, cae al de la cuenta de MP antes que rendirse', () => {
    const sinMetaEmail = { ...pagoMP, metadata: { ...pagoMP.metadata, buyer_email: undefined } };

    expect(buildOrderView(null, sinMetaEmail).email).toBe('lolaecheverria11@gmail.com');
  });

  it('sin ningún mail disponible devuelve el guion, que es lo que corta el envío al cliente', () => {
    const v = buildOrderView(null, { id: 1, status: 'approved', metadata: {}, payer: {} });

    expect(v.email).toBe('—');
  });
});
