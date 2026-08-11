/**
 * Entrega de archivos imprimibles — spec 002.
 *
 * PRIMER archivo de tests de una Netlify Function del repo: hasta acá lo único
 * cubierto del servidor era `validateAndPriceOrder`, y de rebote desde los tests
 * de precios del frontend.
 *
 * Vive en `frontend/src/lib/` porque es donde corre Vitest, y se importa el
 * servidor con la misma ruta relativa que ya usa `promoPricing.test.js`.
 *
 * Alcance: las funciones PURAS (token y decisiones). El endpoint en sí hace red
 * (Blobs + Resend) y se verifica a mano — ver `acceptance.md` §3.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  tokenEntrega,
  tokenEntregaValido,
  linkEntrega,
  tieneArchivosDigitales,
  needsManualDelivery,
  digitalDeliveries,
  linkEnvVar
} from '../../../netlify/functions/lib/digital.js';

const SECRETO = 'secreto-de-prueba-no-usar-en-produccion';
const ORDER = 'EPI-1754920000000-a3f9x';

const pedidoDigital = {
  items: [{ id: 'digital:pack-stickers', title: 'Pack de stickers imprimibles', quantity: 1 }]
};
const pedidoFisico = {
  items: [{ id: 'sticker:argentina-72:6cm', title: 'Argentina #72', quantity: 2 }]
};
const pedidoMixto = { items: [...pedidoDigital.items, ...pedidoFisico.items] };

// Las env vars son globales del proceso: se limpian para no contaminar tests.
const ENV_LINK = linkEnvVar('pack-stickers');
afterEach(() => {
  delete process.env[ENV_LINK];
  delete process.env.DIGITAL_DELIVERY_SECRET;
});

describe('token de entrega (spec 002)', () => {
  it('T-1 · es determinista para el mismo pedido y secreto', () => {
    expect(tokenEntrega(ORDER, SECRETO)).toBe(tokenEntrega(ORDER, SECRETO));
    expect(tokenEntrega(ORDER, SECRETO)).toHaveLength(32);
    expect(tokenEntregaValido(ORDER, tokenEntrega(ORDER, SECRETO), SECRETO)).toBe(true);
  });

  it('T-2 · el token de OTRO pedido no valida', () => {
    const ajeno = tokenEntrega('EPI-9999999999999-zzzzz', SECRETO);
    expect(tokenEntregaValido(ORDER, ajeno, SECRETO)).toBe(false);
  });

  it('T-2b · con otro secreto no valida', () => {
    const otro = tokenEntrega(ORDER, 'otro-secreto');
    expect(tokenEntregaValido(ORDER, otro, SECRETO)).toBe(false);
  });

  it('T-3 · tokens malformados no validan y no explotan', () => {
    const bueno = tokenEntrega(ORDER, SECRETO);
    for (const malo of ['', null, undefined, 'x', bueno.slice(0, 31), bueno + 'a', bueno.toUpperCase()]) {
      expect(tokenEntregaValido(ORDER, malo, SECRETO)).toBe(false);
    }
    // Un carácter cambiado: mismo largo, distinto contenido.
    const alterado = (bueno[0] === 'a' ? 'b' : 'a') + bueno.slice(1);
    expect(tokenEntregaValido(ORDER, alterado, SECRETO)).toBe(false);
  });

  it('T-3b · sin secreto o sin pedido, nada valida', () => {
    expect(tokenEntregaValido(ORDER, tokenEntrega(ORDER, SECRETO), '')).toBe(false);
    expect(tokenEntregaValido('', 'loquesea', SECRETO)).toBe(false);
  });
});

describe('link de entrega (spec 002)', () => {
  it('sin DIGITAL_DELIVERY_SECRET no se arma el link', () => {
    expect(linkEntrega(ORDER, 'https://epicalcos.com')).toBeNull();
  });

  it('con el secreto arma una URL válida y firmada', () => {
    process.env.DIGITAL_DELIVERY_SECRET = SECRETO;
    const url = linkEntrega(ORDER, 'https://epicalcos.com/');
    expect(url).toContain('/api/entregar-digital?o=');
    // La barra final de la base no se duplica.
    expect(url).not.toContain('com//api');

    const q = new URL(url).searchParams;
    expect(q.get('o')).toBe(ORDER);
    expect(tokenEntregaValido(q.get('o'), q.get('t'), SECRETO)).toBe(true);
  });

  it('la URL no lleva PII (RNF-3): ni mail, ni nombre, ni teléfono', () => {
    process.env.DIGITAL_DELIVERY_SECRET = SECRETO;
    const url = linkEntrega(ORDER, 'https://epicalcos.com');
    expect(url).not.toMatch(/@/);
    expect(url.toLowerCase()).not.toContain('mail');
  });
});

describe('a qué pedidos aplica la entrega (spec 002)', () => {
  it('T-4 · sin la env var del link, la entrega queda en null', () => {
    const [entrega] = digitalDeliveries(pedidoDigital);
    expect(entrega.url).toBeNull();
    expect(entrega.envVar).toBe('DIGITAL_LINK_PACK_STICKERS');
  });

  it('T-4b · con la env var cargada, aparece el link', () => {
    process.env[ENV_LINK] = 'https://drive.google.com/algo';
    expect(digitalDeliveries(pedidoDigital)[0].url).toBe('https://drive.google.com/algo');
  });

  it('T-4c · una env var que no es http(s) se ignora', () => {
    // Una variable mal cargada no puede terminar en un href raro dentro del
    // mail de un cliente.
    process.env[ENV_LINK] = 'javascript:alert(1)';
    expect(digitalDeliveries(pedidoDigital)[0].url).toBeNull();
  });

  it('T-5 · needsManualDelivery es true sin link y false con link', () => {
    expect(needsManualDelivery(pedidoDigital)).toBe(true);
    process.env[ENV_LINK] = 'https://drive.google.com/algo';
    expect(needsManualDelivery(pedidoDigital)).toBe(false);
  });

  it('T-6 · un pedido SIN líneas digitales no dispara nada', () => {
    expect(tieneArchivosDigitales(pedidoFisico)).toBe(false);
    expect(needsManualDelivery(pedidoFisico)).toBe(false);
    expect(digitalDeliveries(pedidoFisico)).toEqual([]);
  });

  it('T-6b · un pedido MIXTO (digital + físico) sí cuenta como digital', () => {
    expect(tieneArchivosDigitales(pedidoMixto)).toBe(true);
    expect(digitalDeliveries(pedidoMixto)).toHaveLength(1);
  });

  it('T-6c · un pedido vacío o roto no explota', () => {
    for (const raro of [{}, { items: null }, { items: [] }, null, undefined]) {
      expect(tieneArchivosDigitales(raro)).toBe(false);
      expect(needsManualDelivery(raro)).toBe(false);
    }
  });

  /**
   * T-7 — RF-9: la lógica no puede nombrar `pack-stickers`. Un pack digital
   * futuro tiene que funcionar sin tocar nada de esto.
   */
  it('T-7 · sirve para cualquier pack digital, no solo el de stickers', () => {
    const otroPack = { items: [{ id: 'digital:pack-navidad', title: 'Pack Navidad', quantity: 1 }] };
    expect(tieneArchivosDigitales(otroPack)).toBe(true);
    const [entrega] = digitalDeliveries(otroPack);
    expect(entrega.envVar).toBe('DIGITAL_LINK_PACK_NAVIDAD');

    process.env.DIGITAL_LINK_PACK_NAVIDAD = 'https://drive.google.com/navidad';
    expect(digitalDeliveries(otroPack)[0].url).toBe('https://drive.google.com/navidad');
    delete process.env.DIGITAL_LINK_PACK_NAVIDAD;
  });
});

