/**
 * El regalo de EPICYBER por dejar el mail en el popup (spec 037).
 *
 * Corre el recorrido real contra los handlers: anotar el mail, comprar por
 * transferencia y aprobar un pago de Mercado Pago. `fetch` se rutea por dominio, como
 * en webhookMercadoPago.test.js, y Blobs es un store en memoria: acá importa qué pasa
 * con el regalo cuando se reintenta, se cuelga o se cae.
 *
 * Solo se falsea `Date`: los límites de tiempo de Blobs y los reintentos de Resend
 * usan timers de verdad.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POPUP_CYBER } from '../config/popup.js';
import { CYBER_END_MS, CYBER_START_MS, CYBER, priceForSize, round, setCyberPreview } from '../config/pricing.js';
import { RANGO_CORTO, textosPopupCyber } from '../config/epicyber.js';
import { popupCyberPermitido, popupCyberVigente, puedeAbrirCyber } from './popupReglas.js';

const blobs = vi.hoisted(() => ({ stores: new Map(), caido: false, cuelga: false }));

vi.mock('@netlify/blobs', () => ({
  getStore: (arg) => {
    const nombre = typeof arg === 'string' ? arg : arg.name;
    if (!blobs.stores.has(nombre)) blobs.stores.set(nombre, new Map());
    const datos = blobs.stores.get(nombre);
    const chequear = async () => {
      // Solo el store del regalo: `saveOrder` no tiene tope propio y, colgado, frena el
      // handler después del mail (hallazgo de la spec 037).
      if (blobs.cuelga && nombre === 'cyber-regalo') await new Promise(() => {});
      if (blobs.caido) throw new Error('Blobs caído');
    };
    return {
      async get(key) {
        await chequear();
        return datos.get(key) ?? null;
      },
      async setJSON(key, valor) {
        await chequear();
        datos.set(key, valor);
      },
      async delete(key) {
        await chequear();
        datos.delete(key);
      }
    };
  }
}));

const { REGALO_CYBER, evaluarRegalo, notaRegalo, rangoCompra, reclamarRegalo, registrarRegalo, sumarNota } =
  await import('../../../netlify/functions/lib/regaloCyber.js');
const { saveOrder } = await import('../../../netlify/functions/lib/orderStore.js');
const { handler: captureLead } = await import('../../../netlify/functions/capture-lead.js');
const { handler: crearTransferencia } = await import('../../../netlify/functions/create-order-transfer.js');
const { handler: webhook } = await import('../../../netlify/functions/mercadopago-webhook.js');

const MAIL = 'ana@example.com';
const EN_FECHA = '2026-11-03T12:00:00-03:00';
const X10 = 9990;
const x10Transferencia = round(X10 * 0.9);

const respuesta = (body) => ({
  ok: true,
  status: 200,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
  text: async () => JSON.stringify(body)
});

/** `fetch` por dominio. `pago` es lo que devuelve Mercado Pago. */
const stubFetch = (pago) =>
  vi.fn(async (url) => {
    const u = String(url);
    if (u.includes('api.mercadopago.com')) return respuesta(pago);
    if (u.includes('facebook.com')) return respuesta({ events_received: 1 });
    return respuesta({ id: 'resend-1' });
  });

const mails = () =>
  fetch.mock.calls
    .filter(([url]) => String(url).includes('api.resend.com'))
    .map(([, opciones]) => JSON.parse(opciones.body));
const interno = () => mails().find((m) => m.subject.includes('Nuevo pedido'));
const cliente = () => mails().find((m) => m.to.includes(MAIL) && !m.subject.includes('Nuevo pedido'));

const lead = (email, oferta = 'cyber') => ({
  httpMethod: 'POST',
  headers: { origin: 'https://epicalcos.com' },
  body: JSON.stringify({ email, ...(oferta ? { oferta } : {}) })
});

const pedido = ({ email = MAIL, id = 'pack:cyber:4cm:10:1', unit_price = x10Transferencia } = {}) => ({
  httpMethod: 'POST',
  headers: { origin: 'https://epicalcos.com' },
  body: JSON.stringify({
    items: [{ id, title: 'Pack Cyber x10 · 4 cm', quantity: 1, unit_price }],
    payer: { name: 'Ana', email, phone: '3416806675', address: 'Córdoba 1234' },
    shipping: { methodValue: 'retiro' }
  })
});

