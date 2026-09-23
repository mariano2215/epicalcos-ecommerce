import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  nombreParaAnalytics,
  rangoPeso,
  trackAddToCart,
  trackBeginCheckout,
  trackViewItem,
  trackPersonalizedView,
  trackPersonalizedUploadStart,
  trackPersonalizedUploadComplete,
  trackPersonalizedUploadError,
  trackPersonalizedPreview,
  trackPersonalizedSizeSelected,
  trackPersonalizedQuantitySelected,
  trackPersonalizedConfigurationComplete,
  trackPersonalizedAddToCart
} from './analytics.js';

const ARCHIVO_DEL_CLIENTE = 'foto-de-mi-hijo-juan.jpg';
const lineaCustom = {
  id: 'custom:6cm:silueta:fabc1',
  type: 'custom',
  name: `Personalizado · 6 cm · Silueta · ${ARCHIVO_DEL_CLIENTE}`,
  categoryLabel: 'Personalizados',
  price: 1600,
  quantity: 2,
  meta: {
    instrucciones: 'que el nene salga sin fondo',
    archivos: [{ nombre: ARCHIVO_DEL_CLIENTE, url: `https://res.cloudinary.com/x/${ARCHIVO_DEL_CLIENTE}` }]
  }
};

let fbq;
beforeEach(() => {
  fbq = vi.fn();
  globalThis.window = { dataLayer: [], fbq };
});
afterEach(() => {
  delete globalThis.window;
});

/** Todo lo que salió hacia Google y Meta, serializado. */
const salida = () => JSON.stringify({ dl: window.dataLayer, fbq: fbq.mock.calls });

describe('ningún dato del cliente sale a analytics (spec 023, 1.6)', () => {
  it('el nombre de un personalizado va sin el archivo', () => {
    expect(nombreParaAnalytics(lineaCustom)).toBe('Personalizado · 6 cm · Silueta');
    expect(nombreParaAnalytics({ id: 'custom:9cm:circulo:f1', name: 'x · y.png' })).toBe('Personalizado · 9 cm · Circulo');
  });

  it('el resto de los productos queda EXACTAMENTE igual', () => {
    for (const item of [
      { id: 'sticker:goku-1:6cm', name: 'Goku #1 · 6 cm' },
      { id: 'pack:mayorista:6cm:1', name: 'Pack Mayorista x100' },
      { id: 'fixed:polaroid-x10-7x10', name: 'Fotos Polaroid · x10' },
      { id: 'negocio:1', name: 'Negocio · Mi local · 100u 6 cm' }
    ]) {
      expect(nombreParaAnalytics(item)).toBe(item.name);
    }
  });

  it('add_to_cart, begin_checkout y view_item de un personalizado no llevan nombre, link ni instrucciones', () => {
    trackAddToCart(lineaCustom, 2);
    trackBeginCheckout([lineaCustom]);
    trackViewItem(lineaCustom);
    const s = salida();
    expect(s).not.toContain(ARCHIVO_DEL_CLIENTE);
    expect(s).not.toContain('cloudinary');
    expect(s).not.toContain('sin fondo');
    const atc = window.dataLayer.find((e) => e.event === 'add_to_cart');
    expect(atc.ecommerce.items[0]).toMatchObject({ item_id: lineaCustom.id, item_name: 'Personalizado · 6 cm · Silueta', quantity: 2 });
  });

  it('ningún evento personalized_* lleva datos del archivo', () => {
    trackPersonalizedView();
    trackPersonalizedUploadStart('hero');
    trackPersonalizedUploadComplete({ ext: 'jpg', pesoMB: 3.2, nombre: ARCHIVO_DEL_CLIENTE });
    trackPersonalizedUploadError('red');
    trackPersonalizedPreview('calco');
    trackPersonalizedSizeSelected('6cm');
    trackPersonalizedQuantitySelected(10);
    trackPersonalizedConfigurationComplete({ size: '6cm', quantity: 10, designs: 1, value: 11200 });
    trackPersonalizedAddToCart({ size: '6cm', designs: 1, units: 2, value: 3200, items: [lineaCustom] });
    expect(salida()).not.toContain(ARCHIVO_DEL_CLIENTE);
    expect(salida()).not.toContain('cloudinary');
    const up = window.dataLayer.find((e) => e.event === 'personalized_upload_complete');
    expect(up).toEqual({ event: 'personalized_upload_complete', file_type: 'jpg', file_size_range: '1-5MB' });
  });

  it('el funnel completo llega al dataLayer con sus parámetros', () => {
    trackPersonalizedView();
    trackPersonalizedUploadStart('sticky');
    trackPersonalizedConfigurationComplete({ size: '9cm', quantity: 3, designs: 2, value: 8000 });
    trackPersonalizedAddToCart({ size: '9cm', designs: 2, units: 6, value: 8000, items: [lineaCustom] });
    const eventos = window.dataLayer.map((e) => e.event).filter(Boolean);
    expect(eventos).toEqual([
      'personalized_view',
      'personalized_upload_start',
      'personalized_configuration_complete',
      'personalized_add_to_cart'
    ]);
    expect(window.dataLayer.find((e) => e.event === 'personalized_upload_start').origen).toBe('sticky');
    expect(window.dataLayer.find((e) => e.event === 'personalized_add_to_cart')).toMatchObject({
      size: '9cm',
      designs: 2,
      units: 6,
      ecommerce: { currency: 'ARS', value: 8000 }
    });
  });

  it('Meta recibe los nombres custom de siempre (P-12)', () => {
    trackPersonalizedView();
    trackPersonalizedUploadComplete({ ext: 'png', pesoMB: 0.4 });
    expect(fbq.mock.calls.map((c) => c[1])).toEqual(['PersonalizadoInicio', 'PersonalizadoArchivo']);
  });

  it('un fbq que explota no rompe nada', () => {
    window.fbq = () => {
      throw new Error('fbevents en el navegador de Instagram');
    };
    expect(() => trackPersonalizedView()).not.toThrow();
  });
});

describe('rangoPeso', () => {
  it('agrupa sin dar el número exacto', () => {
    expect(rangoPeso(0.3)).toBe('<1MB');
    expect(rangoPeso(1)).toBe('1-5MB');
    expect(rangoPeso(4.99)).toBe('1-5MB');
    expect(rangoPeso(9.8)).toBe('5-10MB');
    expect(rangoPeso(undefined)).toBe('desconocido');
  });
});