/**
 * ─── El endpoint /api/entregar-digital ────────────────────────────────────────
 *
 * Se mockean Blobs (orderStore) y el envío de mails (notify) para poder ejercitar
 * el cableado del handler sin red. Lo que se prueba acá es la SECUENCIA de
 * decisiones; el token y los predicados ya están cubiertos arriba.
 */
import { vi } from 'vitest';

const F = '../../../netlify/functions/';

vi.mock('../../../netlify/functions/lib/orderStore.js', () => ({
  getOrder: vi.fn(),
  markDigitalDelivered: vi.fn(async () => true)
}));
vi.mock('../../../netlify/functions/lib/notify.js', () => ({
  buildOrderView: (o) => ({
    orderId: o.orderId,
    email: o.payer?.email,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.status,
    items: o.items
  }),
  sendCustomerEmail: vi.fn(async () => ({ sent: true }))
}));

const { getOrder, markDigitalDelivered } = await import(F + 'lib/orderStore.js');
const { sendCustomerEmail } = await import(F + 'lib/notify.js');
const { handler } = await import(F + 'entregar-digital.js');

const pedidoGuardado = {
  orderId: ORDER,
  paymentMethod: 'transferencia',
  status: 'pendiente_transferencia',
  payer: { email: 'ana@example.com', name: 'Ana' },
  items: [{ id: 'digital:pack-stickers', title: 'Pack de stickers imprimibles', quantity: 1 }]
};