const enFecha = (fecha) => vi.setSystemTime(new Date(fecha));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  enFecha(EN_FECHA);
  blobs.stores.clear();
  blobs.caido = false;
  blobs.cuelga = false;
  REGALO_CYBER.activo = true;
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token';
  process.env.RESEND_API_KEY = 're_test';
  process.env.NOTIFY_EMAIL_FROM = 'EPICALCOS <hola@epicalcos.com>';
  process.env.NOTIFY_EMAIL_TO = 'epicalcos@gmail.com';
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', stubFetch());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setCyberPreview(false);
  POPUP_CYBER.activo = estadoOriginal.popup;
  REGALO_CYBER.activo = estadoOriginal.regalo;
});

const estadoOriginal = { popup: POPUP_CYBER.activo, regalo: REGALO_CYBER.activo };

describe('espejo y textos', () => {
  it('el popup promete lo que el servidor cumple', () => {
    expect(POPUP_CYBER.activo).toBe(estadoOriginal.regalo);
    expect(POPUP_CYBER.regalo).toEqual({
      qty: REGALO_CYBER.qty,
      tamano: REGALO_CYBER.tamano,
      minimoCompra: REGALO_CYBER.minimoCompra
    });
  });

  it('las fechas son las de la campaña', () => {
    expect(RANGO_CORTO).toBe('del 2 al 8/11');
    expect(rangoCompra()).toBe('del 2 al 8 de noviembre');
  });

  it('el popup dice el regalo, las fechas y el mínimo antes de pedir el mail', () => {
    const t = textosPopupCyber(POPUP_CYBER.regalo);
    expect(t.subtitulo).toContain('del 2 al 8/11');
    expect(t.bajada).toContain('10 calcos');
    expect(t.pie).toContain('8.000');
    expect(t.pie).toContain('Un regalo por mail');
  });

  it('el mínimo no deja un pedido a pérdida con el regalo, y cubre un x10 por transferencia', () => {
    const calcos = Math.ceil(REGALO_CYBER.minimoCompra / priceForSize('4cm'));
    const costo = 5000 + 119 * (calcos + REGALO_CYBER.qty);
    expect(REGALO_CYBER.minimoCompra).toBeGreaterThan(costo);
    expect(x10Transferencia).toBeGreaterThanOrEqual(REGALO_CYBER.minimoCompra);
  });
});

describe('cuándo corresponde', () => {
  const base = {
    registro: { email: MAIL },
    orderId: 'EPI-1',
    itemsTotal: 9990,
    items: [{ id: 'pack:cyber:4cm:10:1' }],
    ahora: Date.parse(EN_FECHA)
  };

  it('mail anotado, en fecha y desde el mínimo', () => {
    expect(evaluarRegalo(base)).toEqual({ qty: 10, tamano: '4 cm' });
  });

  it.each([
    ['sin registro', { registro: null }],
    ['abajo del mínimo', { itemsTotal: 7999 }],
    ['antes de la campaña', { ahora: CYBER_START_MS - 1 }],
    ['después de la campaña', { ahora: CYBER_END_MS + 1 }],
    ['solo archivos', { items: [{ id: 'digital:pack-stickers' }] }],
    ['ya usado en otro pedido', { registro: { email: MAIL, orderId: 'EPI-0' } }]
  ])('no corresponde: %s', (_, cambios) => {
    expect(evaluarRegalo({ ...base, ...cambios })).toBeNull();
  });

  it('justo en el mínimo y en los bordes de la ventana, sí', () => {
    expect(evaluarRegalo({ ...base, itemsTotal: REGALO_CYBER.minimoCompra })).not.toBeNull();
    expect(evaluarRegalo({ ...base, ahora: CYBER_START_MS })).not.toBeNull();
    expect(evaluarRegalo({ ...base, ahora: CYBER_END_MS })).not.toBeNull();
  });

  it('un reintento del mismo pedido no lo pierde', () => {
    expect(evaluarRegalo({ ...base, registro: { email: MAIL, orderId: 'EPI-1' } })).not.toBeNull();
  });

  it('apagado no corresponde nunca', () => {
    REGALO_CYBER.activo = false;
    expect(evaluarRegalo(base)).toBeNull();
  });

  it('la nota le dice a Mariano qué hacer, y conserva lo que escribió el cliente', () => {
    expect(notaRegalo({ qty: 10, tamano: '4 cm' })).toContain('sumar 1 pack de 10 calcos sorpresa de 4 cm');
    expect(notaRegalo({ verificar: true })).toContain('SIN VERIFICAR');
    expect(sumarNota('Timbre 2B', { qty: 10, tamano: '4 cm' })).toMatch(/^Timbre 2B \|\| 🎁/);
    expect(sumarNota('Timbre 2B', null)).toBe('Timbre 2B');
  });
});

