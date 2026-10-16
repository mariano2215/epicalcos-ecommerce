import { describe, it, expect } from 'vitest';
import { lineasNegocio } from './lineasNegocio.js';
import { buildDesignSummary } from './resumenPedido.js';
import { NEGOCIO, ESCALA_VOLUMEN, TRANSFER_DISCOUNT, round } from '../config/pricing.js';
import { RECARGO_HOLOGRAFICO, IMAGEN_HOLOGRAFICO } from '../config/personalizados.js';
import { validateAndPriceOrder } from '../../../netlify/functions/lib/pricing.js';

/**
 * Promo Negocio de /negocio con y sin tornasolado (spec 033, RF-T1…T6). La
 * parte que importa es la paridad: lo que arma el formulario lo tiene que
 * aceptar el servidor al precio que se mostró, o el checkout se rechaza.
 */
const retiro = { methodValue: 'retiro' };
const archivos = [{ nombre: 'logo.png', pesoMB: 0.3, url: 'https://res.cloudinary.com/x/logo.png' }];

/** Lo que el checkout le manda al servidor por cada línea del carrito. */
const aPayload = (l, unit = l.basePrice ?? l.price) => ({ id: l.id, title: l.name, quantity: 1, unit_price: unit });
const recargoEnCarrito = (r) => ({ ...r, id: `fixed:${r.id}` }); // lo que hace addFixed (sin meta)

describe('lineasNegocio — sin tornasolado (RF-T3)', () => {
  it('es la misma línea de siempre, sin recargo', () => {
    const { linea, recargo } = lineasNegocio({ business: '  Bar La Esquina ', archivos, ts: 42 });
    expect(recargo).toBeNull();
    expect(linea).toEqual({
      id: 'negocio:42',
      name: 'Negocio · Bar La Esquina · 100u 6 cm',
      categoryLabel: 'Negocio',
      image: null,
      size: NEGOCIO.size,
      basePrice: NEGOCIO.price,
      quantity: 1,
      meta: { business: 'Bar La Esquina', qty: NEGOCIO.qty, size: NEGOCIO.size, archivos }
    });
  });

  it('sin logo subido, `archivos` va en null (como hasta hoy)', () => {
    expect(lineasNegocio({ business: 'Bar', ts: 1 }).linea.meta.archivos).toBeNull();
  });
});

describe('lineasNegocio — tornasolado (RF-T1, RF-T4)', () => {
  const { linea, recargo } = lineasNegocio({ business: 'Bar', archivos, tornasolado: true, ts: 77 });

  it('la promo va como pack holográfico de 6 cm y el recargo, ligado por el mismo ts', () => {
    expect(linea.id).toBe(`negocio:vinilo-holografico:${NEGOCIO.size}:77`);
    expect(linea.name).toBe('Negocio · Bar · 100u 6 cm · Holográfico');
    expect(linea.basePrice).toBe(NEGOCIO.price);
    expect(recargo).toEqual({
      id: 'material-holografico:77',
      name: 'Recargo · Vinilo Holográfico',
      categoryLabel: 'Negocio',
      image: IMAGEN_HOLOGRAFICO,
      price: RECARGO_HOLOGRAFICO.precio
    });
    expect(IMAGEN_HOLOGRAFICO).toMatch(/^data:image\/svg\+xml/);
  });

  it('lleva materialLabel y NO meta.material (si no, la nota del pedido pierde el negocio)', () => {
    expect(linea.meta.materialLabel).toBe('Vinilo Holográfico');
    expect(linea.meta).not.toHaveProperty('material');
    expect(linea.meta.business).toBe('Bar');
  });

  it('suma lo mismo que 100 holográficas en la escala por volumen (spec 032)', () => {
    expect(linea.basePrice + recargo.price).toBe(ESCALA_VOLUMEN.holografico[100]);
  });
});

describe('paridad con el servidor (RF-T5)', () => {
  const { linea, recargo } = lineasNegocio({ business: 'Bar', archivos, tornasolado: true, ts: 9 });
  const items = [aPayload(linea), aPayload(recargoEnCarrito(recargo))];

  it('Mercado Pago: acepta las dos líneas y cobra promo + recargo', () => {
    const res = validateAndPriceOrder({ items, shipping: retiro, paymentMethod: 'mercadopago' });
    expect(res.ok, `${res.error} ${res.detail || ''}`).toBe(true);
    expect(res.itemsTotal).toBe(NEGOCIO.price + RECARGO_HOLOGRAFICO.precio);
  });

  it('transferencia: acepta las dos líneas con el descuento aplicado', () => {
    const conT = (p) => round(p * (1 - TRANSFER_DISCOUNT));
    const res = validateAndPriceOrder({
      items: [aPayload(linea, conT(linea.basePrice)), aPayload(recargoEnCarrito(recargo), conT(recargo.price))],
      shipping: retiro,
      paymentMethod: 'transferencia'
    });
    expect(res.ok, `${res.error} ${res.detail || ''}`).toBe(true);
    expect(res.itemsTotal).toBe(conT(NEGOCIO.price) + conT(RECARGO_HOLOGRAFICO.precio));
  });

  it('sin el recargo, el servidor lo rechaza', () => {
    const res = validateAndPriceOrder({ items: [items[0]], shipping: retiro, paymentMethod: 'mercadopago' });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('recargo_material_faltante');
  });

  it('sin tornasolado, la línea de siempre pasa sola', () => {
    const { linea: comun } = lineasNegocio({ business: 'Bar', ts: 3 });
    const res = validateAndPriceOrder({ items: [aPayload(comun)], shipping: retiro, paymentMethod: 'mercadopago' });
    expect(res.ok, `${res.error} ${res.detail || ''}`).toBe(true);
    expect(res.itemsTotal).toBe(NEGOCIO.price);
  });
});

describe('nota del pedido (RF-T6)', () => {
  it('dice el negocio, la cantidad, el tamaño, que es holográfico y el logo', () => {
    const { linea, recargo } = lineasNegocio({ business: 'Bar', archivos, tornasolado: true, ts: 5 });
    const nota = buildDesignSummary([
      { ...linea, type: 'negocio' },
      { ...recargoEnCarrito(recargo), type: 'fixed', basePrice: recargo.price, quantity: 1 }
    ]);
    expect(nota).toBe('PEDIDO: Negocio "Bar": 100u 6cm Vinilo Holográfico (logo (1): https://res.cloudinary.com/x/logo.png)');
  });

  it('sin tornasolado, la nota no cambia', () => {
    const { linea } = lineasNegocio({ business: 'Bar', ts: 5 });
    expect(buildDesignSummary([{ ...linea, type: 'negocio' }])).toBe('PEDIDO: Negocio "Bar": 100u 6cm (logo por WhatsApp)');
  });
});