const llamar = () =>
  handler({
    httpMethod: 'GET',
    queryStringParameters: { o: ORDER, t: tokenEntrega(ORDER, SECRETO) }
  });

describe('endpoint /api/entregar-digital (spec 002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DIGITAL_DELIVERY_SECRET = SECRETO;
  });

  it('AC-11 · SIN el link configurado responde 409 y NO manda ningún mail', () => {
    getOrder.mockResolvedValue(pedidoGuardado);
    return llamar().then((res) => {
      expect(res.statusCode).toBe(409);
      expect(res.body).toContain('DIGITAL_LINK_PACK_STICKERS');
      // Lo que más importa: el cliente no recibe un mail vacío.
      expect(sendCustomerEmail).not.toHaveBeenCalled();
      expect(markDigitalDelivered).not.toHaveBeenCalled();
    });
  });

  it('con el link configurado entrega, marca el pedido y responde 200', async () => {
    process.env[ENV_LINK] = 'https://drive.google.com/pack';
    getOrder.mockResolvedValue(pedidoGuardado);

    const res = await llamar();
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('ana@example.com');
    expect(sendCustomerEmail).toHaveBeenCalledTimes(1);
    expect(markDigitalDelivered).toHaveBeenCalledWith(ORDER, expect.objectContaining({ email: 'ana@example.com' }));
  });

  it('el mail se arma con el pago CONFIRMADO (si no, diría "cuando confirmemos")', async () => {
    process.env[ENV_LINK] = 'https://drive.google.com/pack';
    getOrder.mockResolvedValue(pedidoGuardado);

    await llamar();
    expect(sendCustomerEmail.mock.calls[0][0].paymentStatus).toBe('approved');
  });

  it('si Resend falla: 502 y el pedido NO queda marcado como entregado', async () => {
    process.env[ENV_LINK] = 'https://drive.google.com/pack';
    getOrder.mockResolvedValue(pedidoGuardado);
    sendCustomerEmail.mockResolvedValueOnce({ sent: false, reason: 'resend_500' });

    const res = await llamar();
    expect(res.statusCode).toBe(502);
    expect(markDigitalDelivered).not.toHaveBeenCalled();
  });

  it('un pedido sin líneas digitales no entrega nada', async () => {
    process.env[ENV_LINK] = 'https://drive.google.com/pack';
    getOrder.mockResolvedValue({ ...pedidoGuardado, items: [{ id: 'sticker:anime-1:6cm', title: 'x', quantity: 1 }] });

    const res = await llamar();
    expect(res.statusCode).toBe(400);
    expect(sendCustomerEmail).not.toHaveBeenCalled();
  });

  it('se puede reenviar: dos llamadas seguidas entregan las dos veces (RF-5)', async () => {
    process.env[ENV_LINK] = 'https://drive.google.com/pack';
    getOrder.mockResolvedValue(pedidoGuardado);

    expect((await llamar()).statusCode).toBe(200);
    expect((await llamar()).statusCode).toBe(200);
    expect(sendCustomerEmail).toHaveBeenCalledTimes(2);
  });
});