describe('dejar el mail en el popup', () => {
  it('lo anota, no entrega cupón y le confirma el regalo', async () => {
    const res = await captureLead(lead(MAIL));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true, regalo: true });
    expect(blobs.stores.get('cyber-regalo').get(MAIL)).toMatchObject({ email: MAIL });
    const confirmacion = mails().find((m) => m.to.includes(MAIL));
    expect(confirmacion.subject).toContain('EPICYBER');
    expect(confirmacion.text).toContain('10 calcos sorpresa');
    expect(confirmacion.text).toContain('8.000');
    expect(confirmacion.text).toContain('del 2 al 8 de noviembre');
  });

  it('se puede anotar antes de que arranque la campaña', async () => {
    enFecha('2026-10-31T12:00:00-03:00');
    expect(JSON.parse((await captureLead(lead(MAIL))).body).regalo).toBe(true);
  });

  it('normaliza el mail y anotarse dos veces no reinicia un regalo usado', async () => {
    await registrarRegalo('  ANA@Example.com ');
    const store = blobs.stores.get('cyber-regalo');
    store.set(MAIL, { ...store.get(MAIL), orderId: 'EPI-9' });
    await captureLead(lead(MAIL));
    expect(store.get(MAIL).orderId).toBe('EPI-9');
  });

  it('si no se pudo guardar da error: no confirma lo que después no va a reconocer', async () => {
    blobs.caido = true;
    const res = await captureLead(lead(MAIL));
    expect(res.statusCode).toBe(503);
    expect(mails()).toHaveLength(0);
  });

  it('un Blobs colgado corta rápido en vez de dejar el popup esperando', async () => {
    blobs.cuelga = true;
    const res = await captureLead(lead(MAIL));
    expect(res.statusCode).toBe(503);
  });

  it('vencida o apagada cae al 10 % de siempre', async () => {
    enFecha(CYBER_END_MS + 1);
    expect(JSON.parse((await captureLead(lead(MAIL))).body).code).toBe('EPICA10');
    enFecha(EN_FECHA);
    REGALO_CYBER.activo = false;
    expect(JSON.parse((await captureLead(lead(MAIL))).body).code).toBe('EPICA10');
  });

  it('el popup de siempre no cambia', async () => {
    expect(JSON.parse((await captureLead(lead(MAIL, null))).body).code).toBe('EPICA10');
    expect(blobs.stores.get('cyber-regalo')).toBeUndefined();
  });
});

