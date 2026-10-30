import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  trackAddToCart,
  trackBeginCheckout,
  trackPurchase,
  trackSelectPromotion,
  trackViewPromotion
} from './analytics.js';

/** Spec 036: lo que sale hacia GA4 durante la campaña. */
const pack = {
  id: 'pack:cyber:6cm:30:123',
  name: 'Pack Cyber x30 · 6 cm',
  categoryLabel: 'EPICYBER WEEK',
  basePrice: 63000,
  price: 13990,
  quantity: 1
};
const sticker = {
  id: 'sticker:anime-1:6cm',
  name: 'Goku · 6 cm',
  categoryLabel: 'Anime',
  basePrice: 2100,
  price: 2100,
  quantity: 2
};

const eventos = (nombre) => window.dataLayer.filter((e) => e.event === nombre);

beforeEach(() => {
  globalThis.window = { dataLayer: [] };
});
afterEach(() => {
  delete globalThis.window;
});

describe('tracking de EPICYBER', () => {
  it('view_promotion lleva el id de campaña y los packs vistos', () => {
    trackViewPromotion({ ubicacion: 'home_chicos', packs: [{ qty: 10, price: 9990 }] });
    const [e] = eventos('view_promotion');
    expect(e.ecommerce.promotion_id).toBe('epicyber_2026');
    expect(e.ecommerce.creative_slot).toBe('home_chicos');
    expect(e.ecommerce.items[0]).toMatchObject({ item_variant: 'x10', pack_units: 10, price: 9990 });
  });

  it('select_promotion distingue pack chico de mayorista', () => {
    trackSelectPromotion({ ubicacion: 'armador', pack: { qty: 200, price: 74900 } });
    const [e] = eventos('select_promotion');
    expect(e.ecommerce.promotion_id).toBe('epicyber_2026');
    expect(e.ecommerce.items[0].item_category2).toBe('pack_mayorista');
  });

  it('add_to_cart lleva pack, unidades y descuento, en un solo evento', () => {
    trackAddToCart(pack, 1);
    const todos = eventos('add_to_cart');
    expect(todos).toHaveLength(1);
    expect(todos[0].ecommerce.value).toBe(13990);
    expect(todos[0].ecommerce.items[0]).toMatchObject({
      promotion_id: 'epicyber_2026',
      item_variant: 'x30',
      item_category2: 'pack_chico',
      pack_units: 30,
      discount: 63000 - 13990
    });
  });

  it('begin_checkout y purchase llevan los mismos campos', () => {
    trackBeginCheckout([pack, sticker]);
    trackPurchase({ orderId: 'A1', items: [pack, sticker], total: 18190, shipping: 0 });
    for (const nombre of ['begin_checkout', 'purchase']) {
      const [item] = eventos(nombre)[0].ecommerce.items;
      expect(item.promotion_id).toBe('epicyber_2026');
      expect(item.discount).toBe(49010);
    }
  });

  it('una línea sin campaña no cambia su ítem', () => {
    trackAddToCart(sticker, 2);
    const [item] = eventos('add_to_cart')[0].ecommerce.items;
    expect(Object.keys(item).sort()).toEqual(
      ['item_category', 'item_id', 'item_name', 'price', 'quantity'].sort()
    );
  });

  it('con una línea sin basePrice el descuento da 0, no NaN', () => {
    trackAddToCart({ ...pack, basePrice: undefined }, 1);
    expect(eventos('add_to_cart')[0].ecommerce.items[0].discount).toBe(0);
  });
});