describe('comprar por transferencia', () => {
  it('el aviso interno y la confirmación dicen el regalo, sin tocar el precio', async () => {
    await registrarRegalo(MAIL);
    const res = await crearTransferencia(pedido());
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).total).toBe(x10Transferencia);
    expect(interno().text).toContain('REGALO EPICYBER: sumar 1 pack de 10 calcos sorpresa');
    expect(cliente().text).toContain('Tu regalo de EPICYBER va con este pedido');
    expect(cliente().html).toContain('Tu regalo de EPICYBER');
  });

  it('reconoce el mail aunque el checkout lo escriba distinto', async () => {
    await registrarRegalo(MAIL);
    await crearTransferencia(pedido({ email: ' Ana@Example.COM ' }));
    expect(interno().text).toContain('REGALO EPICYBER');
  });

  it('una sola vez por mail', async () => {
    await registrarRegalo(MAIL);
    await crearTransferencia(pedido());
    fetch.mockClear();
    await crearTransferencia(pedido({ id: 'pack:cyber:4cm:10:2' }));
    expect(interno().text).not.toContain('REGALO EPICYBER');
  });

  it('un mail que no se anotó no recibe nada', async () => {
    await crearTransferencia(pedido());
    expect(interno().text).not.toContain('REGALO EPICYBER');
    expect(cliente().text).not.toContain('Tu regalo');
  });

  it('abajo del mínimo no consume el regalo y ni consulta la base', async () => {
    await registrarRegalo(MAIL);
    blobs.caido = true; // si leyera, el aviso diría SIN VERIFICAR
    const unit_price = round(priceForSize('6cm') * 0.9);
    await crearTransferencia(pedido({ id: 'sticker:marvel-3:6cm', unit_price }));
    expect(interno().text).not.toContain('REGALO EPICYBER');
    blobs.caido = false;
    expect(blobs.stores.get('cyber-regalo').get(MAIL).orderId).toBeUndefined();
  });

  it('con Blobs caído el pedido entra, Mariano revisa y al cliente no se le promete nada', async () => {
    await registrarRegalo(MAIL);
    blobs.caido = true;
    const res = await crearTransferencia(pedido());
    expect(res.statusCode).toBe(200);
    expect(interno().text).toContain('SIN VERIFICAR');
    expect(cliente().text).not.toContain('Tu regalo');
  });

  it('con Blobs colgado el pedido igual entra', async () => {
    blobs.cuelga = true;
    const res = await crearTransferencia(pedido());
    expect(res.statusCode).toBe(200);
    expect(interno().text).toContain('SIN VERIFICAR');
  });
});

describe('comprar por Mercado Pago', () => {
  const orderId = 'EPI-1793000000000-abcde';
  const pago = (cambios = {}) => ({
    id: 176793258104,
    status: 'approved',
    external_reference: orderId,
    transaction_amount: X10,
    // La trampa documentada: la cuenta que paga no es el mail del checkout.
    payer: { email: 'cuenta-de-otro@gmail.com' },
    metadata: { buyer_name: 'Ana', buyer_email: MAIL, shipping_cost: 0 },
    additional_info: { items: [] },
    ...cambios
  });
  const guardado = (cambios = {}) => ({
    orderId,
    createdAt: new Date(EN_FECHA).toISOString(),
    payer: { name: 'Ana', email: MAIL },
    shipping: { method: 'Retiro en Rosario', methodValue: 'retiro', cost: 0 },
    items: [{ id: 'pack:cyber:4cm:10:1', title: 'Pack Cyber x10 · 4 cm', quantity: 1, unit_price: X10 }],
    itemsTotal: X10,
    total: X10,
    ...cambios
  });
  const notificacion = () => ({
    httpMethod: 'POST',
    headers: {},
    queryStringParameters: {},
    body: JSON.stringify({ type: 'payment', data: { id: '176793258104' } })
  });
  const registro = () => blobs.stores.get('cyber-regalo').get(MAIL);

  it('con el pago aprobado avisa, y compara con el mail del checkout', async () => {
    await registrarRegalo(MAIL);
    await saveOrder(orderId, guardado());
    vi.stubGlobal('fetch', stubFetch(pago()));
    await webhook(notificacion());
    expect(interno().text).toContain('REGALO EPICYBER: sumar 1 pack de 10 calcos sorpresa');
    expect(cliente().text).toContain('Tu regalo de EPICYBER va con este pedido');
    expect(registro().orderId).toBe(orderId);
  });

  it('un mail anotado solo como cuenta de Mercado Pago no cuenta', async () => {
    await registrarRegalo('cuenta-de-otro@gmail.com');
    await saveOrder(orderId, guardado());
    vi.stubGlobal('fetch', stubFetch(pago()));
    await webhook(notificacion());
    expect(interno().text).not.toContain('REGALO EPICYBER');
  });

  it.each(['pending', 'in_process', 'rejected'])('con el pago %s no consume el regalo', async (status) => {
    await registrarRegalo(MAIL);
    await saveOrder(orderId, guardado());
    vi.stubGlobal('fetch', stubFetch(pago({ status })));
    await webhook(notificacion());
    expect(registro().orderId).toBeUndefined();
  });

  it('un pedido del 8/11 acreditado después conserva el regalo: cuenta el pedido', async () => {
    await registrarRegalo(MAIL);
    await saveOrder(orderId, guardado({ createdAt: new Date(CYBER_END_MS - 1000).toISOString() }));
    enFecha(CYBER_END_MS + 86_400_000);
    vi.stubGlobal('fetch', stubFetch(pago()));
    await webhook(notificacion());
    expect(interno().text).toContain('REGALO EPICYBER');
  });

  it('un reintento con el aviso caído conserva el regalo', async () => {
    await registrarRegalo(MAIL);
    await saveOrder(orderId, guardado());
    vi.stubGlobal('fetch', stubFetch(pago()));
    await reclamarRegalo({
      email: MAIL,
      orderId,
      itemsTotal: X10,
      items: guardado().items
    });
    await webhook(notificacion());
    expect(interno().text).toContain('REGALO EPICYBER');
  });

  it('con Blobs caído los dos mails salen y Mariano revisa', async () => {
    blobs.caido = true;
    vi.stubGlobal('fetch', stubFetch(pago()));
    const res = await webhook(notificacion());
    expect(res.statusCode).toBe(200);
    expect(interno().text).toContain('SIN VERIFICAR');
    expect(cliente().text).not.toContain('Tu regalo');
  });

  it('apagado no lee nada', async () => {
    REGALO_CYBER.activo = false;
    blobs.caido = true;
    vi.stubGlobal('fetch', stubFetch(pago()));
    await webhook(notificacion());
    expect(interno().text).not.toContain('REGALO EPICYBER');
  });
});

describe('cuándo aparece el popup', () => {
  const ahora = Date.parse(EN_FECHA);
  const base = { estado: {}, sesion: {}, storageOk: true, ahora };

  it('corre desde que se publica hasta el cierre de la campaña, y vuelve el 10 %', () => {
    const prendido = { ...POPUP_CYBER, activo: true };
    expect(popupCyberVigente(Date.parse('2026-10-31T12:00:00-03:00'), prendido)).toBe(true);
    expect(popupCyberVigente(CYBER_END_MS, prendido)).toBe(true);
    expect(popupCyberVigente(CYBER_END_MS + 1, prendido)).toBe(false);
    expect(popupCyberVigente(ahora, { ...POPUP_CYBER, activo: false })).toBe(false);
  });

  it('la vista previa lo muestra aunque esté apagado', () => {
    setCyberPreview(true);
    expect(popupCyberVigente(ahora, { ...POPUP_CYBER, activo: false })).toBe(true);
  });

  it('abre en el Home y en /epicyber, no en el armador ni en el camino de compra', () => {
    expect(popupCyberPermitido('/')).toBe(true);
    expect(popupCyberPermitido('/epicyber')).toBe(true);
    expect(popupCyberPermitido('/epicyber/')).toBe(true);
    expect(popupCyberPermitido('/epicyber', '?n=30')).toBe(false);
    expect(popupCyberPermitido('/checkout')).toBe(false);
    expect(popupCyberPermitido('/carrito')).toBe(false);
    expect(popupCyberPermitido('/producto/anime/1')).toBe(false);
  });

  it('el popup del 10 % no le cuenta: ni visto, ni cupón, ni compra anterior', () => {
    const estado = { vistoEn: ahora, cerradoEn: ahora, convertidoEn: ahora, compradoEn: ahora };
    expect(puedeAbrirCyber({ ...base, estado })).toBe(true);
  });

  it('una vez por sesión', () => {
    expect(puedeAbrirCyber({ ...base, sesion: { autoAbierto: true } })).toBe(false);
  });

  it('cerrado no vuelve solo por 2 días', () => {
    const dia = 86_400_000;
    const estado = { cyberCerradoEn: ahora - 1.9 * dia };
    expect(puedeAbrirCyber({ ...base, estado })).toBe(false);
    expect(puedeAbrirCyber({ ...base, estado, ahora: ahora + 0.2 * dia })).toBe(true);
  });

  it('con el mail dejado no vuelve más', () => {
    const estado = { cyberConvertidoEn: ahora - 30 * 86_400_000 };
    expect(puedeAbrirCyber({ ...base, estado })).toBe(false);
  });

  it('sin storage no abre solo: aparecería en cada visita', () => {
    expect(puedeAbrirCyber({ ...base, storageOk: false })).toBe(false);
  });

  it('el id de campaña es el de siempre', () => {
    expect(CYBER.id).toBe('epicyber_2026');
  });
});
